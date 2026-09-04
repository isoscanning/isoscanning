// Autenticação e gating por plano para as rotas /app/api (server-side).
//
// As rotas de IA proxiam a chave GROQ — sem esta validação qualquer pessoa
// na internet poderia consumir a cota de IA do projeto. Todas as rotas de
// IA devem chamar requireUser() antes de tocar na Groq e consumeAiCredits()
// para debitar o uso do plano.
//
// Formato do 403 de plano é o MESMO do backend NestJS (PlanLimitException):
//   { statusCode: 403, code: "PLAN_LIMIT"|"PLAN_FEATURE", feature, tier, requiredTier, current?, limit?, message }
// O front reconhece `code` e abre o modal de upgrade (notifyPlanLimit).

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import {
  buildPlanFeatureBody,
  buildPlanLimitBody,
  CountableLimit,
  FeatureFlag,
  getPlanLimits,
  PlanErrorBody,
  PlanLimits,
  resolveEffectiveTier,
  startOfCurrentMonth,
  SubscriptionTier,
  withinLimit,
} from "@/lib/plans/plan-limits";

export interface AuthenticatedRequest {
  user: User;
  token: string;
  /** Client Supabase agindo como o usuário (RLS aplicado). */
  supabase: SupabaseClient;
}

export async function requireUser(
  request: NextRequest
): Promise<AuthenticatedRequest | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;

  const authorization = request.headers.get("authorization");
  const token = authorization?.replace(/Bearer\s+/i, "").trim();
  if (!token) return null;

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  return { user: data.user, token, supabase };
}

// ─── Plano ──────────────────────────────────────────────────────────────────

export interface PlanContext {
  tier: SubscriptionTier;
  limits: PlanLimits;
}

/**
 * Tier EFETIVO de um perfil (o próprio usuário ou o dono de um cronograma —
 * membros da equipe herdam o plano do dono). Rebaixa para free se
 * `subscription_expires_at` já passou. Ausente/erro = free (fail-closed).
 */
export async function getPlanContext(
  auth: AuthenticatedRequest,
  profileId: string = auth.user.id
): Promise<PlanContext> {
  const { data } = await auth.supabase
    .from("profiles")
    .select("subscription_tier, subscription_expires_at")
    .eq("id", profileId)
    .maybeSingle();

  const tier = resolveEffectiveTier(
    (data as { subscription_tier?: string | null } | null)?.subscription_tier,
    (data as { subscription_expires_at?: string | null } | null)?.subscription_expires_at
  );
  return { tier, limits: getPlanLimits(tier) };
}

/** Resposta 403 padronizada de plano. */
export function planErrorResponse(body: PlanErrorBody): NextResponse {
  return NextResponse.json(body, { status: 403 });
}

/**
 * Registra que o usuário bateu numa parede de plano (tabela plan_limit_events,
 * migration 62). Alimenta o card "quais limites convertem" do admin. Nunca lança.
 */
export async function recordLimitHit(
  auth: AuthenticatedRequest,
  feature: keyof PlanLimits,
  tier: SubscriptionTier,
  current?: number,
  limit?: number | null
): Promise<void> {
  const { error } = await auth.supabase.from("plan_limit_events").insert({
    user_id: auth.user.id,
    feature,
    tier,
    current_value: current ?? null,
    limit_value: limit ?? null,
  });
  if (error) console.warn("[api-auth] Falha ao registrar limite atingido:", error.message);
}

/**
 * Recurso liga/desliga. Retorna a resposta 403 pronta quando bloqueado, ou
 * null quando liberado:
 *
 *   const denied = await requireFeature(auth, "competitorAnalysis", schedule.owner_id);
 *   if (denied) return denied;
 */
export async function requireFeature(
  auth: AuthenticatedRequest,
  feature: FeatureFlag,
  ownerId: string = auth.user.id
): Promise<NextResponse | null> {
  const { tier, limits } = await getPlanContext(auth, ownerId);
  if (limits[feature]) return null;
  await recordLimitHit(auth, feature, tier);
  return planErrorResponse(buildPlanFeatureBody(feature, tier));
}

// ─── Créditos de IA ─────────────────────────────────────────────────────────

/** Custo padrão por tipo de chamada (1 crédito = 1 chamada simples à Groq). */
export const AI_COSTS = {
  "copy": 1,
  "copy-variations": 1,
  "refine-post": 1,
  "account-analysis": 2,
  "competitor-analysis": 3,
  "events": 1,
  "holidays": 1,
  "city-holidays": 1,
  "briefing-generate": 3,
  "briefing-refine": 1,
  "briefing-file-ocr": 1,
} as const;

export type AiKind = keyof typeof AI_COSTS;

