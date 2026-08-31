// Parser iCalendar (RFC 5545) focado em UMA pergunta: "quando este
// calendário está ocupado?". SOMENTE rotas de servidor.
//
// Cobre o que os exports reais de iCloud/Apple, Google (endereço secreto
// .ics), Outlook e CalDAVs em geral produzem:
//   - DTSTART/DTEND com TZID, em UTC (sufixo Z), "flutuante" ou VALUE=DATE;
//   - DURATION no lugar de DTEND;
//   - RRULE com FREQ DAILY/WEEKLY/MONTHLY/YEARLY, INTERVAL, COUNT, UNTIL,
//     BYDAY (com ordinal em MONTHLY), BYMONTHDAY, BYMONTH;
//   - EXDATE e instâncias sobrescritas (RECURRENCE-ID);
//   - STATUS:CANCELLED e TRANSP:TRANSPARENT são ignorados (não ocupam).
//
// Sem dependência de propósito: a biblioteca `rrule` sozinha pesa mais que
// todo este arquivo, e o restante (parsing de linhas) é trivial. VTIMEZONE
// não é interpretado — TZIDs modernos são nomes IANA (que o Node conhece);
// os nomes do Windows/Outlook mais comuns têm tabela abaixo.

import {
  DEFAULT_TIMEZONE,
  ZonedParts,
  isValidTimeZone,
  wallClockToUtc,
} from "@/lib/server/tz";

export interface BusyInterval {
  start: Date;
  end: Date;
  allDay: boolean;
}

export interface ParseIcsOptions {
  /** Só ocorrências que tocam [from, to] entram no resultado. */
  from: Date;
  to: Date;
  /** Fuso para horários "flutuantes" e eventos de dia inteiro. */
  defaultTimeZone?: string;
  /** Teto de ocorrências geradas por evento recorrente. */
  maxOccurrencesPerEvent?: number;
}

// ── Tabela Windows → IANA (Outlook) ─────────────────────────────────────────

const WINDOWS_TZ: Record<string, string> = {
  "E. South America Standard Time": "America/Sao_Paulo",
  "Central Brazilian Standard Time": "America/Cuiaba",
  "Bahia Standard Time": "America/Bahia",
  "Tocantins Standard Time": "America/Araguaina",
  "SA Eastern Standard Time": "America/Cayenne",
  "SA Western Standard Time": "America/La_Paz",
  "Argentina Standard Time": "America/Argentina/Buenos_Aires",
  "Pacific SA Standard Time": "America/Santiago",
  "Montevideo Standard Time": "America/Montevideo",
  "Eastern Standard Time": "America/New_York",
  "Central Standard Time": "America/Chicago",
  "Mountain Standard Time": "America/Denver",
  "Pacific Standard Time": "America/Los_Angeles",
  "GMT Standard Time": "Europe/London",
  "W. Europe Standard Time": "Europe/Berlin",
  "Romance Standard Time": "Europe/Paris",
  "Central Europe Standard Time": "Europe/Budapest",
  "Central European Standard Time": "Europe/Warsaw",
  "GTB Standard Time": "Europe/Bucharest",
  "UTC": "UTC",
  "Coordinated Universal Time": "UTC",
};

function resolveTimeZone(tzid: string | undefined, fallback: string): string {
  if (!tzid) return fallback;
  // Alguns exports envolvem o TZID em aspas ou prefixam com "/".
  const clean = tzid.replace(/^"|"$/g, "").replace(/^\//, "");
  if (isValidTimeZone(clean)) return clean;
  const mapped = WINDOWS_TZ[clean];
  if (mapped) return mapped;
  // Ex.: "(UTC-03:00) Brasilia" — sem como resolver, usa o fuso do profissional.
  return fallback;
}

// ── Leitura de linhas ───────────────────────────────────────────────────────

interface Property {
  name: string;
  params: Record<string, string>;
  value: string;
}

/** Desdobra continuações (CRLF + espaço/tab) e separa em linhas lógicas. */
function unfold(text: string): string[] {
  return text
    .replace(/\r\n[ \t]/g, "")
    .replace(/\n[ \t]/g, "")
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
}

function parseProperty(line: string): Property | null {
  // Acha o primeiro ":" fora de aspas — antes dele ficam nome e parâmetros.
  let inQuotes = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ":" && !inQuotes) {
      colon = i;
      break;
    }
  }
  if (colon <= 0) return null;

  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [rawName, ...rawParams] = head.split(";");
  const params: Record<string, string> = {};
  for (const p of rawParams) {
    const eq = p.indexOf("=");
    if (eq <= 0) continue;
    params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: rawName.toUpperCase(), params, value };
}

