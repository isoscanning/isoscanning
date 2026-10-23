// Rotina das vagas externas (SQL 83) — SOMENTE servidor.
//
// Chamada pelo cron (/api/vagas-externas/cron-import, GitHub Actions a cada
// 3 h) e pelo botão "Rodar agora" do admin. Etapas, todas idempotentes:
//
//   1. Busca nas APIs oficiais — no máximo 1x a cada ~20 h (o admin força).
//   2. Grava as novas como 'new' e atualiza last_seen_at das já conhecidas.
//   3. Classifica as 'new' com IA dentro de um orçamento de tempo; o que não
//      couber fica para a próxima rodada.
//   4. Expira as que sumiram da origem ou ficaram velhas.
//   5. Avisa os profissionais (sino) das vagas novas, no máximo a cada N dias.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExternalJobType } from "@/lib/external-jobs/types";
import { classifyJobs, CLASSIFY_BATCH_SIZE, type ClassifyInput } from "./classify";
import { fingerprintOf, isBlocked, type RawExternalJob } from "./normalize";
import { fetchAdzuna, fetchJooble, JOOBLE_KEYWORDS, SEARCH_KEYWORDS } from "./sources";

const PUBLISH_SCORE = Number(process.env.EXTERNAL_JOBS_PUBLISH_SCORE) || 70;
const REVIEW_SCORE = Number(process.env.EXTERNAL_JOBS_REVIEW_SCORE) || 45;
/** 0 desliga o aviso automático; vazio/ausente = 3. */
const DIGEST_INTERVAL_DAYS = process.env.EXTERNAL_JOBS_DIGEST_DAYS?.trim()
  ? Number(process.env.EXTERNAL_JOBS_DIGEST_DAYS)
  : 3;

const FETCH_INTERVAL_HOURS = 20;
const UNSEEN_EXPIRE_DAYS = 7;
const MAX_AGE_DAYS = 45;
/** Tempo máximo gasto classificando (a rota tem maxDuration 300 s). */
const CLASSIFY_BUDGET_MS = 150_000;
/** Pausa entre lotes: respeita o limite de tokens/minuto do tier grátis da Groq. */
const CLASSIFY_PAUSE_MS = 6_000;

const DAY_MS = 86_400_000;

export interface ImportSummary {
  runId: string | null;
  fetchedFromApis: boolean;
  fetched: number;
  inserted: number;
  classified: number;
  published: number;
  pending: number;
  discarded: number;
  expired: number;
  notified: number;
  sources: Record<string, "ok" | "desligada" | "com erros">;
  errors: string[];
}

