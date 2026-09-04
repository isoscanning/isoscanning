"use client";

import type { FinanceMonthSummary } from "@/lib/finances-service";
import { formatBRL } from "@/lib/finances/money";
import { AlertCircle, DollarSign, Receipt, WalletCards } from "lucide-react";
import type { FilterKey } from "./labels";

interface KpiCardsProps {
  monthly: FinanceMonthSummary | null;
  active: FilterKey;
  loading?: boolean;
  onFilter: (key: FilterKey) => void;
}

/** Cards do mês. Cada um é um atalho para o filtro correspondente da lista (B9). */
export function KpiCards({ monthly, active, loading, onFilter }: KpiCardsProps) {
  const m = monthly;
  const profit = (m?.received ?? 0) - (m?.expensesPaid ?? 0);

  const cards: Array<{
    key: FilterKey;
    title: string;
    value: string;
    sub?: string;
    subTone?: "rose" | "muted";
    icon: React.ReactNode;
    tone: string;
  }> = [
    {
      key: "recebidos",
      title: "Recebido no mês",
      value: formatBRL(m?.received ?? 0),
      sub: m && m.cancelled > 0 ? `${formatBRL(m.cancelled)} cancelados` : undefined,
      subTone: "muted",
      icon: <DollarSign className="h-4 w-4" />,
      tone: "emerald",
    },
    {
      key: m && m.overdueCount > 0 ? "vencidos" : "pendentes",
      title: "A receber",
      value: formatBRL(m?.pending ?? 0),
      sub: m && m.overdueCount > 0 ? `${formatBRL(m.overdue)} vencidos (${m.overdueCount})` : m && m.pending > 0 ? "Confirme quando o pagamento cair" : undefined,
      subTone: m && m.overdueCount > 0 ? "rose" : "muted",
      icon: <WalletCards className="h-4 w-4" />,
      tone: "amber",
    },
    {
      key: "despesas",
      title: "Lucro do mês",
      value: formatBRL(profit),
      sub: `${formatBRL(m?.expensesPaid ?? 0)} em despesas pagas${m && m.expensesPending > 0 ? ` · ${formatBRL(m.expensesPending)} a pagar` : ""}`,
      subTone: "muted",
      icon: <Receipt className="h-4 w-4" />,
      tone: profit < 0 ? "rose" : "blue",
    },
    {
      key: "nf",
      title: "Notas a emitir",
      value: String(m?.nfPendingCount ?? 0),
      sub: m && m.nfPendingCount > 0 ? `${formatBRL(m.nfPendingAmount)} sem nota` : "Tudo em dia",
      subTone: m && m.nfPendingCount > 0 ? "rose" : "muted",
      icon: <AlertCircle className="h-4 w-4" />,
      tone: "rose",
    },
  ];

  const toneClasses: Record<string, { border: string; text: string; ring: string }> = {
    emerald: { border: "border-emerald-500/10 hover:border-emerald-500/40", text: "text-emerald-600 dark:text-emerald-400", ring: "ring-emerald-500/50" },
    amber: { border: "border-amber-500/10 hover:border-amber-500/40", text: "text-amber-600 dark:text-amber-400", ring: "ring-amber-500/50" },
    blue: { border: "border-blue-500/10 hover:border-blue-500/40", text: "text-blue-600 dark:text-blue-400", ring: "ring-blue-500/50" },
    rose: { border: "border-rose-500/10 hover:border-rose-500/40", text: "text-rose-600 dark:text-rose-400", ring: "ring-rose-500/50" },
  };

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
      {cards.map((c) => {
        const t = toneClasses[c.tone];
        const isActive = active === c.key;
        return (
          <button
            key={c.title}
            type="button"
            onClick={() => onFilter(c.key)}
            aria-pressed={isActive}
            className={`text-left rounded-xl border bg-card/80 backdrop-blur p-5 transition-all ${t.border} ${isActive ? `ring-2 ${t.ring}` : ""}`}
          >
            <div className="flex items-center justify-between pb-2">
              <span className="text-sm font-medium">{c.title}</span>
              <span className={t.text}>{c.icon}</span>
            </div>
            <div className={`text-2xl font-bold tabular-nums ${t.text}`}>{c.value}</div>
            {c.sub && (
              <p className={`text-xs mt-1 ${c.subTone === "rose" ? "text-rose-600 dark:text-rose-400 font-medium" : "text-muted-foreground"}`}>{c.sub}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
