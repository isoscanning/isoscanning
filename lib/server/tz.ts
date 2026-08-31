// Fuso horário sem dependências — SOMENTE rotas de servidor.
//
// Os horários da agenda são TIME sem fuso no banco, interpretados no fuso do
// profissional (availability_settings.timezone). Estas funções fazem a ponte
// entre "instante UTC" (o que Google/ICS entregam) e "data + minuto do dia"
// nesse fuso. Espelho reduzido do motor no backend
// (isoscanning-backend/src/modules/availability/domain/agenda.engine.ts).

export const MINUTES_IN_DAY = 24 * 60;
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function zonedParts(timezone: string, at: Date): ZonedParts {
  const tz = isValidTimeZone(timezone) ? timezone : "UTC";
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(at)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year ?? 1970,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    // Algumas versões do ICU devolvem 24 para meia-noite com hour12:false.
    hour: (parts.hour ?? 0) % 24,
    minute: parts.minute ?? 0,
    second: parts.second ?? 0,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function partsToDateKey(p: Pick<ZonedParts, "year" | "month" | "day">): string {
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Instante UTC → data e minuto do dia no fuso. */
export function utcToZoned(at: Date, timezone: string): { date: string; minutes: number } {
  const p = zonedParts(timezone, at);
  return { date: partsToDateKey(p), minutes: p.hour * 60 + p.minute };
}

export function nowInTimeZone(timezone: string, now: Date = new Date()): { date: string; minutes: number } {
  return utcToZoned(now, timezone);
}

function offsetMinutes(timezone: string, at: Date): number {
  const p = zonedParts(timezone, at);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return (asUtc - at.getTime()) / 60_000;
}

/**
 * Relógio de parede ("2026-09-15", 540 min) no fuso → instante UTC.
 * Duas passagens porque o offset depende do próprio instante (virada de
 * horário de verão).
 */
export function zonedToUtc(dateKey: string, minutes: number, timezone: string): Date {
  const [y, m, d] = dateKey.slice(0, 10).split("-").map(Number);
  const naive = Date.UTC(y, (m ?? 1) - 1, d ?? 1, Math.floor(minutes / 60), minutes % 60);
  let instant = new Date(naive - offsetMinutes(timezone, new Date(naive)) * 60_000);
  instant = new Date(naive - offsetMinutes(timezone, instant) * 60_000);
  return instant;
}

/** Mesmo que zonedToUtc, mas a partir de componentes soltos (segundos incluídos). */
export function wallClockToUtc(p: ZonedParts, timezone: string): Date {
  const naive = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  let instant = new Date(naive - offsetMinutes(timezone, new Date(naive)) * 60_000);
  instant = new Date(naive - offsetMinutes(timezone, instant) * 60_000);
  return instant;
}

export function addDaysToKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** 540 → "09:00"; 1440 → "23:59" (é assim que o banco representa fim de dia). */
export function minutesToDbTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(MINUTES_IN_DAY, Math.round(minutes)));
  if (clamped >= MINUTES_IN_DAY) return "23:59";
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}
