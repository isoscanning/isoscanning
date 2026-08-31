// Motor de sincronização de calendários externos → calendar_busy.
// SOMENTE rotas de servidor, sempre com o client service role.
//
// Para cada conexão (Google OAuth ou link .ics):
//   1. busca os intervalos ocupados na janela [hoje-1, hoje+180 dias];
//   2. converte para linhas (data, início, fim) no fuso do profissional,
//      quebrando eventos que atravessam a meia-noite;
//   3. apaga o que havia da conexão nessa janela e grava o novo conjunto.
//
// Apagar-e-reescrever é idempotente e imune a eventos removidos/movidos no
// calendário de origem — não há estado incremental para corromper. Só
// horários são gravados; título/descrição nunca chegam aqui.

import { createHash } from "crypto";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { decryptField, encryptField, isEncryptionConfigured } from "@/lib/server/crypto";
import {
  DEFAULT_TIMEZONE,
  MINUTES_IN_DAY,
  addDaysToKey,
  isValidTimeZone,
  minutesToDbTime,
  nowInTimeZone,
  utcToZoned,
  zonedToUtc,
} from "@/lib/server/tz";
import {
  GoogleApiError,
  fetchGoogleFreeBusy,
  getGoogleConfig,
  refreshGoogleToken,
} from "@/lib/server/google-calendar";
import { BusyInterval, parseIcsBusy } from "@/lib/server/ics-parse";

export const SYNC_PAST_DAYS = 1;
export const SYNC_HORIZON_DAYS = 180;

/** Link .ics maior que isto é recusado (proteção contra abuso). */
const MAX_ICS_BYTES = 5 * 1024 * 1024;
const ICS_FETCH_TIMEOUT_MS = 25_000;
const INSERT_CHUNK = 500;

export type CalendarProvider = "google" | "ics";

export interface CalendarConnectionRow {
  id: string;
  professional_id: string;
  provider: CalendarProvider;
  label: string | null;
  external_account_id: string;
  calendar_ids: string[] | null;
  ics_url: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  sync_enabled: boolean;
  last_synced_at: string | null;
  last_error: string | null;
  status: "active" | "error" | "revoked";
  created_at: string;
  updated_at: string | null;
}

/** Linha já com os segredos em claro (nunca sai do servidor). */
export type CalendarConnection = CalendarConnectionRow;

export interface SyncResult {
  connectionId: string;
  provider: CalendarProvider;
  label: string | null;
  busyRows: number;
  from: string;
  to: string;
  warnings: string[];
  error?: string;
}

// ── Segredos ────────────────────────────────────────────────────────────────

export function sealSecret(value: string): string {
  const sealed = encryptField(value);
  if (!sealed) throw new Error("Valor vazio não pode ser cifrado.");
  return sealed;
}

/** Identidade estável de um link .ics: hash da URL (a URL em si é segredo). */
export function icsAccountId(url: string): string {
  return createHash("sha256").update(url.trim()).digest("hex").slice(0, 32);
}

function unseal(row: CalendarConnectionRow): CalendarConnection {
  return {
    ...row,
    ics_url: decryptField(row.ics_url),
    access_token: decryptField(row.access_token),
    refresh_token: decryptField(row.refresh_token),
  };
}

// ── Leitura ─────────────────────────────────────────────────────────────────

export async function loadConnection(
  admin: SupabaseClient,
  id: string
): Promise<{ connection: CalendarConnection | null; error: PostgrestError | null }> {
  const { data, error } = await admin.from("calendar_connections").select("*").eq("id", id).maybeSingle();
  if (error || !data) return { connection: null, error: error ?? null };
  return { connection: unseal(data as CalendarConnectionRow), error: null };
}

export async function loadProfessionalConnections(
  admin: SupabaseClient,
  professionalId: string
): Promise<{ connections: CalendarConnection[]; error: PostgrestError | null }> {
  const { data, error } = await admin
    .from("calendar_connections")
    .select("*")
    .eq("professional_id", professionalId)
    .order("created_at", { ascending: true });
  if (error) return { connections: [], error };
  return { connections: ((data ?? []) as CalendarConnectionRow[]).map(unseal), error: null };
}

/** Só o que o cron deve tocar: ligadas e não revogadas. */
export async function loadActiveConnections(
  admin: SupabaseClient
): Promise<{ connections: CalendarConnection[]; error: PostgrestError | null }> {
  const { data, error } = await admin
    .from("calendar_connections")
    .select("*")
    .eq("sync_enabled", true)
    .neq("status", "revoked")
    .order("last_synced_at", { ascending: true, nullsFirst: true });
  if (error) return { connections: [], error };
  return { connections: ((data ?? []) as CalendarConnectionRow[]).map(unseal), error: null };
}

