"use client";

import { Button } from "@/components/ui/button";
import type { FinanceDashboard, TaxRegime } from "@/lib/finances-service";
import { formatBRL } from "@/lib/finances/money";
import { AlertTriangle, Settings2 } from "lucide-react";
import { meiLimitForYear } from "./labels";

interface AnnualPanelProps {
  dashboard: FinanceDashboard;
  onRegimeChange: (regime: TaxRegime) => void;
  onOpenSettings: () => void;
  busy?: boolean;
}

/**
 * Painel anual. A base do teto é a RECEITA BRUTA (recebido + a receber, sem
 * cancelados) — é o que a lei do MEI considera. "Emitido em NF" é secundário.
 */
export function AnnualPanel({ dashboard, onRegimeChange, onOpenSettings, busy }: AnnualPanelProps) {
  const { annual, limits, settings, year } = dashboard;
  const regime = settings.taxRegime;

  const RegimeToggle = (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground">Regime:</span>
      <div className="flex bg-muted/50 p-1 rounded-full border border-muted" role="group" aria-label="Regime tributário">
        {([
          ["mei", "MEI"],
          ["simples", "Simples Nacional"],
          ["other", "Outro"],
        ] as Array<[TaxRegime, string]>).map(([value, label]) => (
          <Button
            key={value}
            variant="ghost"
            size="sm"
            disabled={busy}
            aria-pressed={regime === value}
            onClick={() => regime !== value && onRegimeChange(value)}
            className={`rounded-full h-8 px-4 text-sm font-medium transition-all ${regime === value ? "bg-emerald-600 text-white shadow-md hover:bg-emerald-700 hover:text-white" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </Button>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={onOpenSettings} className="text-muted-foreground">
        <Settings2 className="h-4 w-4 mr-1" /> Ajustes fiscais
      </Button>
    </div>
  );

  if (regime === "other") {
    return (
      <div className="space-y-4">
        {RegimeToggle}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl border p-6 bg-card/80">
          <Stat label={`Receita bruta ${year}`} value={annual.gross} tone="emerald" hint="Recebido + a receber, sem cancelados." />
          <Stat label="Recebido" value={annual.received} />
          <Stat label="Despesas pagas" value={annual.expensesPaid} tone="rose" />
        </div>
      </div>
    );
  }

  if (regime === "simples") {
    const pct = limits.simplesLimit > 0 ? (annual.gross / limits.simplesLimit) * 100 : 0;
    const tax = annual.gross * (settings.simplesRate / 100);
    return (
      <div className="space-y-4">
        {RegimeToggle}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gradient-to-br from-indigo-900/20 to-blue-900/20 border border-indigo-500/30 rounded-2xl p-6 shadow-lg shadow-indigo-500/5">
          <div>
            <p className="text-sm font-medium text-indigo-400 mb-1">Receita bruta ({year})</p>
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400 tabular-nums">{formatBRL(annual.gross)}</h2>
            <p className="text-xs text-muted-foreground mt-2">Recebido {formatBRL(annual.received)} · a receber {formatBRL(annual.pending)}</p>
            <div className="mt-4 pt-4 border-t border-indigo-500/20 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Emitido em NF</p>
                <p className="text-sm font-semibold tabular-nums">{formatBRL(annual.nfIssued)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Despesas pagas</p>
                <p className="text-sm font-semibold tabular-nums">{formatBRL(annual.expensesPaid)}</p>
              </div>
            </div>
          </div>
          <div className="border-t md:border-t-0 md:border-l border-indigo-500/20 pt-4 md:pt-0 md:pl-6">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-sm font-medium text-blue-400 mb-1">Imposto estimado ({settings.simplesRate}%)</p>
                <h2 className="text-3xl font-bold text-rose-400 tabular-nums">{formatBRL(tax)}</h2>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Teto anual</p>
                <span className="bg-indigo-500/10 text-indigo-400 text-xs px-2 py-1 rounded-full font-medium border border-indigo-500/20">{formatBRL(limits.simplesLimit)}</span>
              </div>
            </div>
            <div className="w-full bg-black/40 rounded-full h-2.5 mt-5 overflow-hidden border border-white/5">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-400 h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{pct.toFixed(2)}% do teto · estimativa simplificada, sem faixas progressivas nem Fator R.</p>
            <Button variant="link" size="sm" className="px-0 h-auto text-indigo-400" onClick={onOpenSettings}>Ajustar alíquota</Button>
          </div>
        </div>
      </div>
    );
  }

  // MEI
  const limit = meiLimitForYear(limits.meiLimit, settings.meiOpenedAt, year);
  const pct = limit > 0 ? (annual.gross / limit) * 100 : 0;
  const remaining = Math.max(0, limit - annual.gross);
  const toleranceLimit = limit * (1 + limits.meiTolerance);
  const nfShare = annual.gross > 0 ? (annual.nfIssued / annual.gross) * 100 : 0;

  let alert: { tone: "amber" | "rose"; text: string } | null = null;
  if (annual.gross > toleranceLimit) {
    alert = { tone: "rose", text: `Passou de ${formatBRL(toleranceLimit)} (teto + ${Math.round(limits.meiTolerance * 100)}%): o desenquadramento do MEI é retroativo a janeiro. Fale com seu contador.` };
  } else if (annual.gross > limit) {
    alert = { tone: "rose", text: `Acima do teto. Até ${formatBRL(toleranceLimit)} você paga a diferença e sai do MEI no ano que vem.` };
  } else if (pct >= 80) {
    alert = { tone: "amber", text: `Você já usou ${pct.toFixed(0)}% do teto. Restam ${formatBRL(remaining)} para os próximos trabalhos do ano.` };
  }

  return (
    <div className="space-y-4">
      {RegimeToggle}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-500/20 rounded-2xl p-6 shadow-lg shadow-emerald-500/5">
        <div>
          <p className="text-sm font-medium text-emerald-400 mb-1">Receita bruta ({year})</p>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 tabular-nums">{formatBRL(annual.gross)}</h2>
          <p className="text-xs text-muted-foreground mt-2">Recebido {formatBRL(annual.received)} · a receber {formatBRL(annual.pending)}. Cancelados não contam.</p>
          <div className="mt-4 pt-4 border-t border-emerald-500/20 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Emitido em NF</p>
              <p className="text-sm font-semibold tabular-nums">{formatBRL(annual.nfIssued)} <span className="text-xs text-muted-foreground font-normal">({nfShare.toFixed(0)}%)</span></p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">DAS mensal</p>
              <p className="text-sm font-semibold">vence dia {limits.dasDueDay}</p>
            </div>
          </div>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-emerald-500/20 pt-4 md:pt-0 md:pl-6">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-sm font-medium text-teal-400 mb-1">Saldo restante do teto MEI</p>
              <h2 className="text-3xl font-bold tabular-nums">{formatBRL(remaining)}</h2>
            </div>
            <div className="text-right flex flex-col items-end">
              <p className="text-xs text-muted-foreground mb-1">{limit !== limits.meiLimit ? "Teto proporcional" : "Teto anual"}</p>
              <span className="bg-emerald-500/10 text-emerald-500 text-xs px-2 py-1 rounded-full font-medium border border-emerald-500/20">{formatBRL(limit)}</span>
            </div>
          </div>

          <div className="relative w-full bg-black/40 rounded-full h-2.5 mt-5 overflow-hidden border border-white/5" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Uso do teto do MEI">
            <div
              className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? "bg-gradient-to-r from-rose-500 to-rose-400" : pct >= 80 ? "bg-gradient-to-r from-amber-500 to-amber-400" : "bg-gradient-to-r from-teal-500 to-emerald-400"}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
            <div className="absolute top-0 bottom-0 w-px bg-white/50" style={{ left: "80%" }} title="80% do teto" />
          </div>
          <div className="flex justify-between items-center mt-2 text-xs">
            <p className="font-medium text-emerald-500/80">{pct.toFixed(1)}% do teto</p>
            <p className="text-muted-foreground">tolerância até {formatBRL(toleranceLimit)}</p>
          </div>

          {alert && (
            <div className={`mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${alert.tone === "rose" ? "border-rose-500/30 bg-rose-500/10 text-rose-200" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{alert.text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone, hint }: { label: string; value: number; tone?: "emerald" | "rose"; hint?: string }) {
  const color = tone === "emerald" ? "text-emerald-600 dark:text-emerald-400" : tone === "rose" ? "text-rose-600 dark:text-rose-400" : "";
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{formatBRL(value)}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
