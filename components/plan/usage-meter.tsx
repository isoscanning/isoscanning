"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gauge, Sparkles, Clock } from "lucide-react";
import { usePlan, usePlanUsage } from "@/lib/plans/use-plan";
import { CountableLimit, FEATURE_LABELS, PLAN_LABELS } from "@/lib/plans/plan-limits";
import { PlanBadge } from "./plan-gate";

/** Medidores exibidos por padrão no dashboard (ordem = relevância). */
const DEFAULT_METERS: { feature: CountableLimit; label: string }[] = [
  { feature: "aiCreditsPerMonth", label: "Créditos de IA" },
  { feature: "socialMediaAccounts", label: "Contas de social media" },
  { feature: "briefingsPerMonth", label: "Briefings no mês" },
  { feature: "contractsPerMonth", label: "Contratos enviados" },
  { feature: "portfolioMediaFiles", label: "Arquivos no portfólio" },
  { feature: "jobApplicationsPerMonth", label: "Candidaturas no mês" },
];

/**
 * Card "Seu plano" com barras de uso × limite. Só mostra cotas finitas —
 * ilimitado não precisa de barra. A barra chegando no fim vende mais que a parede.
 */
export function UsageMeter({
  meters = DEFAULT_METERS,
  compact = false,
  className = "",
}: {
  meters?: { feature: CountableLimit; label?: string }[];
  compact?: boolean;
  className?: string;
}) {
  const plan = usePlan();
  const { usage, loading } = usePlanUsage(plan.authenticated);

  const rows = meters
    .map((m) => {
      const limit = plan.limits[m.feature];
      const used = usage[m.feature] ?? 0;
      return { ...m, limit, used };
    })
    .filter((r) => r.limit !== null);

  const anyNearLimit = rows.some((r) => r.limit !== null && r.limit > 0 && r.used / r.limit >= 0.8);

  return (
    <Card className={`border-primary/10 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Seu plano</CardTitle>
          <PlanBadgeForTier tier={plan.tier} />
        </div>
        {plan.isTrial && plan.trialDaysLeft !== null && (
          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
            <Clock className="h-3.5 w-3.5" />
            Teste do Pro: {plan.trialDaysLeft} dia{plan.trialDaysLeft === 1 ? "" : "s"}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">Sem limites de uso no plano {PLAN_LABELS[plan.tier]}.</p>
        )}
        {rows.slice(0, compact ? 3 : rows.length).map((r) => (
          <Meter key={r.feature} label={r.label ?? FEATURE_LABELS[r.feature]} used={r.used} limit={r.limit as number} loading={loading} />
        ))}
        {(plan.tier === "free" || anyNearLimit || plan.isTrial) && (
          <div className="pt-1 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {plan.isTrial
                ? "Assine para manter tudo depois do teste."
                : anyNearLimit
                  ? "Você está perto do limite."
                  : "Desbloqueie todas as ferramentas."}
            </p>
            <Link href="/precos">
              <Button size="sm" variant="outline" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Ver planos
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Meter({ label, used, limit, loading }: { label: string; used: number; limit: number; loading: boolean }) {
  const ratio = limit > 0 ? Math.min(1, used / limit) : 1;
  const tone = ratio >= 1 ? "bg-red-500" : ratio >= 0.8 ? "bg-amber-500" : "bg-primary";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {loading ? "…" : `${used}/${limit}`}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${tone}`} style={{ width: `${loading ? 0 : ratio * 100}%` }} />
      </div>
    </div>
  );
}

function PlanBadgeForTier({ tier }: { tier: string }) {
  if (tier === "free") {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Free
      </span>
    );
  }
  return <PlanBadge tier={tier === "vip" ? "vip" : "pro"} />;
}
