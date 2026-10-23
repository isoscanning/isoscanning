import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabaseAdmin, ADMIN_MISSING_MSG } from "@/lib/server/supabase-admin";
import { requirePlatformAdmin } from "@/lib/server/admin-auth";
import { ADMIN_COLUMNS, toAdmin, toRun } from "@/lib/server/external-jobs/mappers";
import { loadCategories } from "@/lib/server/external-jobs/import";
import { fingerprintOf, normalizeJobType, normalizeUf, safeUrl, truncate } from "@/lib/server/external-jobs/normalize";
import type { ExternalJobStatus } from "@/lib/external-jobs/types";

// Painel admin das vagas externas: lista por status + execuções + totais
// (GET) e cadastro manual de vaga vista fora (POST, ex.: grupo de WhatsApp).

export const dynamic = "force-dynamic";

const STATUSES: ExternalJobStatus[] = ["new", "pending", "published", "hidden", "expired"];

export async function GET(request: NextRequest) {
  const { denied } = await requirePlatformAdmin(request);
  if (denied) return denied;
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: ADMIN_MISSING_MSG }, { status: 500 });

  const status = request.nextUrl.searchParams.get("status") as ExternalJobStatus | null;
  const wanted = status && STATUSES.includes(status) ? status : "pending";

  const [jobsResult, runsResult, categories, ...counts] = await Promise.all([
    admin
      .from("external_job_offers")
      .select(ADMIN_COLUMNS)
      .eq("status", wanted)
      .order(wanted === "published" ? "published_at" : "created_at", { ascending: false })
      .limit(200),
    admin.from("external_job_import_runs").select("*").order("started_at", { ascending: false }).limit(10),
    loadCategories(admin),
    ...STATUSES.map((s) =>
      admin.from("external_job_offers").select("id", { count: "exact", head: true }).eq("status", s)
    ),
  ]);

  if (jobsResult.error) {
    return NextResponse.json(
      { error: `Erro ao listar vagas externas (SQL 83 aplicada?): ${jobsResult.error.message}` },
      { status: 500 }
    );
  }

  const totals = Object.fromEntries(STATUSES.map((s, i) => [s, counts[i].count ?? 0]));
  return NextResponse.json({
    jobs: (jobsResult.data ?? []).map((r) => toAdmin(r as unknown as Record<string, unknown>)),
    runs: (runsResult.data ?? []).map((r) => toRun(r as Record<string, unknown>)),
    totals,
    categories,
    sources: {
      jooble: !!process.env.JOOBLE_API_KEY,
      adzuna: !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
    },
  });
}

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() ? truncate(value.trim(), max) : null;
}

export async function POST(request: NextRequest) {
  const { auth, denied } = await requirePlatformAdmin(request);
  if (denied) return denied;
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: ADMIN_MISSING_MSG }, { status: 500 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });

  const title = text(body.title, 140);
  const externalUrl = safeUrl(body.externalUrl);
  const applyContact = text(body.applyContact, 200);
  if (!title) return NextResponse.json({ error: "Informe o título da vaga." }, { status: 400 });
  if (body.externalUrl && !externalUrl) {
    return NextResponse.json({ error: "O link precisa começar com http:// ou https://" }, { status: 400 });
  }
  if (!externalUrl && !applyContact) {
    return NextResponse.json({ error: "Informe o link ou o contato para candidatura." }, { status: 400 });
  }

  const categories = await loadCategories(admin);
  const category = typeof body.category === "string" && categories.includes(body.category) ? body.category : null;
  const city = text(body.city, 80);
  const companyName = text(body.companyName, 120);
  const days = Math.min(Math.max(Number(body.expiresInDays) || 21, 1), 90);
  const now = new Date();

  const { data, error } = await admin
    .from("external_job_offers")
    .insert({
      source: "manual",
      external_id: `manual-${randomUUID()}`,
      source_label: text(body.sourceLabel, 60) ?? "Indicação",
      external_url: externalUrl,
      apply_contact: applyContact,
      title,
      company_name: companyName,
      description: text(body.description, 4000),
      city,
      state: normalizeUf(body.state),
      is_remote: body.isRemote === true,
      job_type: normalizeJobType(body.jobType),
      category,
      salary_text: text(body.salaryText, 120),
      posted_at: now.toISOString(),
      expires_at: new Date(now.getTime() + days * 86_400_000).toISOString(),
      status: "published",
      published_at: now.toISOString(),
      fingerprint: fingerprintOf(title, companyName, city),
      created_by: auth.user.id,
    })
    .select(ADMIN_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: toAdmin(data as unknown as Record<string, unknown>) }, { status: 201 });
}
