import { isPlanErrorBody, PlanErrorBody } from "./plan-limits";

export const PLAN_LIMIT_EVENT = "isoscanning:plan-limit";

/**
 * Dispara o modal de upgrade (PlanUpgradeProvider) a partir de qualquer lugar:
 * interceptor do apiClient, rotas fetch das páginas, checagens locais.
 *
 *   notifyPlanLimit(error.response?.data)   // axios
 *   notifyPlanLimit(await res.json())       // fetch
 *
 * Retorna true se o payload era um erro de plano (e o modal foi aberto).
 * Sem React aqui de propósito — este módulo é importado pelo api-service.
 */
export function notifyPlanLimit(payload: unknown): boolean {
  const body = unwrapPlanError(payload);
  if (!body) return false;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<PlanErrorBody>(PLAN_LIMIT_EVENT, { detail: body }));
  }
  return true;
}

/** Extrai o corpo de plano de `{ message: {...} }` (Nest embrulha às vezes) ou do próprio objeto. */
export function unwrapPlanError(payload: unknown): PlanErrorBody | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (isPlanErrorBody(p)) return p;
  if (p.message && typeof p.message === "object" && isPlanErrorBody(p.message)) return p.message;
  if (p.error && typeof p.error === "object" && isPlanErrorBody(p.error)) return p.error;
  return null;
}

/** Atalho para páginas com fetch: `if (handlePlanError(res, body)) return;` */
export function isPlanError(status: number, body: unknown): boolean {
  return status === 403 && unwrapPlanError(body) !== null;
}
