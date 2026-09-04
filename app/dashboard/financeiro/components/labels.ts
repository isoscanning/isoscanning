import type {
  FinancialCategory,
  FinancialRecord,
  FinancialRecordType,
  FinancialSource,
  FinancialStatus,
  NfStatus,
} from "@/lib/finances-service";

export const SOURCE_LABELS: Record<FinancialSource, string> = {
  internal: "Plataforma",
  external: "Externo",
};

export const NF_LABELS: Record<NfStatus, string> = {
  not_applicable: "Não se aplica",
  pending: "A emitir",
  issued: "Emitida",
};

export const CATEGORY_LABELS: Record<FinancialCategory, string> = {
  servico: "Serviço",
  produto: "Produto",
  aluguel_equipamento: "Aluguel de equipamento",
  equipamento: "Equipamento",
  deslocamento: "Deslocamento",
  software: "Software / assinaturas",
  freelancer: "Freelancer / equipe",
  imposto: "Imposto (DAS, ISS…)",
  aluguel: "Aluguel / estúdio",
  marketing: "Marketing / anúncios",
  alimentacao: "Alimentação",
  outros: "Outros",
};

export const INCOME_CATEGORIES: FinancialCategory[] = ["servico", "produto", "aluguel_equipamento", "outros"];
export const EXPENSE_CATEGORIES: FinancialCategory[] = [
  "equipamento", "deslocamento", "software", "freelancer", "imposto", "aluguel", "marketing", "alimentacao", "outros",
];

/** Emissor Nacional da NFS-e (obrigatório para MEI prestador de serviço). */
export const NFSE_NACIONAL_URL = "https://www.nfse.gov.br/EmissorNacional";
export const MEI_PORTAL_URL = "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor";

/** Rótulo do status conforme o tipo e o vencimento. */
export function statusLabel(r: Pick<FinancialRecord, "type" | "status" | "overdue">): string {
  if (r.status === "cancelled") return "Cancelado";
  if (r.type === "expense") return r.status === "received" ? "Pago" : r.overdue ? "Vencido" : "A pagar";
  return r.status === "received" ? "Recebido" : r.overdue ? "Vencido" : "A receber";
}

export function statusClasses(r: Pick<FinancialRecord, "type" | "status" | "overdue">): string {
  if (r.status === "cancelled") return "bg-muted text-muted-foreground line-through";
  if (r.status === "received") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (r.overdue) return "bg-rose-500/10 text-rose-700 dark:text-rose-400";
  return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
}

export function statusOptions(type: FinancialRecordType): Array<{ value: FinancialStatus; label: string }> {
  return type === "expense"
    ? [
        { value: "received", label: "Pago" },
        { value: "pending", label: "A pagar" },
        { value: "cancelled", label: "Cancelado" },
      ]
    : [
        { value: "received", label: "Recebido" },
        { value: "pending", label: "A receber" },
        { value: "cancelled", label: "Cancelado" },
      ];
}

export type FilterKey = "todos" | "pendentes" | "vencidos" | "recebidos" | "nf" | "despesas" | "plataforma" | "externo" | "cancelados";

export const FILTER_CHIPS: Array<{ key: FilterKey; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "pendentes", label: "A receber" },
  { key: "vencidos", label: "Vencidos" },
  { key: "recebidos", label: "Recebidos" },
  { key: "nf", label: "NF a emitir" },
  { key: "despesas", label: "Despesas" },
  { key: "plataforma", label: "Plataforma" },
  { key: "externo", label: "Externo" },
  { key: "cancelados", label: "Cancelados" },
];

export function isFilterKey(value: string | null | undefined): value is FilterKey {
  return !!value && FILTER_CHIPS.some((c) => c.key === value);
}

export function applyFilter(records: FinancialRecord[], key: FilterKey, search: string): FinancialRecord[] {
  const q = search.trim().toLowerCase();
  return records.filter((r) => {
    if (q) {
      const hay = `${r.title} ${r.description ?? ""} ${r.clientName ?? ""} ${r.nfNumber ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    switch (key) {
      case "pendentes":
        return r.type === "income" && r.status === "pending";
      case "vencidos":
        return r.status === "pending" && r.overdue;
      case "recebidos":
        return r.type === "income" && r.status === "received";
      case "nf":
        return r.type === "income" && r.status !== "cancelled" && r.requiresNf && r.nfStatus === "pending";
      case "despesas":
        return r.type === "expense";
      case "plataforma":
        return r.source === "internal" && r.type === "income";
      case "externo":
        return r.source === "external" && r.type === "income";
      case "cancelados":
        return r.status === "cancelled";
      default:
        return r.status !== "cancelled";
    }
  });
}

/** Totais do que está na tela (sem cancelados). */
export function totalsOf(records: FinancialRecord[]) {
  let income = 0;
  let expenses = 0;
  for (const r of records) {
    if (r.status === "cancelled") continue;
    if (r.type === "expense") expenses += r.amount;
    else income += r.amount;
  }
  return { income, expenses, net: income - expenses };
}

/** Teto proporcional no ano de abertura do MEI (mesma regra do backend). */
export function meiLimitForYear(annualLimit: number, meiOpenedAt: string | null, year: number): number {
  if (!meiOpenedAt) return annualLimit;
  const [oy, om] = meiOpenedAt.slice(0, 10).split("-").map(Number);
  if (!oy || !om || oy !== year) return annualLimit;
  return Math.round((annualLimit / 12) * (12 - om + 1) * 100) / 100;
}

export function errorMessage(error: unknown, fallback: string): string {
  const e = error as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = e?.response?.data?.message;
  if (Array.isArray(m)) return m.join(". ");
  if (typeof m === "string" && m) return m;
  return fallback;
}
