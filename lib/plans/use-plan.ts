"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import apiClient from "@/lib/api-service";
import {
  CountableLimit,
  FeatureFlag,
  getPlanLimits,
  PLAN_LABELS,
  PlanLimits,
  resolveEffectiveTier,
  SubscriptionTier,
  withinLimit,
} from "./plan-limits";

export interface PlanInfo {
  tier: SubscriptionTier;
  label: string;
  limits: PlanLimits;
  expiresAt: string | null;
  isTrial: boolean;
  trialEndsAt: string | null;
}

export interface UsePlanResult extends PlanInfo {
  /** Perfil ainda carregando — evite mostrar paywall antes disso. */
  loading: boolean;
  /** Usuário logado? */
  authenticated: boolean;
  isPaid: boolean;
  isUltra: boolean;
  /** Dias restantes do trial (null se não está em trial). */
  trialDaysLeft: number | null;
  /** Recurso liga/desliga disponível no plano? */
  can: (feature: FeatureFlag) => boolean;
  /** Limite numérico do plano (null = ilimitado). */
  limitOf: (feature: CountableLimit) => number | null;
  /** `used` ainda está dentro da cota? */
  allows: (feature: CountableLimit, used: number) => boolean;
  /** Quanto ainda pode usar (Infinity = ilimitado). */
  remaining: (feature: CountableLimit, used: number) => number;
}

function fallbackPlan(tier?: string | null, expiresAt?: string | null): PlanInfo {
  const effective = resolveEffectiveTier(tier, expiresAt);
  return {
    tier: effective,
    label: PLAN_LABELS[effective],
    limits: getPlanLimits(effective),
    expiresAt: expiresAt ?? null,
    isTrial: false,
    trialEndsAt: null,
  };
}

/**
 * Plano efetivo do usuário logado. Fonte: `plan` de GET /auth/me (backend);
 * cai para o espelho local só enquanto o perfil ainda não chegou.
 *
 *   const plan = usePlan();
 *   if (!plan.can("competitorAnalysis")) return <PlanGate feature="competitorAnalysis" … />;
 *   plan.allows("socialMediaAccounts", schedules.length)
 */
export function usePlan(): UsePlanResult {
  const { userProfile, loading } = useAuth();

  const info = useMemo<PlanInfo>(() => {
    const fromApi = (userProfile as { plan?: PlanInfo } | null)?.plan;
    if (fromApi?.limits) return fromApi;
    return fallbackPlan(userProfile?.subscriptionTier, userProfile?.subscriptionExpiresAt ?? null);
  }, [userProfile]);

  const trialDaysLeft = useMemo(() => {
    if (!info.isTrial || !info.trialEndsAt) return null;
    const ms = new Date(info.trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86_400_000));
  }, [info.isTrial, info.trialEndsAt]);

  const can = useCallback((feature: FeatureFlag) => Boolean(info.limits[feature]), [info.limits]);
  const limitOf = useCallback((feature: CountableLimit) => info.limits[feature], [info.limits]);
  const allows = useCallback(
    (feature: CountableLimit, used: number) => withinLimit(used, info.limits[feature]),
    [info.limits]
  );
  const remaining = useCallback(
    (feature: CountableLimit, used: number) => {
      const limit = info.limits[feature];
      return limit === null ? Number.POSITIVE_INFINITY : Math.max(0, limit - used);
    },
    [info.limits]
  );

  return {
    ...info,
    loading,
    authenticated: !!userProfile,
    isPaid: info.tier !== "free",
    isUltra: info.tier === "vip",
    trialDaysLeft,
    can,
    limitOf,
    allows,
    remaining,
  };
}

export type PlanUsage = Partial<Record<CountableLimit, number>>;

export interface PlanUsageResult {
  plan: PlanInfo | null;
  usage: PlanUsage;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Uso corrente × limites (GET /plans/me). Para medidores no dashboard.
 * Não faz polling — chame `refresh()` depois de uma ação que consome cota.
 */
export function usePlanUsage(enabled = true): PlanUsageResult {
  const { userProfile } = useAuth();
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [usage, setUsage] = useState<PlanUsage>({});
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !userProfile) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data } = await apiClient.get("/plans/me", {
        headers: { "X-Skip-Auth-Redirect": "1" },
      });
      setPlan(data.plan ?? null);
      setUsage(data.usage ?? {});
      setError(null);
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof message === "string" ? message : "Não foi possível carregar o uso do plano.");
    } finally {
      setLoading(false);
    }
  }, [enabled, userProfile]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { plan, usage, loading, error, refresh };
}
