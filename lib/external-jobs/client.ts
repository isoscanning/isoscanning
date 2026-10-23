// Chamadas do front para as rotas /api/vagas-externas e /api/admin/vagas-externas.

import { tokenManager } from "@/lib/token-manager";
import type {
  ExternalJobAdmin,
  ExternalJobDetail,
  ExternalJobDraft,
  ExternalJobImportRun,
  ExternalJobStatus,
  ExternalJobTeaser,
} from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...tokenManager.authHeader(), ...(init?.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || `Erro ${response.status}`);
  }
  return data as T;
}

/** Vitrine pública: nunca lança — sem vagas externas a página segue com as internas. */
export async function fetchExternalJobs(): Promise<ExternalJobTeaser[]> {
  try {
    const { jobs } = await request<{ jobs: ExternalJobTeaser[] }>("/api/vagas-externas");
    return jobs ?? [];
  } catch (err) {
    console.warn("[vagas-externas] falha ao carregar:", err);
    return [];
  }
}

export type ExternalJobResponse =
  | { locked: true; job: ExternalJobTeaser }
  | { locked: false; job: ExternalJobDetail };

export function fetchExternalJob(id: string): Promise<ExternalJobResponse> {
  return request<ExternalJobResponse>(`/api/vagas-externas/${id}`);
}

/** Registra o clique sem segurar a navegação (keepalive sobrevive à troca de aba). */
export function trackExternalJobClick(id: string): void {
  fetch(`/api/vagas-externas/${id}/click`, {
    method: "POST",
    keepalive: true,
    headers: tokenManager.authHeader(),
  }).catch(() => undefined);
}

// ─── Admin ──────────────────────────────────────────────────────────────────

export interface ExternalJobsAdminData {
  jobs: ExternalJobAdmin[];
  runs: ExternalJobImportRun[];
  totals: Record<ExternalJobStatus, number>;
  categories: string[];
  sources: { jooble: boolean; adzuna: boolean };
}

export function fetchExternalJobsAdmin(status: ExternalJobStatus): Promise<ExternalJobsAdminData> {
  return request<ExternalJobsAdminData>(`/api/admin/vagas-externas?status=${status}`);
}

export function updateExternalJob(
  id: string,
  patch: Partial<Pick<ExternalJobAdmin, "title" | "category" | "jobType" | "city" | "state" | "isRemote">> & {
    status?: "published" | "hidden";
  }
): Promise<{ job: ExternalJobAdmin }> {
  return request(`/api/admin/vagas-externas/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function extractExternalJobDraft(text: string): Promise<{ draft: ExternalJobDraft }> {
  return request("/api/admin/vagas-externas/extract", { method: "POST", body: JSON.stringify({ text }) });
}

export function createManualExternalJob(
  draft: ExternalJobDraft & { sourceLabel: string; expiresInDays: number }
): Promise<{ job: ExternalJobAdmin }> {
  return request("/api/admin/vagas-externas", { method: "POST", body: JSON.stringify(draft) });
}

export interface ImportRunResult {
  fetchedFromApis: boolean;
  fetched: number;
  inserted: number;
  classified: number;
  published: number;
  pending: number;
  discarded: number;
  expired: number;
  notified: number;
  sources: Record<string, string>;
  errors: string[];
}

export function runExternalJobsImportNow(): Promise<ImportRunResult> {
  return request("/api/admin/vagas-externas/run", { method: "POST" });
}

export function sendExternalJobsDigestNow(): Promise<{ notified: number; offers: number; skipped?: string }> {
  return request("/api/admin/vagas-externas/digest", { method: "POST" });
}
