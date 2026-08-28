"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Check, Sparkles, Crown, Shield } from "lucide-react";
import { usePlan } from "@/lib/plans/use-plan";
import {
  FEATURE_LABELS,
  FeatureFlag,
  minimumTierFor,
  PLAN_LABELS,
  PlanLimits,
  SubscriptionTier,
} from "@/lib/plans/plan-limits";

/**
 * Paywall genérico.
 *
 *   <PlanGate feature="competitorAnalysis" title="Análise de concorrentes" bullets={[…]}>
 *     <CompetitorsPage />
 *   </PlanGate>
 *
 * - `feature`: chave booleana da matriz de planos. Se o plano do usuário
 *   (ou do `ownerTier`, quando informado — ex.: dono do cronograma) libera,
 *   renderiza `children`; senão mostra o paywall com CTA para /precos.
 * - Enquanto o perfil carrega, renderiza `fallback` (default: nada) para não
 *   piscar o paywall para quem tem acesso.
 */
export function PlanGate({
  feature,
  ownerTier,
  title,
  description,
  bullets = [],
  children,
  fallback = null,
  compact = false,
}: {
  feature: FeatureFlag;
  ownerTier?: SubscriptionTier | string | null;
  title?: string;
  description?: string;
  bullets?: string[];
  children: ReactNode;
  fallback?: ReactNode;
  compact?: boolean;
}) {
  const plan = usePlan();

  if (plan.loading && !plan.authenticated) return <>{fallback}</>;

  const allowed = ownerTier !== undefined
    ? tierAllows(ownerTier, feature)
    : plan.can(feature);

  if (allowed) return <>{children}</>;

  return (
    <PlanPaywall
      feature={feature}
      title={title}
      description={description}
      bullets={bullets}
      compact={compact}
      inheritedFromOwner={ownerTier !== undefined}
    />
  );
}

/** Verifica um recurso pelo tier de outra pessoa (ex.: dono do cronograma). */
export function tierAllows(tier: SubscriptionTier | string | null | undefined, feature: FeatureFlag): boolean {
  const required = minimumTierFor(feature);
  const rank: Record<string, number> = { free: 0, standard: 1, pro: 1, vip: 2 };
  return (rank[String(tier)] ?? 0) >= (rank[required] ?? 0);
}

export function PlanPaywall({
  feature,
  title,
  description,
  bullets = [],
  compact = false,
  inheritedFromOwner = false,
}: {
  feature: keyof PlanLimits;
  title?: string;
  description?: string;
  bullets?: string[];
  compact?: boolean;
  inheritedFromOwner?: boolean;
}) {
  const required = minimumTierFor(feature);
  const requiredLabel = PLAN_LABELS[required];
  const heading = title ?? capitalize(FEATURE_LABELS[feature]);

  if (compact) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-violet-600 text-white flex items-center justify-center shrink-0">
            <Lock className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{heading}</p>
            <p className="text-xs text-muted-foreground">
              {description ?? `Disponível a partir do plano ${requiredLabel}.`}
            </p>
          </div>
        </div>
        <UpgradeButton size="sm" tier={required} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-blue-500 via-pink-500 to-amber-400" />
      <div className="p-8 text-center space-y-5 max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-violet-600 text-white flex items-center justify-center mx-auto shadow-lg">
          <Lock className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            {required === "vip" ? "Recurso Ultra" : "Recurso Pro · Ultra"}
          </p>
          <h2 className="text-xl font-bold">{heading}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {bullets.length > 0 && (
          <ul className="text-left space-y-2 mx-auto w-fit">
            {bullets.map((b) => (
              <li key={b} className="text-sm flex gap-2 items-start">
                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                {b}
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-2 pt-1">
          <UpgradeButton className="w-full" tier={required} />
          <p className="text-[11px] text-muted-foreground">
            {inheritedFromOwner
              ? `Disponível quando o dono da conta está no plano ${requiredLabel} — o acesso vale para toda a equipe.`
              : `Disponível a partir do plano ${requiredLabel}.`}
          </p>
        </div>
      </div>
    </div>
  );
}

export function UpgradeButton({
  tier = "pro",
  size,
  className = "",
  children,
}: {
  tier?: SubscriptionTier;
  size?: "sm" | "lg" | "default";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Link href="/precos">
      <Button size={size} className={`bg-blue-600 hover:bg-blue-700 text-white gap-2 ${className}`}>
        <Sparkles className="h-4 w-4" />
        {children ?? (tier === "vip" ? "Assinar o Ultra" : "Fazer upgrade para o Pro")}
      </Button>
    </Link>
  );
}

/** Pílula "PRO" / "ULTRA" para marcar recursos premium em menus e botões. */
export function PlanBadge({ tier = "pro", className = "" }: { tier?: SubscriptionTier; className?: string }) {
  const isUltra = tier === "vip";
  const Icon = isUltra ? Shield : Crown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        isUltra
          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
      } ${className}`}
    >
      <Icon className="h-3 w-3" />
      {isUltra ? "Ultra" : "Pro"}
    </span>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
