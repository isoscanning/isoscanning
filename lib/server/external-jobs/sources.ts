// Conectores das APIs OFICIAIS de vagas (SQL 83) — SOMENTE servidor.
//
// Só entram fontes com API pública e termos que permitem o uso: nada de
// raspagem de site. Cada fonte fica desligada enquanto a env não existir.
//
//   Jooble  — chave grátis em https://br.jooble.org/api/about
//             JOOBLE_API_KEY (+ opcional JOOBLE_API_HOST, padrão br.jooble.org)
//   Adzuna  — app grátis em https://developer.adzuna.com
//             ADZUNA_APP_ID + ADZUNA_APP_KEY (país "br")
//
// Ambas pedem crédito à fonte — o selo "via Jooble/Adzuna" no card cumpre isso.

import type { ExternalJobType } from "@/lib/external-jobs/types";
import { stripHtml, truncate, type RawExternalJob } from "./normalize";

/** Buscas da rotina diária: cobrem foto, vídeo, eventos, drone e edição. */
export const SEARCH_KEYWORDS = [
  "fotógrafo",
  "fotografia de eventos",
  "cobertura fotográfica",
  "fotógrafo de casamento",
  "videomaker",
  "filmmaker",
  "cinegrafista",
  "captação de vídeo",
  "editor de vídeo",
  "operador de câmera",
  "piloto de drone",
  "produtor audiovisual",
  "assistente de fotografia",
  "social media audiovisual",
];

/**
 * A chave da Jooble tem limite de 500 requisições (padrão; dá para pedir
 * aumento respondendo o e-mail deles). 1 busca = 1 requisição, então usamos
 * termos mais amplos — a IA filtra o que vier fora do nicho.
 */
export const JOOBLE_KEYWORDS = [
  "fotógrafo",
  "fotografia",
  "videomaker",
  "filmmaker",
  "cinegrafista",
  "editor de vídeo",
  "piloto de drone",
  "audiovisual",
];

const DESCRIPTION_MAX = 1500;
const REQUEST_TIMEOUT_MS = 20_000;

export interface SourceResult {
  jobs: RawExternalJob[];
  errors: string[];
  /** false = env da fonte ausente (fonte desligada, não é erro) */
  enabled: boolean;
}

function jobTypeFromText(text: string | null | undefined): ExternalJobType | null {
  const t = (text ?? "").toLowerCase();
  if (/freela|freelance|aut[oô]nomo|pj\b|por job|di[aá]ria/.test(t)) return "freelance";
  if (/meio per[ií]odo|part[- ]time|est[aá]gio/.test(t)) return "part_time";
  if (/projeto|tempor[aá]rio|contract/.test(t)) return "project";
  if (/integral|full[- ]time|clt|efetivo|permanent/.test(t)) return "full_time";
  return null;
}

function isoOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), cache: "no-store" });
  const body = await response.text().catch(() => "");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}${body ? ` — ${body.slice(0, 160)}` : ""}`);
  }
  // Ids numéricos de 19 dígitos (Jooble) perdem precisão no JSON.parse —
  // viram string antes, para o id continuar único e estável entre buscas.
  return JSON.parse(body.replace(/"id"\s*:\s*(-?\d{16,})/g, '"id":"$1"'));
}

// ─── Jooble ─────────────────────────────────────────────────────────────────

interface JoobleJob {
  id?: string | number;
  title?: string;
  location?: string;
  snippet?: string;
  salary?: string;
  source?: string;
  type?: string;
  link?: string;
  company?: string;
  updated?: string;
}

export async function fetchJooble(keywords: string[]): Promise<SourceResult> {
  const key = process.env.JOOBLE_API_KEY;
  if (!key) return { jobs: [], errors: [], enabled: false };
  const host = process.env.JOOBLE_API_HOST || "br.jooble.org";

  const jobs: RawExternalJob[] = [];
  const errors: string[] = [];
  for (const keyword of keywords) {
    try {
      const data = (await fetchJson(`https://${host}/api/${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: keyword, location: process.env.JOOBLE_LOCATION ?? "", page: 1 }),
      })) as { jobs?: JoobleJob[] };

      for (const job of data.jobs ?? []) {
        if (!job.title || !job.link || job.id === undefined) continue;
        jobs.push({
          source: "jooble",
          sourceLabel: "Jooble",
          externalId: String(job.id),
          externalUrl: job.link,
          title: stripHtml(job.title),
          companyName: job.company ? stripHtml(job.company) : null,
          description: truncate(stripHtml(job.snippet), DESCRIPTION_MAX),
          locationText: job.location || null,
          jobTypeHint: jobTypeFromText(job.type),
          salaryText: job.salary?.trim() || null,
          salaryMin: null,
          salaryMax: null,
          postedAt: isoOrNull(job.updated),
          raw: job,
        });
      }
    } catch (err) {
      errors.push(`jooble "${keyword}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { jobs, errors, enabled: true };
}

// ─── Adzuna ─────────────────────────────────────────────────────────────────

interface AdzunaJob {
  id?: string | number;
  title?: string;
  description?: string;
  redirect_url?: string;
  created?: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
  contract_type?: string;
}

export async function fetchAdzuna(keywords: string[]): Promise<SourceResult> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return { jobs: [], errors: [], enabled: false };

  const jobs: RawExternalJob[] = [];
  const errors: string[] = [];
  for (const keyword of keywords) {
    try {
      const params = new URLSearchParams({
        app_id: appId,
        app_key: appKey,
        what: keyword,
        results_per_page: "50",
        max_days_old: "21",
        sort_by: "date",
      });
      const data = (await fetchJson(`https://api.adzuna.com/v1/api/jobs/br/search/1?${params}`)) as {
        results?: AdzunaJob[];
      };

      for (const job of data.results ?? []) {
        if (!job.title || !job.redirect_url || job.id === undefined) continue;
        const area = job.location?.area ?? [];
        const salaryMin = typeof job.salary_min === "number" ? job.salary_min : null;
        const salaryMax = typeof job.salary_max === "number" ? job.salary_max : null;
        jobs.push({
          source: "adzuna",
          sourceLabel: "Adzuna",
          externalId: String(job.id),
          externalUrl: job.redirect_url,
          title: stripHtml(job.title),
          companyName: job.company?.display_name ? stripHtml(job.company.display_name) : null,
          description: truncate(stripHtml(job.description), DESCRIPTION_MAX),
          // area = ["Brasil", "<estado>", "<cidade>"...] — mais específico primeiro
          locationText: [...area].reverse().slice(0, 2).join(", ") || job.location?.display_name || null,
          jobTypeHint:
            job.contract_type === "contract"
              ? "project"
              : job.contract_time === "part_time"
                ? "part_time"
                : job.contract_time === "full_time"
                  ? "full_time"
                  : jobTypeFromText(job.title),
          salaryText: null,
          salaryMin,
          salaryMax: salaryMax && salaryMin && salaryMax < salaryMin ? salaryMin : salaryMax,
          postedAt: isoOrNull(job.created),
          raw: job,
        });
      }
    } catch (err) {
      errors.push(`adzuna "${keyword}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { jobs, errors, enabled: true };
}