// ── Datas ───────────────────────────────────────────────────────────────────

interface WallTime extends ZonedParts {
  allDay: boolean;
  /** "UTC", nome IANA, ou null para horário flutuante. */
  tz: string | null;
}

const DATE_RE = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/;

function parseDateValue(value: string, params: Record<string, string>, fallbackTz: string): WallTime | null {
  const m = DATE_RE.exec(value.trim());
  if (!m) return null;
  const allDay = params.VALUE === "DATE" || m[4] === undefined;
  const utc = m[7] === "Z";
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: allDay ? 0 : Number(m[4]),
    minute: allDay ? 0 : Number(m[5]),
    second: allDay ? 0 : Number(m[6] ?? 0),
    allDay,
    tz: allDay ? null : utc ? "UTC" : params.TZID ? resolveTimeZone(params.TZID, fallbackTz) : null,
  };
}

/** Chave de comparação para EXDATE / RECURRENCE-ID (ignora fuso de propósito). */
function wallKey(w: Pick<WallTime, "year" | "month" | "day" | "hour" | "minute" | "second" | "allDay">): string {
  const d = `${w.year}${String(w.month).padStart(2, "0")}${String(w.day).padStart(2, "0")}`;
  if (w.allDay) return d;
  return `${d}T${String(w.hour).padStart(2, "0")}${String(w.minute).padStart(2, "0")}${String(w.second).padStart(2, "0")}`;
}

function toInstant(w: WallTime, defaultTz: string): Date {
  if (w.allDay) return wallClockToUtc({ ...w, hour: 0, minute: 0, second: 0 }, defaultTz);
  if (w.tz === "UTC") return new Date(Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second));
  return wallClockToUtc(w, w.tz ?? defaultTz);
}

/** Aritmética em relógio de parede: trata os componentes como se fossem UTC. */
function wallToNaive(w: ZonedParts): Date {
  return new Date(Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second));
}

function naiveToWall(d: Date): ZonedParts {
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
  };
}

const DURATION_RE = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

function parseDurationMs(value: string): number | null {
  const m = DURATION_RE.exec(value.trim());
  if (!m) return null;
  const sign = m[1] === "-" ? -1 : 1;
  const weeks = Number(m[2] ?? 0);
  const days = Number(m[3] ?? 0);
  const hours = Number(m[4] ?? 0);
  const minutes = Number(m[5] ?? 0);
  const seconds = Number(m[6] ?? 0);
  return sign * (((weeks * 7 + days) * 24 + hours) * 3600 + minutes * 60 + seconds) * 1000;
}

// ── RRULE ───────────────────────────────────────────────────────────────────

const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

interface ByDay {
  ordinal: number | null;
  weekday: number;
}

interface Rule {
  freq: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
  count: number | null;
  until: WallTime | null;
  byDay: ByDay[];
  byMonthDay: number[];
  byMonth: number[];
  weekStart: number;
}

