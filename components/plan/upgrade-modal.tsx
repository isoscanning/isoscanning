"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, Check } from "lucide-react";
import {
  FEATURE_LABELS,
  PLAN_LABELS,
  PLAN_LIMITS,
  PlanErrorBody,
} from "@/lib/plans/plan-limits";
import { notifyPlanLimit, PLAN_LIMIT_EVENT } from "@/lib/plans/plan-events";

export { notifyPlanLimit };

const EVENT_NAME = PLAN_LIMIT_EVENT;

/** Diferenças que o plano exigido traz para o recurso bloqueado (para o modal). */
function highlightsFor(body: PlanErrorBody): string[] {
  const required = PLAN_LIMITS[body.requiredTier];
  const value = required[body.feature];
  const label = FEATURE_LABELS[body.feature];
  const first =
    typeof value === "boolean"
      ? `${capitalize(label)} liberado`
      : value === null
        ? `${capitalize(label)}: ilimitado`
        : `${capitalize(label)}: ${value}`;

  const extras =
    body.requiredTier === "vip"
      ? ["Equipe de até 5 pessoas por conta de social media", "Relatórios sem marca IsoScanning", "Suporte direto por WhatsApp"]
      : ["300 créditos de IA por mês", "Selo verificado, WhatsApp e Instagram no perfil", "Briefings, contratos e relatórios com IA"];

  return [first, ...extras.filter((e) => !e.toLowerCase().startsWith(label.slice(0, 8).toLowerCase()))].slice(0, 4);
}

/**
 * Monte UMA vez no layout raiz. Escuta o evento e mostra o Dialog contextual
 * ("Você atingiu 5/5 candidaturas… o Pro libera 10").
 */
export function PlanUpgradeProvider({ children }: { children?: React.ReactNode }) {
  const [body, setBody] = useState<PlanErrorBody | null>(null);

  useEffect(() => {
    const handler = (e: Event) => setBody((e as CustomEvent<PlanErrorBody>).detail);
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  const requiredLabel = body ? PLAN_LABELS[body.requiredTier] : "Pro";

  return (
    <>
      {children}
      <Dialog open={body !== null} onOpenChange={(open) => { if (!open) setBody(null); }}>
        <DialogContent className="sm:max-w-md">
          {body && (
            <>
              <DialogHeader>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-violet-600 text-white flex items-center justify-center shadow-lg mb-2">
                  <Lock className="h-5 w-5" />
                </div>
                <DialogTitle>
                  {body.code === "PLAN_LIMIT"
                    ? `Limite do plano ${PLAN_LABELS[body.tier]} atingido`
                    : `Recurso do plano ${requiredLabel}`}
                </DialogTitle>
                <DialogDescription>
                  {body.code === "PLAN_LIMIT" && typeof body.current === "number"
                    ? `Você usou ${body.current}/${body.limit} ${FEATURE_LABELS[body.feature]}. `
                    : `${capitalize(FEATURE_LABELS[body.feature])} não está incluído no seu plano atual. `}
                  O plano <strong>{requiredLabel}</strong> libera:
                </DialogDescription>
              </DialogHeader>
              <ul className="space-y-2">
                {highlightsFor(body).map((h) => (
                  <li key={h} className="text-sm flex gap-2 items-start">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {h}
                  </li>
                ))}
              </ul>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setBody(null)}>Agora não</Button>
                <Link href="/precos" onClick={() => setBody(null)}>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 w-full">
                    <Sparkles className="h-4 w-4" />
                    Ver o plano {requiredLabel}
                  </Button>
                </Link>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