/** Créditos de IA consumidos no mês corrente (usage_events, kind = 'ai'). */
export async function countAiCreditsThisMonth(auth: AuthenticatedRequest): Promise<number> {
  const { data, error } = await auth.supabase
    .from("usage_events")
    .select("cost")
    .eq("user_id", auth.user.id)
    .eq("kind", "ai")
    .gte("created_at", startOfCurrentMonth().toISOString());
  if (error) {
    console.warn("[api-auth] Falha ao somar créditos de IA (migration 62 aplicada?):", error.message);
    return 0;
  }
  return ((data ?? []) as Array<{ cost: number | null }>).reduce((acc, r) => acc + (r.cost ?? 1), 0);
}

/**
 * Debita créditos de IA do plano do usuário. Chame ANTES da Groq:
 *
 *   const denied = await consumeAiCredits(auth, "copy-variations");
 *   if (denied) return denied;
 *
 * Retorna 403 (PLAN_LIMIT, feature aiCreditsPerMonth) quando a cota do mês
 * acabou; caso contrário registra o consumo e retorna null.
 * O calendário (rota /generate) tem cota própria — veja checkAiCalendarQuota.
 */
export async function consumeAiCredits(
  auth: AuthenticatedRequest,
  kind: AiKind,
  cost: number = AI_COSTS[kind]
): Promise<NextResponse | null> {
  const { tier, limits } = await getPlanContext(auth);
  const limit = limits.aiCreditsPerMonth;

  if (limit !== null) {
    const used = await countAiCreditsThisMonth(auth);
    if (used + cost > limit) {
      await recordLimitHit(auth, "aiCreditsPerMonth", tier, used, limit);
      return planErrorResponse(buildPlanLimitBody("aiCreditsPerMonth", tier, used, limit));
    }
  }

  const { error } = await auth.supabase
    .from("usage_events")
    .insert({ user_id: auth.user.id, kind: "ai", cost, meta: { kind } });
  if (error) console.warn("[api-auth] Falha ao registrar créditos de IA:", error.message);
  return null;
}

// ─── Cotas específicas de social media ──────────────────────────────────────

/**
 * Cota mensal de gerações de calendário com IA (aiCalendarsPerMonth).
 * Free: 1/mês | Pro/Ultra: ilimitado.
 */
export async function checkAiCalendarQuota(
  auth: AuthenticatedRequest
): Promise<{ allowed: boolean; used: number; limit: number | null; tier: SubscriptionTier }> {
  const { tier, limits } = await getPlanContext(auth);
  const limit = limits.aiCalendarsPerMonth;

  if (limit === null) return { allowed: true, used: 0, limit: null, tier };

  const { count } = await auth.supabase
    .from("sm_ai_generations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .eq("kind", "calendar")
    .gte("created_at", startOfCurrentMonth().toISOString());

  const used = count ?? 0;
  const allowed = withinLimit(used, limit);
  if (!allowed) await recordLimitHit(auth, "aiCalendarsPerMonth", tier, used, limit);
  return { allowed, used, limit, tier };
}

/** Resposta 403 para a cota de calendário (mesmo formato dos outros gates). */
export function aiCalendarLimitResponse(q: { used: number; limit: number | null; tier: SubscriptionTier }): NextResponse {
  return planErrorResponse(buildPlanLimitBody("aiCalendarsPerMonth", q.tier, q.used, q.limit));
}

/** Registra uma geração de calendário (chamar após sucesso). */
export async function recordAiCalendarUsage(auth: AuthenticatedRequest): Promise<void> {
  await auth.supabase
    .from("sm_ai_generations")
    .insert({ user_id: auth.user.id, kind: "calendar" })
    .then(({ error }) => {
      if (error) console.warn("[api-auth] Falha ao registrar uso de IA:", error.message);
    });
}

/**
 * Features premium de social media (Relatório mensal com IA, demografia e
 * Simulador de Feed): smPremiumReports. A checagem é pelo plano do DONO do
 * cronograma — membros da equipe herdam o acesso do dono.
 */
export async function checkOwnerPremiumSm(
  auth: AuthenticatedRequest,
  ownerId: string
): Promise<{ allowed: boolean; tier: SubscriptionTier; denied: NextResponse | null }> {
  const { tier, limits } = await getPlanContext(auth, ownerId);
  const allowed = limits.smPremiumReports;
  if (!allowed) await recordLimitHit(auth, "smPremiumReports", tier);
  return {
    allowed,
    tier,
    denied: allowed ? null : planErrorResponse(buildPlanFeatureBody("smPremiumReports", tier)),
  };
}

export const PREMIUM_SM_MSG =
  "Este recurso está disponível nos planos Pro e Ultra. Faça upgrade em /precos para liberar relatórios com IA e o Simulador de Feed.";

/** Cota numérica genérica (para rotas que precisem de outras contagens). */
export function limitResponseIfExceeded(
  auth: AuthenticatedRequest,
  feature: CountableLimit,
  ctx: PlanContext,
  used: number
): NextResponse | null {
  const limit = ctx.limits[feature];
  if (withinLimit(used, limit)) return null;
  void recordLimitHit(auth, feature, ctx.tier, used, limit);
  return planErrorResponse(buildPlanLimitBody(feature, ctx.tier, used, limit));
}