export async function getProfessionalTimezone(admin: SupabaseClient, professionalId: string): Promise<string> {
  const { data } = await admin
    .from("availability_settings")
    .select("timezone")
    .eq("professional_id", professionalId)
    .maybeSingle();
  const tz = (data as { timezone?: string } | null)?.timezone;
  return isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE;
}

// ── Busca de ocupação por provedor ──────────────────────────────────────────

async function ensureGoogleAccessToken(
  admin: SupabaseClient,
  conn: CalendarConnection
): Promise<string> {
  const config = getGoogleConfig();
  if (!config) throw new Error("Google Agenda não configurado no servidor.");
  if (!conn.refresh_token) throw new GoogleApiError("Conexão sem refresh_token — reconecte a conta.", 401, "invalid_grant");

  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  // 2 minutos de folga: o token pode expirar no meio das chamadas.
  if (conn.access_token && expiresAt - Date.now() > 2 * 60_000) return conn.access_token;

  const refreshed = await refreshGoogleToken(config, conn.refresh_token);
  await admin
    .from("calendar_connections")
    .update({
      access_token: sealSecret(refreshed.accessToken),
      token_expires_at: refreshed.expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conn.id);
  return refreshed.accessToken;
}

export function normalizeIcsUrl(raw: string): string {
  const trimmed = raw.trim();
  // Apple/Outlook entregam webcal:// — é HTTPS com outro nome.
  const https = trimmed.replace(/^webcals?:\/\//i, "https://");
  const url = new URL(https); // lança se inválida
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("O link precisa começar com https:// ou webcal://");
  }
  return url.toString();
}

export async function fetchIcsText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "IsoScanning-Calendar/1.0 (+https://www.isoscanning.com)",
      Accept: "text/calendar, text/plain;q=0.8, */*;q=0.5",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(ICS_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`O calendário respondeu ${res.status} — confira se o link continua válido.`);
  }
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_ICS_BYTES) throw new Error("Arquivo .ics grande demais (máx. 5 MB).");
  const text = await res.text();
  if (text.length > MAX_ICS_BYTES) throw new Error("Arquivo .ics grande demais (máx. 5 MB).");
  if (!/BEGIN:VCALENDAR/i.test(text)) {
    throw new Error("O link não devolveu um calendário .ics (BEGIN:VCALENDAR ausente).");
  }
  return text;
}

async function fetchBusyIntervals(
  admin: SupabaseClient,
  conn: CalendarConnection,
  window: { from: Date; to: Date },
  timezone: string
): Promise<{ intervals: BusyInterval[]; warnings: string[] }> {
  if (conn.provider === "google") {
    const accessToken = await ensureGoogleAccessToken(admin, conn);
    const { busy, errors } = await fetchGoogleFreeBusy({
      accessToken,
      calendarIds: conn.calendar_ids?.length ? conn.calendar_ids : ["primary"],
      timeMin: window.from,
      timeMax: window.to,
      timeZone: timezone,
    });
    return {
      intervals: busy.map((b) => ({ ...b, allDay: false })),
      warnings: errors,
    };
  }

  if (!conn.ics_url) throw new Error("Conexão .ics sem URL.");
  const text = await fetchIcsText(conn.ics_url);
  return {
    intervals: parseIcsBusy(text, { from: window.from, to: window.to, defaultTimeZone: timezone }),
    warnings: [],
  };
}

// ── Conversão para linhas por dia ───────────────────────────────────────────

export interface BusyRow {
  connection_id: string;
  professional_id: string;
  date: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
}

interface DaySpan {
  from: number;
  to: number;
  allDay: boolean;
}

/**
 * Intervalos UTC → linhas (data, HH:MM, HH:MM) no fuso, uma por dia tocado,
 * já unidas quando se sobrepõem. Recortadas em [fromKey, toKey].
 */
