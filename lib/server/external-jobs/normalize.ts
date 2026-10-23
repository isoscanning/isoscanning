// Normalização das vagas externas vindas das APIs (SQL 83) — SOMENTE servidor.

import type { ExternalJobSource, ExternalJobType } from "@/lib/external-jobs/types";

/** Formato único que cada conector devolve, antes da classificação por IA. */
export interface RawExternalJob {
  source: ExternalJobSource;
  sourceLabel: string;
  externalId: string;
  externalUrl: string;
  title: string;
  companyName: string | null;
  description: string | null;
  /** Local como veio da origem ("São Paulo, SP"); a IA separa cidade/UF. */
  locationText: string | null;
  jobTypeHint: ExternalJobType | null;
  salaryText: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  postedAt: string | null;
  raw: unknown;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " ",
};

export function stripHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncate(text: string | null | undefined, max: number): string | null {
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function fold(text: string | null | undefined): string {
  return (text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Mesma vaga publicada em 2 agregadores → mesmo fingerprint. */
export function fingerprintOf(title: string, company: string | null, location: string | null): string {
  return [fold(title), fold(company), fold(location).split(" ")[0] ?? ""].join("|");
}

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB",
  "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export function normalizeUf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const uf = value.trim().toUpperCase();
  return (UFS as readonly string[]).includes(uf) ? uf : null;
}

export const JOB_TYPES: readonly ExternalJobType[] = ["freelance", "full_time", "part_time", "project"];

export function normalizeJobType(value: unknown): ExternalJobType | null {
  return typeof value === "string" && (JOB_TYPES as readonly string[]).includes(value)
    ? (value as ExternalJobType)
    : null;
}

export function formatSalary(min: number | null, max: number | null): string | null {
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  if (min && max && min !== max) return `${brl(min)} – ${brl(max)}`;
  if (min || max) return brl((min || max) as number);
  return null;
}

/** Só http(s) — evita javascript: e afins vindos de texto colado ou da IA. */
export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Termos que indicam vaga FORA do nicho mesmo tendo casado com a busca
 * ("vendedor de câmeras", "técnico de CFTV"...). Descarta antes de gastar IA.
 * Olha só o TÍTULO: a descrição de uma vaga boa pode citar esses termos.
 */
const BLOCKLIST = [
  "vendedor", "vendedora", "representante comercial", "consultor de vendas", "operador de caixa",
  "cftv", "camera de seguranca", "câmera de segurança", "vigilante", "porteiro",
  "radiologia", "raio x", "raio-x", "tomografia", "ultrassom", "mamografia",
  "estoquista", "repositor", "motorista", "entregador", "telemarketing",
];

export function isBlocked(title: string): boolean {
  const text = fold(title);
  return BLOCKLIST.some((term) => text.includes(fold(term)));
}