interface RawStash {
  location_text: string | null;
  job_type_hint: ExternalJobType | null;
  data: unknown;
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function statusForScore(score: number): "published" | "pending" | "hidden" {
  if (score >= PUBLISH_SCORE) return "published";
  if (score >= REVIEW_SCORE) return "pending";
  return "hidden";
}

export async function loadCategories(admin: SupabaseClient): Promise<string[]> {
  const { data } = await admin.from("specialties").select("name").order("name");
  return ((data ?? []) as Array<{ name: string }>).map((s) => s.name);
}

// ─── 1–2. Busca e gravação ──────────────────────────────────────────────────

async function shouldFetch(admin: SupabaseClient): Promise<boolean> {
  const since = new Date(Date.now() - FETCH_INTERVAL_HOURS * 3_600_000).toISOString();
  const { count } = await admin
    .from("external_job_import_runs")
    .select("id", { count: "exact", head: true })
    .gt("fetched", 0)
    .gte("started_at", since);
  return (count ?? 0) === 0;
}

async function storeFetched(admin: SupabaseClient, jobs: RawExternalJob[], summary: ImportSummary): Promise<void> {
  // Únicos por (fonte, id) e sem os claramente fora do nicho
  const unique = new Map<string, RawExternalJob>();
  for (const job of jobs) {
    if (isBlocked(job.title)) {
      summary.discarded += 1;
      continue;
    }
    unique.set(`${job.source}:${job.externalId}`, job);
  }
  const list = [...unique.values()];
  const now = new Date().toISOString();

  for (const source of ["jooble", "adzuna"] as const) {
    const ofSource = list.filter((j) => j.source === source);
    for (const part of chunk(ofSource, 150)) {
      const { data: existing, error } = await admin
        .from("external_job_offers")
        .select("id, external_id")
        .eq("source", source)
        .in("external_id", part.map((j) => j.externalId));
      if (error) {
        summary.errors.push(`consulta ${source}: ${error.message}`);
        continue;
      }
      const known = new Map(((existing ?? []) as Array<{ id: string; external_id: string }>).map((r) => [r.external_id, r.id]));

      // Já conhecidas: só marca que continuam no ar
      const seenIds = part.filter((j) => known.has(j.externalId)).map((j) => known.get(j.externalId) as string);
      if (seenIds.length > 0) {
        const { error: seenError } = await admin
          .from("external_job_offers")
          .update({ last_seen_at: now })
          .in("id", seenIds)
          .in("status", ["new", "pending", "published", "hidden"]);
        if (seenError) summary.errors.push(`last_seen ${source}: ${seenError.message}`);
      }

      const fresh = part.filter((j) => !known.has(j.externalId));
      if (fresh.length === 0) continue;

      // Mesma vaga já cadastrada por outra fonte → não duplica na vitrine
      const prints = fresh.map((j) => fingerprintOf(j.title, j.companyName, j.locationText));
      const { data: dupes } = await admin
        .from("external_job_offers")
        .select("fingerprint")
        .in("fingerprint", [...new Set(prints)]);
      const taken = new Set(((dupes ?? []) as Array<{ fingerprint: string }>).map((d) => d.fingerprint));

      const rows = [];
      for (let i = 0; i < fresh.length; i += 1) {
        const job = fresh[i];
        if (taken.has(prints[i])) {
          summary.discarded += 1;
          continue;
        }
        taken.add(prints[i]);
        const stash: RawStash = { location_text: job.locationText, job_type_hint: job.jobTypeHint, data: job.raw };
        rows.push({
          source: job.source,
          external_id: job.externalId,
          source_label: job.sourceLabel,
          external_url: job.externalUrl,
          title: job.title,
          company_name: job.companyName,
          description: job.description,
          job_type: job.jobTypeHint,
          salary_text: job.salaryText,
          salary_min: job.salaryMin,
          salary_max: job.salaryMax,
          posted_at: job.postedAt,
          fingerprint: prints[i],
          status: "new",
          raw: stash,
        });
      }
      if (rows.length === 0) continue;

      const { error: insertError } = await admin
        .from("external_job_offers")
        .upsert(rows, { onConflict: "source,external_id", ignoreDuplicates: true });
      if (insertError) summary.errors.push(`gravar ${source}: ${insertError.message}`);
      else summary.inserted += rows.length;
    }
  }
}

// ─── 3. Classificação ───────────────────────────────────────────────────────

interface NewRow {
  id: string;
  title: string;
  company_name: string | null;
  description: string | null;
  job_type: ExternalJobType | null;
  raw: RawStash | null;
}

async function classifyPending(admin: SupabaseClient, summary: ImportSummary): Promise<void> {
  const started = Date.now();
  const categories = await loadCategories(admin);

  while (Date.now() - started < CLASSIFY_BUDGET_MS) {
    const { data, error } = await admin
      .from("external_job_offers")
      .select("id, title, company_name, description, job_type, raw")
      .eq("status", "new")
      .order("first_seen_at", { ascending: true })
      .limit(CLASSIFY_BATCH_SIZE);
    if (error) {
      summary.errors.push(`fila de classificação: ${error.message}`);
      return;
    }
    const rows = (data ?? []) as NewRow[];
    if (rows.length === 0) return;

    const inputs: ClassifyInput[] = rows.map((r) => ({
      title: r.title,
      companyName: r.company_name,
      locationText: r.raw?.location_text ?? null,
      jobTypeHint: r.job_type ?? r.raw?.job_type_hint ?? null,
      description: r.description,
    }));

    let results;
    try {
      results = await classifyJobs(inputs, categories);
    } catch (err) {
      // Cota da IA esgotada ou fora do ar: o resto fica 'new' para a próxima rodada
      summary.errors.push(`IA: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    const now = new Date().toISOString();
    for (let i = 0; i < rows.length; i += 1) {
      const c = results[i];
      const status = statusForScore(c.score);
      const { error: updateError } = await admin
        .from("external_job_offers")
        .update({
          status,
          relevance_score: c.score,
          ai_reason: c.reason,
          category: c.category,
          job_type: c.jobType,
          city: c.city,
          state: c.state,
          is_remote: c.isRemote,
          published_at: status === "published" ? now : null,
          updated_at: now,
        })
        .eq("id", rows[i].id)
        .eq("status", "new");
      if (updateError) {
        summary.errors.push(`classificar ${rows[i].id}: ${updateError.message}`);
        continue;
      }
      summary.classified += 1;
      if (status === "published") summary.published += 1;
      else if (status === "pending") summary.pending += 1;
      else summary.discarded += 1;
    }

    if (rows.length < CLASSIFY_BATCH_SIZE) return;
    await sleep(CLASSIFY_PAUSE_MS);
  }
}

// ─── 4. Expiração ───────────────────────────────────────────────────────────

async function expireStale(admin: SupabaseClient, summary: ImportSummary): Promise<void> {
  const now = new Date();
  const live = ["new", "pending", "published"];
  const unseenBefore = new Date(now.getTime() - UNSEEN_EXPIRE_DAYS * DAY_MS).toISOString();
  const postedBefore = new Date(now.getTime() - MAX_AGE_DAYS * DAY_MS).toISOString();
  const patch = { status: "expired", updated_at: now.toISOString() };

  const steps = [
    // Sumiu da API de origem há uma semana (manuais não passam pela API)
    admin.from("external_job_offers").update(patch, { count: "exact" })
      .in("status", live).neq("source", "manual").lt("last_seen_at", unseenBefore),
    // Prazo definido pelo admin
    admin.from("external_job_offers").update(patch, { count: "exact" })
      .in("status", live).lt("expires_at", now.toISOString()),
    // Publicada há muito tempo na origem
    admin.from("external_job_offers").update(patch, { count: "exact" })
      .in("status", live).lt("posted_at", postedBefore),
  ];
  for (const step of steps) {
    const { count, error } = await step;
    if (error) summary.errors.push(`expirar: ${error.message}`);
    else summary.expired += count ?? 0;
  }
}

// ─── 5. Aviso aos profissionais ─────────────────────────────────────────────

export interface DigestResult {
  notified: number;
  offers: number;
  skipped?: string;
}

/**
 * Uma notificação no sino para cada profissional quando há vagas externas
 * novas (publicadas e ainda não avisadas). Destaca as do estado da pessoa.
 * `force` (botão do admin) ignora o intervalo mínimo entre avisos.
 */
export async function sendExternalJobsDigest(admin: SupabaseClient, force = false): Promise<DigestResult> {
  if (!force) {
    if (!(DIGEST_INTERVAL_DAYS > 0)) return { notified: 0, offers: 0, skipped: "aviso automático desligado" };
    const since = new Date(Date.now() - DIGEST_INTERVAL_DAYS * DAY_MS).toISOString();
    const { count } = await admin
      .from("external_job_import_runs")
      .select("id", { count: "exact", head: true })
      .gt("notified", 0)
      .gte("started_at", since);
    if ((count ?? 0) > 0) return { notified: 0, offers: 0, skipped: "aviso recente" };
  }

  const { data: offers, error } = await admin
    .from("external_job_offers")
    .select("id, state, is_remote")
    .eq("status", "published")
    .is("notified_at", null);
  if (error) throw new Error(`vagas para aviso: ${error.message}`);
  const fresh = (offers ?? []) as Array<{ id: string; state: string | null; is_remote: boolean }>;
  if (fresh.length === 0) return { notified: 0, offers: 0, skipped: "sem vagas novas" };

  const byState = new Map<string, number>();
  let remote = 0;
  for (const o of fresh) {
    if (o.is_remote) remote += 1;
    if (o.state) byState.set(o.state, (byState.get(o.state) ?? 0) + 1);
  }

  const total = fresh.length;
  const plural = total === 1 ? "vaga nova" : "vagas novas";
  let notified = 0;

  for (let from = 0; ; from += 1000) {
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, state")
      .eq("user_type", "professional")
      .range(from, from + 999);
    if (profilesError) throw new Error(`profissionais: ${profilesError.message}`);
    const list = (profiles ?? []) as Array<{ id: string; state: string | null }>;
    if (list.length === 0) break;

    const rows = list.map((p) => {
      const local = p.state ? (byState.get(p.state) ?? 0) + remote : 0;
      const highlight = local > 0 ? ` — ${local} ${local === 1 ? "é" : "são"} em ${p.state} ou remota${local === 1 ? "" : "s"}` : "";
      return {
        profile_id: p.id,
        type: "external_jobs_digest",
        title: `${total} ${plural} no audiovisual`,
        message: `Reunimos ${total} ${plural} de foto e vídeo do mercado${highlight}. Confira e candidate-se.`,
        reference_id: null,
        is_read: false,
      };
    });
    for (const part of chunk(rows, 500)) {
      const { error: insertError } = await admin.from("notifications").insert(part);
      if (insertError) throw new Error(`notificações: ${insertError.message}`);
      notified += part.length;
    }
    if (list.length < 1000) break;
  }

  const { error: markError } = await admin
    .from("external_job_offers")
    .update({ notified_at: new Date().toISOString() })
    .in("id", fresh.map((o) => o.id));
  if (markError) throw new Error(`marcar avisadas: ${markError.message}`);

  return { notified, offers: total };
}

// ─── Orquestração ───────────────────────────────────────────────────────────

export async function runExternalJobsImport(
  admin: SupabaseClient,
  options: { trigger: "cron" | "admin"; forceFetch?: boolean }
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    runId: null,
    fetchedFromApis: false,
    fetched: 0,
    inserted: 0,
    classified: 0,
    published: 0,
    pending: 0,
    discarded: 0,
    expired: 0,
    notified: 0,
    sources: {},
    errors: [],
  };

  const { data: run, error: runError } = await admin
    .from("external_job_import_runs")
    .insert({ trigger: options.trigger })
    .select("id")
    .single();
  if (runError) throw new Error(`Não foi possível registrar a execução (SQL 83 aplicada?): ${runError.message}`);
  summary.runId = (run as { id: string }).id;

  try {
    if (options.forceFetch || (await shouldFetch(admin))) {
      summary.fetchedFromApis = true;
      const results = await Promise.all([
        fetchJooble(JOOBLE_KEYWORDS).then((r) => ({ name: "Jooble", ...r })),
        fetchAdzuna(SEARCH_KEYWORDS).then((r) => ({ name: "Adzuna", ...r })),
      ]);
      const jobs: RawExternalJob[] = [];
      for (const r of results) {
        summary.sources[r.name] = !r.enabled ? "desligada" : r.errors.length > 0 ? "com erros" : "ok";
        summary.errors.push(...r.errors);
        jobs.push(...r.jobs);
      }
      summary.fetched = jobs.length;
      await storeFetched(admin, jobs, summary);
    }

    await classifyPending(admin, summary);
    await expireStale(admin, summary);

    try {
      const digest = await sendExternalJobsDigest(admin);
      summary.notified = digest.notified;
    } catch (err) {
      summary.errors.push(`aviso: ${err instanceof Error ? err.message : String(err)}`);
    }
  } catch (err) {
    summary.errors.push(err instanceof Error ? err.message : String(err));
  } finally {
    await admin
      .from("external_job_import_runs")
      .update({
        finished_at: new Date().toISOString(),
        fetched: summary.fetched,
        inserted: summary.inserted,
        classified: summary.classified,
        published: summary.published,
        pending: summary.pending,
        discarded: summary.discarded,
        expired: summary.expired,
        notified: summary.notified,
        errors: summary.errors.slice(0, 50),
      })
      .eq("id", summary.runId);
  }

  return summary;
}