export function busyIntervalsToRows(
  intervals: BusyInterval[],
  params: { connectionId: string; professionalId: string; timezone: string; fromKey: string; toKey: string }
): BusyRow[] {
  const byDate = new Map<string, DaySpan[]>();

  for (const interval of intervals) {
    const startZ = utcToZoned(interval.start, params.timezone);
    // Fim exclusivo: um evento que termina exatamente à meia-noite não toca o dia seguinte.
    const endInstant = new Date(interval.end.getTime() - 1);
    const endZ = utcToZoned(endInstant, params.timezone);
    const endMinutes = endZ.minutes + 1;

    let cursor = startZ.date;
    while (cursor <= endZ.date) {
      if (cursor >= params.fromKey && cursor <= params.toKey) {
        const from = cursor === startZ.date ? startZ.minutes : 0;
        const to = cursor === endZ.date ? Math.min(endMinutes, MINUTES_IN_DAY) : MINUTES_IN_DAY;
        if (to > from) {
          const list = byDate.get(cursor) ?? [];
          list.push({ from, to, allDay: interval.allDay || (from === 0 && to === MINUTES_IN_DAY) });
          byDate.set(cursor, list);
        }
      }
      if (cursor > params.toKey) break;
      cursor = addDaysToKey(cursor, 1);
    }
  }

  const rows: BusyRow[] = [];
  for (const [date, spans] of byDate) {
    const sorted = spans.sort((a, b) => a.from - b.from || a.to - b.to);
    const merged: DaySpan[] = [];
    for (const span of sorted) {
      const last = merged[merged.length - 1];
      if (last && span.from <= last.to) {
        last.to = Math.max(last.to, span.to);
        last.allDay = last.allDay || span.allDay || (last.from === 0 && last.to === MINUTES_IN_DAY);
      } else {
        merged.push({ ...span });
      }
    }
    for (const span of merged) {
      rows.push({
        connection_id: params.connectionId,
        professional_id: params.professionalId,
        date,
        start_time: minutesToDbTime(span.from),
        end_time: minutesToDbTime(span.to),
        all_day: span.allDay,
      });
    }
  }

  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
}

// ── Sync ────────────────────────────────────────────────────────────────────

function describeError(err: unknown): { message: string; revoked: boolean } {
  if (err instanceof GoogleApiError) {
    const revoked = err.code === "invalid_grant" || err.status === 401;
    return {
      message: revoked ? "Acesso ao Google revogado ou expirado — reconecte a conta." : err.message,
      revoked,
    };
  }
  if (err instanceof Error) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return { message: "O calendário demorou demais para responder.", revoked: false };
    }
    return { message: err.message, revoked: false };
  }
  return { message: "Erro desconhecido.", revoked: false };
}

export async function syncConnection(admin: SupabaseClient, conn: CalendarConnection): Promise<SyncResult> {
  const timezone = await getProfessionalTimezone(admin, conn.professional_id);
  const today = nowInTimeZone(timezone).date;
  const fromKey = addDaysToKey(today, -SYNC_PAST_DAYS);
  const toKey = addDaysToKey(today, SYNC_HORIZON_DAYS);

  const base: SyncResult = {
    connectionId: conn.id,
    provider: conn.provider,
    label: conn.label,
    busyRows: 0,
    from: fromKey,
    to: toKey,
    warnings: [],
  };

  try {
    const window = {
      from: zonedToUtc(fromKey, 0, timezone),
      to: zonedToUtc(addDaysToKey(toKey, 1), 0, timezone),
    };
    const { intervals, warnings } = await fetchBusyIntervals(admin, conn, window, timezone);
    const rows = busyIntervalsToRows(intervals, {
      connectionId: conn.id,
      professionalId: conn.professional_id,
      timezone,
      fromKey,
      toKey,
    });

    const { error: deleteError } = await admin
      .from("calendar_busy")
      .delete()
      .eq("connection_id", conn.id)
      .gte("date", fromKey)
      .lte("date", toKey);
    if (deleteError) throw new Error(`Falha ao limpar ocupação anterior: ${deleteError.message}`);

    for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
      const { error: insertError } = await admin.from("calendar_busy").insert(rows.slice(i, i + INSERT_CHUNK));
      if (insertError) throw new Error(`Falha ao gravar ocupação: ${insertError.message}`);
    }

    await admin
      .from("calendar_connections")
      .update({
        last_synced_at: new Date().toISOString(),
        last_error: warnings.length ? warnings.join("; ").slice(0, 500) : null,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conn.id);

    return { ...base, busyRows: rows.length, warnings };
  } catch (err) {
    const { message, revoked } = describeError(err);
    console.error(`calendar-sync: falha na conexão ${conn.id} (${conn.provider}):`, err);
    await admin
      .from("calendar_connections")
      .update({
        last_error: message.slice(0, 500),
        status: revoked ? "revoked" : "error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conn.id);
    return { ...base, error: message };
  }
}

export async function syncConnections(admin: SupabaseClient, connections: CalendarConnection[]): Promise<{
  results: SyncResult[];
  synced: number;
  failed: number;
}> {
  const results: SyncResult[] = [];
  for (const conn of connections) {
    // Uma conexão quebrada não pode travar as demais — syncConnection já engole o erro.
    results.push(await syncConnection(admin, conn));
  }
  return {
    results,
    synced: results.filter((r) => !r.error).length,
    failed: results.filter((r) => r.error).length,
  };
}

/** Pré-requisito comum às rotas de conexão. */
export function encryptionReady(): boolean {
  return isEncryptionConfigured();
}
