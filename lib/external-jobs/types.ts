// Vagas externas (SQL 83) — tipos compartilhados entre o front e as rotas
// /app/api/vagas-externas. Vaga externa NÃO é job_offer: só divulga e
// redireciona para o site de origem (sem candidatura/acordo/contrato).

export type ExternalJobSource = "jooble" | "adzuna" | "manual";
export type ExternalJobStatus = "new" | "pending" | "published" | "hidden" | "expired";
export type ExternalJobType = "freelance" | "full_time" | "part_time" | "project";

/** O que qualquer visitante vê (vitrine). Sem descrição, empresa nem link. */
export interface ExternalJobTeaser {
  id: string;
  title: string;
  sourceLabel: string;
  city: string | null;
  state: string | null;
  isRemote: boolean;
  jobType: ExternalJobType | null;
  category: string | null;
  postedAt: string | null;
  publishedAt: string | null;
}

/** Vaga completa — só para usuário logado. */
export interface ExternalJobDetail extends ExternalJobTeaser {
  source: ExternalJobSource;
  companyName: string | null;
  description: string | null;
  salaryText: string | null;
  externalUrl: string | null;
  applyContact: string | null;
}

/** Visão do admin (inclui classificação e métricas). */
export interface ExternalJobAdmin extends ExternalJobDetail {
  status: ExternalJobStatus;
  relevanceScore: number | null;
  aiReason: string | null;
  clickCount: number;
  lastSeenAt: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface ExternalJobImportRun {
  id: string;
  trigger: "cron" | "admin";
  startedAt: string;
  finishedAt: string | null;
  fetched: number;
  inserted: number;
  classified: number;
  published: number;
  pending: number;
  discarded: number;
  expired: number;
  notified: number;
  errors: string[];
}

/** Rascunho extraído pela IA de um texto colado (WhatsApp, Instagram...). */
export interface ExternalJobDraft {
  title: string;
  companyName: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  isRemote: boolean;
  jobType: ExternalJobType | null;
  category: string | null;
  salaryText: string | null;
  externalUrl: string | null;
  applyContact: string | null;
}

export const EXTERNAL_SOURCE_LABEL: Record<ExternalJobSource, string> = {
  jooble: "Jooble",
  adzuna: "Adzuna",
  manual: "Indicação",
};

/** "Campinas - SP" | "Remoto" | "Campinas - SP · ou remoto" | fallback. */
export function externalJobLocation(
  job: Pick<ExternalJobTeaser, "city" | "state" | "isRemote">,
  fallback = "Local não informado"
): string {
  const place = [job.city, job.state].filter(Boolean).join(" - ");
  if (job.isRemote) return place ? `${place} · ou remoto` : "Remoto";
  return place || fallback;
}

/** Rota da página de detalhe (fora de /vagas/[id], que é das vagas internas). */
export function externalJobPath(id: string): string {
  return `/vagas/mercado/${id}`;
}
