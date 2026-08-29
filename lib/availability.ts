import type { AvailabilitySlot } from "@/lib/data-service";

/**
 * Regras de leitura de um slot de disponibilidade.
 *
 * As colunas `start_time`/`end_time` são `time without time zone` no Postgres,
 * então o PostgREST devolve sempre "HH:MM:SS" — nunca "HH:MM". Antes deste
 * módulo cada tela interpretava o formato do seu jeito (uma comparava com
 * "00:00", outra com "00:00:00"), o que fazia o mesmo slot aparecer como
 * "Dia Inteiro" no dashboard e como "00:00:00 - 23:59:00" no perfil público.
 */

/** "09:00:00" | "09:00" → "09:00". Devolve "" para valor ausente/inválido. */
export function formatSlotTime(time?: string | null): string {
  if (!time) return "";
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return time;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

/** Slot que cobre o dia inteiro (00:00 → 23:59), independente do formato. */
export function isAllDaySlot(slot: Pick<AvailabilitySlot, "startTime" | "endTime">): boolean {
  return formatSlotTime(slot.startTime) === "00:00" && formatSlotTime(slot.endTime) === "23:59";
}

/** "09:00:00"-"18:00:00" → "09:00 - 18:00"; dia inteiro → "Dia inteiro". */
export function describeSlot(slot: Pick<AvailabilitySlot, "startTime" | "endTime">): string {
  if (isAllDaySlot(slot)) return "Dia inteiro";
  const start = formatSlotTime(slot.startTime);
  const end = formatSlotTime(slot.endTime);
  if (!start && !end) return "";
  return `${start} - ${end}`;
}

/**
 * `Date` local → "YYYY-MM-DD".
 *
 * NÃO use `new Date("2026-09-15").toISOString()`: a string sem horário é
 * interpretada como meia-noite UTC e, no fuso do Brasil (UTC-3), volta um dia
 * antes. Aqui a data é montada a partir dos componentes locais.
 */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "YYYY-MM-DD" (ou ISO completo) → `Date` no meio-dia local, imune a fuso. */
export function parseDateKey(date: string): Date {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

/** Chave de hoje, no fuso do usuário. */
export function todayKey(): string {
  return toDateKey(new Date());
}

/**
 * Todos os slots de um dia, ordenados por horário.
 *
 * O backend hoje mantém um slot por (profissional, data) — mas a listagem
 * pública usava `.find()`, que descartaria silenciosamente qualquer janela
 * extra caso essa restrição mude. Aqui devolvemos a lista inteira.
 */
export function slotsForDate(slots: AvailabilitySlot[], date: Date | string): AvailabilitySlot[] {
  const key = typeof date === "string" ? date.slice(0, 10) : toDateKey(date);
  return slots
    .filter((slot) => slot.date?.slice(0, 10) === key)
    .sort((a, b) => formatSlotTime(a.startTime).localeCompare(formatSlotTime(b.startTime)));
}

/** Conjunto de datas com disponibilidade — lookup O(1) por dia do calendário. */
export function availableDateKeys(slots: AvailabilitySlot[]): Set<string> {
  return new Set(slots.map((slot) => slot.date?.slice(0, 10)).filter(Boolean) as string[]);
}
