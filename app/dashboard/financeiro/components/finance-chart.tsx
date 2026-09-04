"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FinanceMonthPoint } from "@/lib/finances-service";
import { formatBRL, MONTHS_PT, MONTHS_PT_SHORT } from "@/lib/finances/money";

interface FinanceChartProps {
  months: FinanceMonthPoint[];
  year: number;
  activeMonth: number;
  onSelectMonth: (month: number) => void;
}

/** Série fixa por entidade (nunca por posição): recebido, a receber, despesas. */
const SERIES = {
  // Validado com o validate_palette do skill de dataviz (banda de luminosidade,
  // croma, separação para daltonismo, contraste) em cada modo.
  light: { received: "#047857", pending: "#d97706", expenses: "#e11d48", grid: "#e4e7e4", tick: "#6b7a72", surface: "#ffffff", ink: "#17221c" },
  dark: { received: "#0a9a6a", pending: "#d97706", expenses: "#e11d48", grid: "#2a3630", tick: "#8a978f", surface: "#161e1a", ink: "#e4ece7" },
};

function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains("dark"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

/** O clique na barra traz o dado original em `payload` (recharts 3) ou no próprio objeto. */
function monthFromBar(d: unknown): number | null {
  const obj = d as { payload?: { month?: unknown }; month?: unknown } | null;
  const raw = obj?.payload?.month ?? obj?.month;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
}

/**
 * Doze meses do ano: receita (recebido + a receber, empilhados) e despesas.
 * Um eixo só; legenda sempre visível; clicar num mês seleciona o período.
 */
export function FinanceChart({ months, year, activeMonth, onSelectMonth }: FinanceChartProps) {
  const dark = useIsDark();
  const c = dark ? SERIES.dark : SERIES.light;

  const data = useMemo(
    () =>
      months.map((m) => ({
        month: m.month,
        label: MONTHS_PT_SHORT[m.month - 1],
        received: m.received,
        pending: m.pending,
        expenses: m.expenses,
      })),
    [months]
  );
  const hasData = data.some((d) => d.received > 0 || d.pending > 0 || d.expenses > 0);
  const best = data.reduce((acc, d) => (d.received + d.pending > acc.total ? { month: d.month, total: d.received + d.pending } : acc), { month: 0, total: 0 });

  if (!hasData) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">Sem lançamentos em {year} ainda. O gráfico aparece a partir do primeiro registro.</p>
    );
  }

  const legend = [
    { key: "received", label: "Recebido", color: c.received },
    { key: "pending", label: "A receber", color: c.pending },
    { key: "expenses", label: "Despesas", color: c.expenses },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-4 text-xs text-muted-foreground" aria-label="Legenda">
          {legend.map((l) => (
            <li key={l.key} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} aria-hidden />
              {l.label}
            </li>
          ))}
        </ul>
        {best.month > 0 && (
          <p className="text-xs text-muted-foreground">
            Melhor mês: <span className="font-medium text-foreground">{MONTHS_PT[best.month - 1]}</span> ({formatBRL(best.total)})
          </p>
        )}
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="28%" barGap={2}>
            <CartesianGrid stroke={c.grid} strokeDasharray="0" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: c.tick, fontSize: 11 }} tickLine={false} axisLine={{ stroke: c.grid }} interval={0} />
            <YAxis
              tick={{ fill: c.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v) => (v === 0 ? "0" : `R$ ${compact.format(Number(v))}`)}
            />
            <Tooltip
              cursor={{ fill: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}
              contentStyle={{ background: c.surface, border: `1px solid ${c.grid}`, borderRadius: 8, fontSize: 12, color: c.ink }}
              labelStyle={{ color: c.ink, fontWeight: 600 }}
              labelFormatter={(label) => `${MONTHS_PT[MONTHS_PT_SHORT.indexOf(String(label))]}/${year}`}
              formatter={(value, name) => {
                const labels: Record<string, string> = { received: "Recebido", pending: "A receber", expenses: "Despesas" };
                return [formatBRL(Number(value)), labels[String(name)] ?? String(name)];
              }}
            />
            <Bar dataKey="received" stackId="receita" fill={c.received} maxBarSize={22} onClick={(d) => { const m = monthFromBar(d); if (m) onSelectMonth(m); }} cursor="pointer">
              {data.map((d) => (
                <Cell key={d.month} fillOpacity={d.month === activeMonth ? 1 : 0.55} />
              ))}
            </Bar>
            <Bar dataKey="pending" stackId="receita" fill={c.pending} maxBarSize={22} radius={[4, 4, 0, 0]} onClick={(d) => { const m = monthFromBar(d); if (m) onSelectMonth(m); }} cursor="pointer">
              {data.map((d) => (
                <Cell key={d.month} fillOpacity={d.month === activeMonth ? 1 : 0.55} />
              ))}
            </Bar>
            <Bar dataKey="expenses" fill={c.expenses} maxBarSize={22} radius={[4, 4, 0, 0]} onClick={(d) => { const m = monthFromBar(d); if (m) onSelectMonth(m); }} cursor="pointer">
              {data.map((d) => (
                <Cell key={d.month} fillOpacity={d.month === activeMonth ? 1 : 0.55} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver como tabela</summary>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-xs tabular-nums">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-left py-1 pr-2">Mês</th>
                <th className="text-right py-1 px-2">Recebido</th>
                <th className="text-right py-1 px-2">A receber</th>
                <th className="text-right py-1 px-2">Despesas</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.month} className={d.month === activeMonth ? "font-medium" : ""}>
                  <td className="py-1 pr-2">
                    <button type="button" className="hover:underline" onClick={() => onSelectMonth(d.month)}>{MONTHS_PT[d.month - 1]}</button>
                  </td>
                  <td className="text-right py-1 px-2">{formatBRL(d.received)}</td>
                  <td className="text-right py-1 px-2">{formatBRL(d.pending)}</td>
                  <td className="text-right py-1 px-2">{formatBRL(d.expenses)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
