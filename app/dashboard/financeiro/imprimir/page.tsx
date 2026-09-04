"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchFinanceDashboard,
  fetchFinancialRecords,
  type FinanceDashboard,
  type FinancialRecord,
} from "@/lib/finances-service";
import { formatBRL, isoToBR, MONTHS_PT } from "@/lib/finances/money";
import { ArrowLeft, Printer } from "lucide-react";
import { CATEGORY_LABELS, NF_LABELS, SOURCE_LABELS, meiLimitForYear, statusLabel, totalsOf } from "../components/labels";

/**
 * Extrato para impressão / "Salvar como PDF" — B3. Sem cabeçalho e rodapé do
 * site: só o documento. `?mes=9&ano=2026` = mês; `?ano=2026` = resumo anual.
 */
export default function ImprimirFinanceiroPage() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile, loading } = useAuth();
  const now = useMemo(() => new Date(), []);

  const mesParam = parseInt(searchParams.get("mes") ?? "", 10);
  const anoParam = parseInt(searchParams.get("ano") ?? "", 10);
  const month = mesParam >= 1 && mesParam <= 12 ? mesParam : null;
  const year = anoParam >= 2000 && anoParam <= 2100 ? anoParam : now.getFullYear();
  const annual = month === null;

  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [error, setError] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [loading, userProfile, router]);

  useEffect(() => {
    if (!userProfile) return;
    let alive = true;
    (async () => {
      try {
        const d = await fetchFinanceDashboard(year, month ?? 1);
        const rows: FinancialRecord[] = [];
        for (let offset = 0; ; offset += 500) {
          const page = await fetchFinancialRecords(annual ? { year, limit: 500, offset } : { year, month: month ?? undefined, limit: 500, offset });
          rows.push(...page);
          if (page.length < 500) break;
        }
        if (!alive) return;
        setDashboard(d);
        setRecords(rows.sort((a, b) => a.date.localeCompare(b.date)));
      } catch {
        if (alive) setError("Não foi possível montar o relatório. Volte e tente de novo.");
      } finally {
        if (alive) setLoadingData(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userProfile, year, month, annual]);

  const period = annual ? `Ano de ${year}` : `${MONTHS_PT[(month ?? 1) - 1]} de ${year}`;
  const totals = totalsOf(records);
  const active = records.filter((r) => r.status !== "cancelled");

  const summary = useMemo(() => {
    if (!dashboard) return null;
    const s = annual ? dashboard.annual : dashboard.monthly;
    return {
      received: s.received,
      pending: s.pending,
      overdue: s.overdue,
      cancelled: s.cancelled,
      expensesPaid: s.expensesPaid,
      expensesPending: s.expensesPending,
      nfIssued: s.nfIssued,
      nfPendingCount: s.nfPendingCount,
      profit: s.received - s.expensesPaid,
    };
  }, [dashboard, annual]);

  const regimeLine = useMemo(() => {
    if (!dashboard) return "";
    const { settings, limits, annual: a } = dashboard;
    if (settings.taxRegime === "mei") {
      const limit = meiLimitForYear(limits.meiLimit, settings.meiOpenedAt, year);
      const pct = limit > 0 ? ((a.gross / limit) * 100).toFixed(1) : "0";
      return `MEI · receita bruta ${year}: ${formatBRL(a.gross)} de ${formatBRL(limit)} (${pct}% do teto) · emitido em NF: ${formatBRL(a.nfIssued)}`;
    }
    if (settings.taxRegime === "simples") {
      return `Simples Nacional · receita bruta ${year}: ${formatBRL(a.gross)} · imposto estimado (${settings.simplesRate}%): ${formatBRL(a.gross * (settings.simplesRate / 100))}`;
    }
    return `Receita bruta ${year}: ${formatBRL(a.gross)}`;
  }, [dashboard, year]);

  if (loading || !userProfile) return null;

  return (
    <div className="min-h-screen bg-background text-foreground print:bg-white print:text-black">
      <div className="max-w-4xl mx-auto px-6 py-8 print:px-0 print:py-0">
        <div className="flex items-center justify-between gap-3 mb-6 print:hidden">
          <Link href={annual ? `/dashboard/financeiro?ano=${year}` : `/dashboard/financeiro?mes=${month}&ano=${year}`}>
            <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={annual ? `/dashboard/financeiro/imprimir?mes=${now.getMonth() + 1}&ano=${year}` : `/dashboard/financeiro/imprimir?ano=${year}`}>
              <Button variant="ghost" size="sm">{annual ? "Ver um mês" : "Ver o ano inteiro"}</Button>
            </Link>
            <Button size="sm" onClick={() => window.print()} disabled={loadingData} className="bg-emerald-600 hover:bg-emerald-700">
              <Printer className="h-4 w-4 mr-2" /> Imprimir / salvar PDF
            </Button>
          </div>
        </div>

        {error && <p className="text-rose-600 print:hidden">{error}</p>}

        <header className="border-b-2 border-foreground/80 pb-4 mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Relatório financeiro</p>
          <h1 className="text-2xl font-bold mt-1">{period}</h1>
          <p className="text-sm mt-1">{userProfile.displayName}{userProfile.artisticName ? ` (${userProfile.artisticName})` : ""}{userProfile.cpf ? ` · CPF ${userProfile.cpf}` : ""}</p>
          <p className="text-xs text-muted-foreground mt-1">Gerado em {now.toLocaleDateString("pt-BR")} às {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} pelo IsoScanning.</p>
        </header>

        {loadingData || !summary ? (
          <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>
        ) : (
          <>
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 mb-8 text-sm">
              <Tile label="Recebido" value={summary.received} strong />
              <Tile label="A receber" value={summary.pending} sub={summary.overdue > 0 ? `${formatBRL(summary.overdue)} vencidos` : undefined} />
              <Tile label="Despesas pagas" value={summary.expensesPaid} sub={summary.expensesPending > 0 ? `${formatBRL(summary.expensesPending)} a pagar` : undefined} />
              <Tile label="Lucro (recebido − despesas)" value={summary.profit} strong />
              <Tile label="Emitido em NF" value={summary.nfIssued} />
              <div>
                <p className="text-xs text-muted-foreground">Notas a emitir</p>
                <p className="font-semibold tabular-nums">{summary.nfPendingCount}</p>
              </div>
              <Tile label="Cancelados" value={summary.cancelled} />
              <div>
                <p className="text-xs text-muted-foreground">Lançamentos</p>
                <p className="font-semibold tabular-nums">{active.length}{records.length !== active.length ? ` (+${records.length - active.length} cancelados)` : ""}</p>
              </div>
            </section>

            {annual && dashboard && (
              <section className="mb-8">
                <h2 className="text-base font-semibold mb-2">Mês a mês</h2>
                <table className="w-full text-sm tabular-nums">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-1.5">Mês</th>
                      <th className="text-right py-1.5">Recebido</th>
                      <th className="text-right py-1.5">A receber</th>
                      <th className="text-right py-1.5">Despesas</th>
                      <th className="text-right py-1.5">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.months.map((m) => (
                      <tr key={m.month} className="border-b border-dashed last:border-0">
                        <td className="py-1.5">{MONTHS_PT[m.month - 1]}</td>
                        <td className="text-right py-1.5">{formatBRL(m.received)}</td>
                        <td className="text-right py-1.5">{formatBRL(m.pending)}</td>
                        <td className="text-right py-1.5">{formatBRL(m.expenses)}</td>
                        <td className="text-right py-1.5 font-medium">{formatBRL(m.received - m.expenses)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            <section className="mb-8">
              <h2 className="text-base font-semibold mb-2">Lançamentos</h2>
              {records.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum lançamento no período.</p>
              ) : (
                <table className="w-full text-xs sm:text-sm tabular-nums">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-1.5 pr-2">Data</th>
                      <th className="text-left py-1.5 pr-2">Lançamento</th>
                      <th className="text-left py-1.5 pr-2">Origem</th>
                      <th className="text-left py-1.5 pr-2">Situação</th>
                      <th className="text-left py-1.5 pr-2">NF</th>
                      <th className="text-right py-1.5">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id} className={`border-b border-dashed last:border-0 align-top ${r.status === "cancelled" ? "text-muted-foreground line-through" : ""}`}>
                        <td className="py-1.5 pr-2 whitespace-nowrap">{isoToBR(r.date)}</td>
                        <td className="py-1.5 pr-2">
                          <span className="font-medium">{r.title}</span>
                          {(r.clientName || r.category) && (
                            <span className="block text-xs text-muted-foreground">{[r.clientName, r.category ? CATEGORY_LABELS[r.category] : null].filter(Boolean).join(" · ")}</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-2">{r.type === "expense" ? "Despesa" : SOURCE_LABELS[r.source]}</td>
                        <td className="py-1.5 pr-2 whitespace-nowrap">{statusLabel(r)}{r.status === "received" && r.receivedAt ? ` ${isoToBR(r.receivedAt)}` : r.status === "pending" && r.dueDate ? ` (vence ${isoToBR(r.dueDate)})` : ""}</td>
                        <td className="py-1.5 pr-2 whitespace-nowrap">{r.type === "expense" || !r.requiresNf ? "—" : `${NF_LABELS[r.nfStatus]}${r.nfNumber ? ` ${r.nfNumber}` : ""}`}</td>
                        <td className="py-1.5 text-right whitespace-nowrap">{r.type === "expense" ? "− " : ""}{formatBRL(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-foreground/60 font-semibold">
                    <tr>
                      <td colSpan={5} className="py-2 text-right">Receitas {formatBRL(totals.income)}{totals.expenses > 0 ? ` · Despesas ${formatBRL(totals.expenses)} · Saldo` : ""}</td>
                      <td className="py-2 text-right">{formatBRL(totals.expenses > 0 ? totals.net : totals.income)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </section>

            <footer className="text-xs text-muted-foreground border-t pt-3 space-y-1">
              <p>{regimeLine}</p>
              <p>Cancelados não entram em receita. O teto do MEI considera a receita bruta (recebido + a receber), com ou sem nota fiscal. Valores informados pelo próprio profissional.</p>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, sub, strong }: { label: string; value: number; sub?: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`tabular-nums ${strong ? "text-lg font-bold" : "font-semibold"}`}>{formatBRL(value)}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
