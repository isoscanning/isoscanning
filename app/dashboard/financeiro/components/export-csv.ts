import type { FinancialRecord } from "@/lib/finances-service";
import { isoToBR } from "@/lib/finances/money";
import { CATEGORY_LABELS, NF_LABELS, SOURCE_LABELS, statusLabel } from "./labels";

/** CSV para Excel em português: BOM UTF-8, separador ";", vírgula decimal. */
export function buildFinanceCsv(records: FinancialRecord[]): string {
  const escapeCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const header = [
    "Data", "Tipo", "Título", "Cliente/Fornecedor", "Categoria", "Descrição", "Valor (R$)", "Origem",
    "Situação", "Vencimento", "Recebido/Pago em", "Exige NF", "Situação NF", "Nº NF", "NF emitida em", "Dados NF", "Recorrente", "Contrato",
  ];
  const rows = records.map((r) => [
    isoToBR(r.date),
    r.type === "expense" ? "Despesa" : "Receita",
    r.title,
    r.clientName ?? "",
    r.category ? CATEGORY_LABELS[r.category] : "",
    r.description ?? "",
    (r.type === "expense" ? -r.amount : r.amount).toFixed(2).replace(".", ","),
    r.type === "expense" ? "" : SOURCE_LABELS[r.source],
    statusLabel(r),
    isoToBR(r.dueDate),
    isoToBR(r.receivedAt),
    r.type === "expense" ? "" : r.requiresNf ? "Sim" : "Não",
    r.type === "expense" || !r.requiresNf ? "" : NF_LABELS[r.nfStatus],
    r.nfNumber ?? "",
    isoToBR(r.nfIssuedAt),
    r.nfDetails ?? "",
    r.recurrenceActive ? "Sim" : "",
    r.contractId ?? "",
  ]);
  return "﻿" + [header, ...rows].map((row) => row.map(escapeCell).join(";")).join("\r\n");
}

export function downloadTextFile(filename: string, content: string, type = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
