/** Utilidades de dinheiro do financeiro (pt-BR, centavos inteiros). */

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PLAIN = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatBRL(value: number | null | undefined): string {
  return BRL.format(Number(value ?? 0));
}

/** "1.500,50" (sem símbolo) a partir de um número. */
export function formatPlain(value: number | null | undefined): string {
  return PLAIN.format(Number(value ?? 0));
}

/** Máscara de centavos: só os dígitos digitados contam. "150050" → "1.500,50". */
export function formatCurrencyDigits(digits: string): string {
  const clean = digits.replace(/\D/g, "").slice(0, 13);
  if (!clean) return "";
  return PLAIN.format(parseInt(clean, 10) / 100);
}

/**
 * Texto do campo → número. Aceita "1.500,50", "1500,50", "R$ 1.500", "1500.50"
 * (colado): tudo vira dígitos e os dois últimos são os centavos.
 */
export function currencyToNumber(text: string | null | undefined): number | null {
  const digits = (text ?? "").replace(/\D/g, "").slice(0, 13);
  if (!digits) return null;
  return parseInt(digits, 10) / 100;
}

/** "2026-09-04" do dia LOCAL do navegador (não o dia UTC — A3 da auditoria). */
export function todayLocalIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "2026-09-04" → "04/09/2026" sem passar por Date (sem fuso). */
export function isoToBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** Soma dias a uma data AAAA-MM-DD (em UTC, sem fuso). */
export function addDaysIso(iso: string, days: number): string {
  const t = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(t)) return iso;
  return new Date(t + days * 86_400_000).toISOString().slice(0, 10);
}

export const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const MONTHS_PT_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
