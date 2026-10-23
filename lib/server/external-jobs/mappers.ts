// Linha do banco (snake_case) → DTOs de lib/external-jobs/types. O teaser
// existe para o link e a descrição NUNCA saírem para visitante anônimo.

import type {
  ExternalJobAdmin,
  ExternalJobDetail,
  ExternalJobImportRun,
  ExternalJobTeaser,
} from "@/lib/external-jobs/types";
import { formatSalary } from "./normalize";

export const TEASER_COLUMNS =
  "id, title, source_label, city, state, is_remote, job_type, category, posted_at, published_at";
export const DETAIL_COLUMNS = `${TEASER_COLUMNS}, source, company_name, description, salary_text, salary_min, salary_max, external_url, apply_contact`;
export const ADMIN_COLUMNS = `${DETAIL_COLUMNS}, status, relevance_score, ai_reason, click_count, last_seen_at, expires_at, created_at`;

type Row = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

function salaryLabel(row: Row): string | null {
  const text = str(row.salary_text);
  if (text) return text;
  const min = row.salary_min != null ? Number(row.salary_min) : null;
  const max = row.salary_max != null ? Number(row.salary_max) : null;
  return formatSalary(min, max);
}

export function toTeaser(row: Row): ExternalJobTeaser {
  return {
    id: row.id as string,
    title: row.title as string,
    sourceLabel: (row.source_label as string) || "Outra plataforma",
    city: str(row.city),
    state: str(row.state),
    isRemote: row.is_remote === true,
    jobType: (str(row.job_type) as ExternalJobTeaser["jobType"]) ?? null,
    category: str(row.category),
    postedAt: str(row.posted_at),
    publishedAt: str(row.published_at),
  };
}

export function toDetail(row: Row): ExternalJobDetail {
  return {
    ...toTeaser(row),
    source: row.source as ExternalJobDetail["source"],
    companyName: str(row.company_name),
    description: str(row.description),
    salaryText: salaryLabel(row),
    externalUrl: str(row.external_url),
    applyContact: str(row.apply_contact),
  };
}

export function toAdmin(row: Row): ExternalJobAdmin {
  return {
    ...toDetail(row),
    status: row.status as ExternalJobAdmin["status"],
    relevanceScore: row.relevance_score == null ? null : Number(row.relevance_score),
    aiReason: str(row.ai_reason),
    clickCount: Number(row.click_count ?? 0),
    lastSeenAt: row.last_seen_at as string,
    expiresAt: str(row.expires_at),
    createdAt: row.created_at as string,
  };
}

export function toRun(row: Row): ExternalJobImportRun {
  return {
    id: row.id as string,
    trigger: row.trigger as ExternalJobImportRun["trigger"],
    startedAt: row.started_at as string,
    finishedAt: str(row.finished_at),
    fetched: Number(row.fetched ?? 0),
    inserted: Number(row.inserted ?? 0),
    classified: Number(row.classified ?? 0),
    published: Number(row.published ?? 0),
    pending: Number(row.pending ?? 0),
    discarded: Number(row.discarded ?? 0),
    expired: Number(row.expired ?? 0),
    notified: Number(row.notified ?? 0),
    errors: Array.isArray(row.errors) ? (row.errors as string[]) : [],
  };
}
