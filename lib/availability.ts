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

/** "2026-09-15" + 3 → "2026-09-18". Aritmética em UTC para não sofrer com fuso. */
export function addDaysToKey(date: string, days: number): string {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  const utc = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

// ── Dias de atendimento (perfil público) ────────────────────────────────────

export interface WeeklyPatternWindow {
  start: string;
  end: string;
}

export interface WeeklyPatternDayInput {
  weekday: number;
  windows: WeeklyPatternWindow[];
}

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** "24:00" é a representação do motor para fim do dia. */
function windowLabel(w: WeeklyPatternWindow): string {
  if (w.start === "00:00" && (w.end === "24:00" || w.end === "23:59")) return "dia inteiro";
  return `${w.start}–${w.end === "24:00" ? "23:59" : w.end}`;
}

export function describeWindows(windows: WeeklyPatternWindow[]): string {
  return windows.map(windowLabel).join(" e ");
}

/**
 * "Seg a Sex 09:00–18:00 · Sáb 09:00–12:00": agrupa dias consecutivos com o
 * mesmo horário. É o texto que o perfil público mostra como "Atende …".
 */
export function formatWeeklyPattern(pattern: WeeklyPatternDayInput[]): string {
  const days = [...pattern]
    .filter((d) => d.windows.length > 0)
    .sort((a, b) => a.weekday - b.weekday);
  if (days.length === 0) return "";

  const groups: { from: number; to: number; label: string }[] = [];
  for (const day of days) {
    const label = describeWindows(day.windows);
    const last = groups[groups.length - 1];
    if (last && last.label === label && day.weekday === last.to + 1) {
      last.to = day.weekday;
    } else {
      groups.push({ from: day.weekday, to: day.weekday, label });
    }
  }

  return groups
    .map((g) => {
      const span = g.to - g.from;
      const name =
        span === 0
          ? WEEKDAY_SHORT[g.from]
          : span === 1
            ? `${WEEKDAY_SHORT[g.from]} e ${WEEKDAY_SHORT[g.to]}`
            : `${WEEKDAY_SHORT[g.from]} a ${WEEKDAY_SHORT[g.to]}`;
      return `${name} ${g.label}`;
    })
    .join(" · ");
}

