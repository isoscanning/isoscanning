"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FinancialRecord } from "@/lib/finances-service";
import { formatBRL, isoToBR } from "@/lib/finances/money";
import {
  ArrowUpDown,
  Check,
  Copy,
  FileText,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat,
  Trash2,
} from "lucide-react";
import { CATEGORY_LABELS, NF_LABELS, SOURCE_LABELS, statusClasses, statusLabel, totalsOf } from "./labels";

export type SortKey = "date" | "amount";

interface RecordsTableProps {
  records: FinancialRecord[];
  loading: boolean;
  hasAnyInMonth: boolean;
  selected: Set<string>;
  highlightId?: string | null;
  sort: SortKey;
  order: "asc" | "desc";
  onSortChange: (sort: SortKey, order: "asc" | "desc") => void;
  onToggleSelect: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onEdit: (r: FinancialRecord) => void;
  onDuplicate: (r: FinancialRecord) => void;
  onDelete: (r: FinancialRecord) => void;
  onReceive: (r: FinancialRecord) => void;
  onOpenNfFile: (r: FinancialRecord) => void;
  onNew: () => void;
}

export function RecordsTable(props: RecordsTableProps) {
  const { records, loading, hasAnyInMonth, selected, highlightId, sort, order, onSortChange } = props;
  const allSelected = records.length > 0 && records.every((r) => selected.has(r.id));
  const totals = totalsOf(records);

  const toggleSort = (key: SortKey) => {
    if (sort === key) onSortChange(key, order === "desc" ? "asc" : "desc");
    else onSortChange(key, "desc");
  };

  if (loading && records.length === 0) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Carregando lançamentos">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-14 border-dashed border-2 rounded-lg border-emerald-500/20">
        <div className="bg-emerald-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-emerald-500" />
        </div>
        <p className="text-lg font-medium">{hasAnyInMonth ? "Nada com esse filtro" : "Nenhum lançamento neste mês"}</p>
        <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
          {hasAnyInMonth ? "Troque o filtro ou limpe a busca." : "Registre o primeiro trabalho, mensalidade ou despesa do mês."}
        </p>
        {!hasAnyInMonth && (
          <Button className="mt-5 bg-emerald-600 hover:bg-emerald-700" onClick={props.onNew}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar primeiro lançamento
          </Button>
        )}
      </div>
    );
  }

  const Actions = ({ r, compact }: { r: FinancialRecord; compact?: boolean }) => (
    <div className="flex items-center gap-1">
      {r.status === "pending" && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => props.onReceive(r)}
          aria-label={r.type === "expense" ? "Marcar como pago" : "Confirmar recebimento"}
          title={r.type === "expense" ? "Marcar como pago" : "Confirmar recebimento"}
          className="h-8 w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
        >
          <Check className="h-4 w-4" />
        </Button>
      )}
      {r.hasNfFile && (
        <Button variant="ghost" size="icon" onClick={() => props.onOpenNfFile(r)} aria-label="Abrir arquivo da nota" title="Abrir arquivo da nota" className="h-8 w-8 text-muted-foreground hover:text-emerald-600">
          <FileText className="h-4 w-4" />
        </Button>
      )}
      {!compact && (
        <Button variant="ghost" size="icon" onClick={() => props.onEdit(r)} aria-label="Editar" title="Editar" className="h-8 w-8 text-muted-foreground hover:text-emerald-600">
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Mais ações" className="h-8 w-8 text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {compact && (
            <DropdownMenuItem onClick={() => props.onEdit(r)}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => props.onDuplicate(r)}><Copy className="mr-2 h-4 w-4" /> Duplicar</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-rose-600 focus:text-rose-600" onClick={() => props.onDelete(r)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const Badges = ({ r }: { r: FinancialRecord }) => (
    <span className="inline-flex items-center gap-1">
      {r.recurrenceActive && <Repeat className="h-3.5 w-3.5 text-muted-foreground" aria-label="Recorrente" />}
      {r.contractId && <Link2 className="h-3.5 w-3.5 text-muted-foreground" aria-label="Vinculado a contrato" />}
    </span>
  );

  const rowClass = (r: FinancialRecord) =>
    `${highlightId === r.id ? "bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/40" : ""} ${r.status === "cancelled" ? "opacity-60" : ""}`;

  return (
    <div className={`transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
            <tr>
              <th className="px-3 py-3 w-8">
                <Checkbox checked={allSelected} onCheckedChange={() => props.onToggleAll(records.map((r) => r.id))} aria-label="Selecionar todos" />
              </th>
              <th className="px-3 py-3">
                <button type="button" onClick={() => toggleSort("date")} className="inline-flex items-center gap-1 hover:text-foreground">
                  Data <ArrowUpDown className={`h-3 w-3 ${sort === "date" ? "text-emerald-500" : ""}`} />
                </button>
              </th>
              <th className="px-3 py-3">Lançamento</th>
              <th className="px-3 py-3">Origem</th>
              <th className="px-3 py-3">Situação</th>
              <th className="px-3 py-3">NF</th>
              <th className="px-3 py-3 text-right">
                <button type="button" onClick={() => toggleSort("amount")} className="inline-flex items-center gap-1 hover:text-foreground">
                  Valor <ArrowUpDown className={`h-3 w-3 ${sort === "amount" ? "text-emerald-500" : ""}`} />
                </button>
              </th>
              <th className="px-3 py-3 print:hidden">Ações</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} id={`lancamento-${r.id}`} className={`border-b last:border-0 hover:bg-muted/40 transition-colors ${rowClass(r)}`}>
                <td className="px-3 py-3 align-top">
                  <Checkbox checked={selected.has(r.id)} onCheckedChange={() => props.onToggleSelect(r.id)} aria-label={`Selecionar ${r.title}`} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap align-top tabular-nums">
                  {isoToBR(r.date)}
                  {r.status === "pending" && r.dueDate && (
                    <div className={`text-xs ${r.overdue ? "text-rose-600 font-medium" : "text-muted-foreground"}`}>vence {isoToBR(r.dueDate)}</div>
                  )}
                  {r.status === "received" && r.receivedAt && r.receivedAt !== r.date && (
                    <div className="text-xs text-muted-foreground">{r.type === "expense" ? "pago" : "recebido"} {isoToBR(r.receivedAt)}</div>
                  )}
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="font-medium flex items-center gap-1.5">{r.title} <Badges r={r} /></div>
                  <div className="text-xs text-muted-foreground">
                    {[r.clientName, r.category ? CATEGORY_LABELS[r.category] : null].filter(Boolean).join(" · ")}
                  </div>
                </td>
                <td className="px-3 py-3 align-top">
                  {r.type === "expense" ? (
                    <span className="px-2 py-1 bg-rose-500/10 text-rose-700 dark:text-rose-400 rounded-full text-xs">Despesa</span>
                  ) : (
                    <span className="px-2 py-1 bg-secondary rounded-full text-xs">{SOURCE_LABELS[r.source]}</span>
                  )}
                </td>
                <td className="px-3 py-3 align-top">
                  <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${statusClasses(r)}`}>{statusLabel(r)}</span>
                </td>
                <td className="px-3 py-3 align-top">
                  {r.type === "expense" || !r.requiresNf ? (
                    <span className="text-muted-foreground text-xs">—</span>
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${r.nfStatus === "issued" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-rose-500/10 text-rose-700 dark:text-rose-400"}`} title={r.nfNumber ?? undefined}>
                      {NF_LABELS[r.nfStatus]}{r.nfNumber ? ` · ${r.nfNumber}` : ""}
                    </span>
                  )}
                </td>
                <td className={`px-3 py-3 align-top text-right font-medium tabular-nums whitespace-nowrap ${r.type === "expense" ? "text-rose-600 dark:text-rose-400" : ""}`}>
                  {r.type === "expense" ? "− " : ""}{formatBRL(r.amount)}
                </td>
                <td className="px-3 py-2 align-top print:hidden">
                  <Actions r={r} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="text-sm bg-muted/30">
            <tr>
              <td colSpan={6} className="px-3 py-3 text-right text-muted-foreground">
                Receitas <span className="font-semibold text-foreground tabular-nums">{formatBRL(totals.income)}</span>
                {totals.expenses > 0 && (
                  <> · Despesas <span className="font-semibold text-rose-600 tabular-nums">{formatBRL(totals.expenses)}</span> · Saldo</>
                )}
              </td>
              <td className={`px-3 py-3 text-right font-bold tabular-nums ${totals.net < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {formatBRL(totals.expenses > 0 ? totals.net : totals.income)}
              </td>
              <td className="print:hidden" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile */}
      <ul className="md:hidden space-y-3">
        {records.map((r) => (
          <li key={r.id} id={`lancamento-m-${r.id}`} className={`rounded-xl border p-4 space-y-2 ${rowClass(r)}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <Checkbox className="mt-1" checked={selected.has(r.id)} onCheckedChange={() => props.onToggleSelect(r.id)} aria-label={`Selecionar ${r.title}`} />
                <div className="min-w-0">
                  <p className="font-medium leading-tight flex items-center gap-1.5">{r.title} <Badges r={r} /></p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[isoToBR(r.date), r.clientName, r.category ? CATEGORY_LABELS[r.category] : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <p className={`font-semibold tabular-nums whitespace-nowrap ${r.type === "expense" ? "text-rose-600" : ""}`}>
                {r.type === "expense" ? "− " : ""}{formatBRL(r.amount)}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-xs ${statusClasses(r)}`}>{statusLabel(r)}</span>
                {r.type === "income" && <span className="px-2 py-0.5 bg-secondary rounded-full text-xs">{SOURCE_LABELS[r.source]}</span>}
                {r.type === "income" && r.requiresNf && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${r.nfStatus === "issued" ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700"}`}>NF {NF_LABELS[r.nfStatus].toLowerCase()}</span>
                )}
                {r.status === "pending" && r.dueDate && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${r.overdue ? "bg-rose-500/10 text-rose-700" : "bg-muted text-muted-foreground"}`}>vence {isoToBR(r.dueDate)}</span>
                )}
              </div>
              <Actions r={r} compact />
            </div>
          </li>
        ))}
        <li className="rounded-xl bg-muted/30 p-3 text-sm text-right">
          Receitas <span className="font-semibold tabular-nums">{formatBRL(totals.income)}</span>
          {totals.expenses > 0 && <> · Despesas <span className="font-semibold text-rose-600 tabular-nums">{formatBRL(totals.expenses)}</span></>}
        </li>
      </ul>
    </div>
  );
}
