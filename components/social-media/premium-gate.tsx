"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { usePlan } from "@/lib/plans/use-plan";
import { PlanPaywall } from "@/components/plan/plan-gate";
import { resolveEffectiveTier, SubscriptionTier } from "@/lib/plans/plan-limits";

// Paywall das features premium de social media (Relatório com IA e
// Simulador de Feed). Wrapper fino do PlanPaywall genérico (feature
// `smPremiumReports`), mantido por compatibilidade — prefira <PlanGate/>.

export function PremiumGate({ title, description, bullets }: {
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <PlanPaywall
      feature="smPremiumReports"
      title={title}
      description={description}
      bullets={bullets}
      inheritedFromOwner
    />
  );
}

/**
 * Tier EFETIVO do dono de um recurso compartilhado (cronograma, briefing…):
 * a equipe herda o plano do dono. Se o dono é o próprio usuário logado usa o
 * plano resolvido pelo backend (usePlan); senão lê profiles.subscription_tier
 * + subscription_expires_at. Retorna null enquanto carrega; falha = "free".
 */
export function useOwnerPlanTier(ownerId: string | null | undefined): SubscriptionTier | null {
  const { userProfile } = useAuth();
  const plan = usePlan();
  const [fetched, setFetched] = useState<{ id: string; tier: SubscriptionTier } | null>(null);

  const isSelf = !!ownerId && ownerId === userProfile?.id;

  useEffect(() => {
    if (!ownerId || isSelf) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("subscription_tier, subscription_expires_at")
      .eq("id", ownerId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const p = data as { subscription_tier?: string | null; subscription_expires_at?: string | null } | null;
        setFetched({
          id: ownerId,
          tier: resolveEffectiveTier(p?.subscription_tier, p?.subscription_expires_at ?? null),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId, isSelf]);

  if (!ownerId) return null;
  if (isSelf) return plan.tier;
  return fetched?.id === ownerId ? fetched.tier : null;
}