function parseRule(value: string, fallbackTz: string): Rule | null {
  const parts: Record<string, string> = {};
  for (const piece of value.split(";")) {
    const eq = piece.indexOf("=");
    if (eq <= 0) continue;
    parts[piece.slice(0, eq).toUpperCase()] = piece.slice(eq + 1);
  }
  const freq = parts.FREQ as Rule["freq"] | undefined;
  if (!freq || !["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) return null;

  const byDay: ByDay[] = [];
  for (const token of (parts.BYDAY ?? "").split(",").filter(Boolean)) {
    const m = /^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(token.trim().toUpperCase());
    if (!m) continue;
    byDay.push({ ordinal: m[1] ? Number(m[1]) : null, weekday: WEEKDAYS.indexOf(m[2]) });
  }

  return {
    freq,
    interval: Math.max(1, Number(parts.INTERVAL ?? 1) || 1),
    count: parts.COUNT ? Math.max(0, Number(parts.COUNT) || 0) : null,
    until: parts.UNTIL ? parseDateValue(parts.UNTIL, {}, fallbackTz) : null,
    byDay,
    byMonthDay: (parts.BYMONTHDAY ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n !== 0),
    byMonth: (parts.BYMONTH ?? "").split(",").map(Number).filter((n) => n >= 1 && n <= 12),
    weekStart: parts.WKST ? Math.max(0, WEEKDAYS.indexOf(parts.WKST.toUpperCase())) : 1,
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Datas (naive) de um mês que casam com BYDAY — com ou sem ordinal. */
function monthDatesByDay(year: number, month: number, byDay: ByDay[]): Date[] {
  const total = daysInMonth(year, month);
  const out: Date[] = [];
  for (const { ordinal, weekday } of byDay) {
    const matches: Date[] = [];
    for (let d = 1; d <= total; d++) {
      const date = new Date(Date.UTC(year, month - 1, d));
      if (date.getUTCDay() === weekday) matches.push(date);
    }
    if (ordinal === null) out.push(...matches);
    else if (ordinal > 0 && matches[ordinal - 1]) out.push(matches[ordinal - 1]);
    else if (ordinal < 0 && matches[matches.length + ordinal]) out.push(matches[matches.length + ordinal]);
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Gera os inícios (relógio de parede) das ocorrências de uma regra, em ordem,
 * até COUNT/UNTIL, até `stopAt` (naive) ou até o teto de segurança.
 */
function expandRule(start: ZonedParts, rule: Rule, stopAt: Date, cap: number): ZonedParts[] {
  const out: ZonedParts[] = [];
  const startNaive = wallToNaive(start);
  const untilNaive = rule.until ? wallToNaive(rule.until) : null;
  let generated = 0;

  const push = (d: Date): boolean => {
    if (d < startNaive) return true; // antes do DTSTART não conta
    if (untilNaive && d > untilNaive) return false;
    if (rule.count !== null && generated >= rule.count) return false;
    generated++;
    if (d <= stopAt) out.push(naiveToWall(d));
    return out.length < cap && d <= stopAt;
  };

  const withTime = (y: number, m: number, d: number) =>
    new Date(Date.UTC(y, m - 1, d, start.hour, start.minute, start.second));

  if (rule.freq === "DAILY") {
    for (let i = 0; i < cap * 4; i++) {
      const d = new Date(startNaive.getTime() + i * rule.interval * 86_400_000);
      if (!push(d)) break;
    }
    return out;
  }

  if (rule.freq === "WEEKLY") {
    const weekdays = rule.byDay.length > 0 ? rule.byDay.map((b) => b.weekday) : [startNaive.getUTCDay()];
    // Início da semana que contém o DTSTART, segundo WKST.
    const offsetToWeekStart = (startNaive.getUTCDay() - rule.weekStart + 7) % 7;
    const weekStart = new Date(startNaive.getTime() - offsetToWeekStart * 86_400_000);
    for (let week = 0; week < cap * 4; week++) {
      const base = new Date(weekStart.getTime() + week * rule.interval * 7 * 86_400_000);
      const candidates = weekdays
        .map((wd) => {
          const offset = (wd - rule.weekStart + 7) % 7;
          const d = new Date(base.getTime() + offset * 86_400_000);
          return withTime(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
        })
        .sort((a, b) => a.getTime() - b.getTime());
      let keepGoing = true;
      for (const c of candidates) {
        if (!push(c)) {
          keepGoing = false;
          break;
        }
      }
      if (!keepGoing) break;
    }
    return out;
  }

  if (rule.freq === "MONTHLY") {
    for (let i = 0; i < cap * 4; i++) {
      const monthIndex = start.month - 1 + i * rule.interval;
      const year = start.year + Math.floor(monthIndex / 12);
      const month = (monthIndex % 12) + 1;
      let candidates: Date[];
      if (rule.byMonthDay.length > 0) {
        const total = daysInMonth(year, month);
        candidates = rule.byMonthDay
          .map((d) => (d > 0 ? d : total + d + 1))
          .filter((d) => d >= 1 && d <= total)
          .map((d) => withTime(year, month, d));
      } else if (rule.byDay.length > 0) {
        candidates = monthDatesByDay(year, month, rule.byDay).map((d) =>
          withTime(year, month, d.getUTCDate())
        );
      } else {
        // Dia do DTSTART; meses mais curtos pulam (RFC 5545).
        candidates = start.day <= daysInMonth(year, month) ? [withTime(year, month, start.day)] : [];
      }
      let keepGoing = true;
      for (const c of candidates.sort((a, b) => a.getTime() - b.getTime())) {
        if (!push(c)) {
          keepGoing = false;
          break;
        }
      }
      if (!keepGoing) break;
      if (withTime(year, month, 1) > stopAt) break;
    }
    return out;
  }

  // YEARLY
  for (let i = 0; i < cap * 4; i++) {
    const year = start.year + i * rule.interval;
    const months = rule.byMonth.length > 0 ? rule.byMonth : [start.month];
    let candidates: Date[] = [];
    for (const month of months) {
      if (rule.byDay.length > 0) {
        candidates.push(
          ...monthDatesByDay(year, month, rule.byDay).map((d) => withTime(year, month, d.getUTCDate()))
        );
      } else if (start.day <= daysInMonth(year, month)) {
        candidates.push(withTime(year, month, start.day));
      }
    }
    candidates = candidates.sort((a, b) => a.getTime() - b.getTime());
    let keepGoing = true;
    for (const c of candidates) {
      if (!push(c)) {
        keepGoing = false;
        break;
      }
    }
    if (!keepGoing) break;
    if (withTime(year, 1, 1) > stopAt) break;
  }
  return out;
}

// ── Eventos ─────────────────────────────────────────────────────────────────

interface RawEvent {
  uid: string;
  start: WallTime;
  /** Duração em ms (já resolvida de DTEND ou DURATION). */
  durationMs: number;
  rule: Rule | null;
  exdates: Set<string>;
  recurrenceId: string | null;
  busy: boolean;
}

function collectEvents(lines: string[], defaultTz: string): RawEvent[] {
  const events: RawEvent[] = [];
  let current: Property[] | null = null;
  let depth = 0;

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper === "BEGIN:VEVENT") {
      current = [];
      depth = 0;
      continue;
    }
    if (!current) continue;
    // Componentes aninhados (VALARM) não interessam
    if (upper.startsWith("BEGIN:")) {
      depth++;
      continue;
    }
    if (upper.startsWith("END:") && depth > 0) {
      depth--;
      continue;
    }
    if (upper === "END:VEVENT") {
      const event = buildEvent(current, defaultTz);
      if (event) events.push(event);
      current = null;
      continue;
    }
    if (depth > 0) continue;
    const prop = parseProperty(line);
    if (prop) current.push(prop);
  }
  return events;
}

function buildEvent(props: Property[], defaultTz: string): RawEvent | null {
  const get = (name: string) => props.find((p) => p.name === name);

  const dtstart = get("DTSTART");
  if (!dtstart) return null;
  const start = parseDateValue(dtstart.value, dtstart.params, defaultTz);
  if (!start) return null;

  const status = get("STATUS")?.value.toUpperCase();
  const transp = get("TRANSP")?.value.toUpperCase();
  const busy = status !== "CANCELLED" && transp !== "TRANSPARENT";

  let durationMs: number | null = null;
  const dtend = get("DTEND");
  if (dtend) {
    const end = parseDateValue(dtend.value, dtend.params, defaultTz);
    if (end) {
      durationMs = toInstant(end, defaultTz).getTime() - toInstant(start, defaultTz).getTime();
    }
  }
  if (durationMs === null) {
    const duration = get("DURATION");
    if (duration) durationMs = parseDurationMs(duration.value);
  }
  if (durationMs === null) {
    // RFC 5545: sem DTEND/DURATION, dia inteiro dura 1 dia; com horário, 0.
    durationMs = start.allDay ? 86_400_000 : 0;
  }
  if (durationMs <= 0) return null;

  const rruleProp = get("RRULE");
  const rule = rruleProp ? parseRule(rruleProp.value, defaultTz) : null;

  const exdates = new Set<string>();
  for (const ex of props.filter((p) => p.name === "EXDATE")) {
    for (const piece of ex.value.split(",")) {
      const w = parseDateValue(piece, ex.params, defaultTz);
      if (w) exdates.add(wallKey({ ...w, allDay: start.allDay }));
    }
  }

  const rid = get("RECURRENCE-ID");
  const recurrence = rid ? parseDateValue(rid.value, rid.params, defaultTz) : null;

  return {
    uid: get("UID")?.value ?? `no-uid-${Math.random().toString(36).slice(2)}`,
    start,
    durationMs,
    rule,
    exdates,
    recurrenceId: recurrence ? wallKey({ ...recurrence, allDay: start.allDay }) : null,
    busy,
  };
}

// ── API pública ─────────────────────────────────────────────────────────────

const DEFAULT_MAX_OCCURRENCES = 730; // 2 anos de evento diário

/** Todos os intervalos ocupados que tocam a janela pedida. */
export function parseIcsBusy(text: string, options: ParseIcsOptions): BusyInterval[] {
  const defaultTz = isValidTimeZone(options.defaultTimeZone) ? options.defaultTimeZone : DEFAULT_TIMEZONE;
  const cap = options.maxOccurrencesPerEvent ?? DEFAULT_MAX_OCCURRENCES;
  const from = options.from.getTime();
  const to = options.to.getTime();

  const events = collectEvents(unfold(text), defaultTz);

  // Instâncias sobrescritas substituem a ocorrência original do mestre.
  const overridesByUid = new Map<string, Set<string>>();
  for (const ev of events) {
    if (!ev.recurrenceId) continue;
    const set = overridesByUid.get(ev.uid) ?? new Set<string>();
    set.add(ev.recurrenceId);
    overridesByUid.set(ev.uid, set);
  }

  // Ocorrências até 1 dia depois da janela cobrem eventos que começam antes
  // de `to` mas o cruzam; o filtro final corta o excesso.
  const stopAt = new Date(to + 86_400_000);
  const out: BusyInterval[] = [];

  const emit = (startWall: ZonedParts, ev: RawEvent) => {
    const wall: WallTime = { ...startWall, allDay: ev.start.allDay, tz: ev.start.tz };
    const start = toInstant(wall, defaultTz);
    const end = new Date(start.getTime() + ev.durationMs);
    if (end.getTime() <= from || start.getTime() >= to) return;
    out.push({ start, end, allDay: ev.start.allDay });
  };

  for (const ev of events) {
    if (!ev.busy) continue;

    if (ev.recurrenceId || !ev.rule) {
      emit(ev.start, ev);
      continue;
    }

    const skip = overridesByUid.get(ev.uid) ?? new Set<string>();
    for (const occurrence of expandRule(ev.start, ev.rule, stopAt, cap)) {
      const key = wallKey({ ...occurrence, allDay: ev.start.allDay });
      if (ev.exdates.has(key) || skip.has(key)) continue;
      emit(occurrence, ev);
    }
  }

  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}
