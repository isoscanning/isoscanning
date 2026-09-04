"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchFinanceDashboard, type FinanceDashboard } from "@/lib/finances-service";
import { formatBRL, MONTHS_PT } from "@/lib/finances/money";
import { ArrowRight, PieChart } from "lucide-react";

/** Resumo do mês corrente no /dashboard (C9). Silencioso em caso de erro. */
export function FinanceMonthWidget() {
  const [data, setData] = useState<FinanceDashboard | null>(null);
  const [failed, setFailed] = useState(false);
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  useEffect(() => {
    let alive = true;
    fetchFinanceDashboard(year, month)
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [year, month]);

  if (failed) return null;

  const m = data?.monthly;
  const profit = (m?.received ?? 0) - (m?.expensesPaid ?? 0);
  const items: Array<{ label: string; value: string; tone?: string; href: string }> = [
    { label: "Recebido", value: formatBRL(m?.received ?? 0), tone: "text-emerald-600 dark:text-emerald-400", href: "/dashboard/financeiro?filtro=recebidos" },
    {
      label: m && m.overdueCount > 0 ? `A receber · ${m.overdueCount} vencido${m.overdueCount > 1 ? "s" : ""}` : "A receber",
      value: formatBRL(m?.pending ?? 0),
      tone: m && m.overdueCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400",
      href: m && m.overdueCount > 0 ? "/dashboard/financeiro?filtro=vencidos" : "/dashboard/financeiro?filtro=pendentes",
    },
    { label: "Lucro", value: formatBRL(profit), tone: profit < 0 ? "text-rose-600" : "", href: "/dashboard/financeiro" },
    { label: "Notas a emitir", value: String(m?.nfPendingCount ?? 0), tone: m && m.nfPendingCount > 0 ? "text-rose-600 dark:text-rose-400" : "", href: "/dashboard/financeiro?filtro=nf" },
  ];

  return (
    <Card className="border-emerald-500/20 bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center">
            <PieChart className="h-4 w-4" />
          </span>
          Financeiro de {MONTHS_PT[month - 1]}
        </CardTitle>
        <Link href="/dashboard/financeiro" className="text-sm text-emerald-600 hover:underline inline-flex items-center gap-1">
          Abrir <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {items.map((it) => (
              <Link key={it.label} href={it.href} className="rounded-lg p-2 -m-2 hover:bg-muted/60 transition-colors">
                <p className="text-xs text-muted-foreground">{it.label}</p>
                <p className={`text-lg font-bold tabular-nums ${it.tone ?? ""}`}>{it.value}</p>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
