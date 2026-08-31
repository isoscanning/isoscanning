// Envio da agenda IsoScanning → Google (a "volta" da sincronização).
// SOMENTE rotas de servidor, sempre com o client service role.
//
// O app cria um calendário secundário "IsoScanning" na conta Google do
// profissional (escopo calendar.app.created: só enxerga calendários criados
// por ele) e espelha lá compromissos pessoais e agendamentos. O diff usa a
// tabela calendar_push_map (item local → evento Google + hash do conteúdo):
// só o que mudou vira chamada à API; o que sumiu aqui é apagado lá.
//
// Sem eco com a importação: o free/busy lê o calendário 'primary', nunca o
// calendário criado pelo app.

import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  GoogleApiError,
  GoogleEventPayload,
  createGoogleCalendar,
  deleteGoogleCalendar,
  deleteGoogleEvent,
  insertGoogleEvent,
  patchGoogleEvent,
} from "@/lib/server/google-calendar";
import {
  CalendarConnection,
  SYNC_HORIZON_DAYS,
  SYNC_PAST_DAYS,
  ensureGoogleAccessToken,
  getProfessionalTimezone,
} from "@/lib/server/calendar-sync";
import { addDaysToKey, nowInTimeZone, zonedToUtc, MINUTES_IN_DAY } from "@/lib/server/tz";

export const PUSH_CALENDAR_NAME = "IsoScanning";

/** Duração assumida de um agendamento (a tabela só guarda o início). */
const BOOKING_DURATION_MINUTES = 120;

// ── Itens locais → payloads do Google ───────────────────────────────────────

export interface LocalEventRow {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  blocks_agenda: boolean;
}

export interface LocalBookingRow {
  id: string;
  date: string;
  start_time: string;
  status: string;
  service_type: string | null;
  client_name: string | null;
  location: string | null;
}

export interface PushItem {
  /** 'event:<uuid>' | 'booking:<uuid>' */
  key: string;
  payload: GoogleEventPayload;
  hash: string;
}

function toMinutes(time: string | null): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!m) return null;
  const total = Number(m[1]) * 60 + Number(m[2]);
  return total === 23 * 60 + 59 ? MINUTES_IN_DAY : total;
}

/** JSON com chaves ordenadas — hash estável entre execuções. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export function payloadHash(payload: GoogleEventPayload): string {
  return createHash("sha256").update(canonical(payload)).digest("hex").slice(0, 32);
}

function timedRange(
  startDate: string,
  startMinutes: number,
  endDate: string,
  endMinutes: number,
  timezone: string
): Pick<GoogleEventPayload, "start" | "end"> {
  return {
    start: { dateTime: zonedToUtc(startDate, startMinutes, timezone).toISOString(), timeZone: timezone },
    end: { dateTime: zonedToUtc(endDate, endMinutes, timezone).toISOString(), timeZone: timezone },
  };
}

export function buildPushItems(params: {
  events: LocalEventRow[];
  bookings: LocalBookingRow[];
  timezone: string;
}): PushItem[] {
  const items: PushItem[] = [];

  for (const ev of params.events) {
    const start = toMinutes(ev.start_time);
    const end = toMinutes(ev.end_time);
    let payload: GoogleEventPayload;
    const base = {
      summary: ev.title,
      description: [ev.description, "Criado no IsoScanning."].filter(Boolean).join("\n\n"),
      location: ev.location ?? undefined,
      transparency: (ev.blocks_agenda ? "opaque" : "transparent") as "opaque" | "transparent",
    };
    if (ev.all_day || start === null || end === null) {
      // Dia inteiro: fim EXCLUSIVO no Google (+1 dia)
      payload = { ...base, start: { date: ev.date }, end: { date: addDaysToKey(ev.end_date, 1) } };
    } else {
      payload = { ...base, ...timedRange(ev.date, start, ev.end_date, end, params.timezone) };
    }
    items.push({ key: `event:${ev.id}`, payload, hash: payloadHash(payload) });
  }

  for (const bk of params.bookings) {
    const start = toMinutes(bk.start_time);
    if (start === null) continue;
    const end = Math.min(start + BOOKING_DURATION_MINUTES, MINUTES_IN_DAY);
    const status = bk.status === "confirmed" ? "Confirmado" : "Pendente";
    const payload: GoogleEventPayload = {
      summary: `${bk.service_type || "Serviço"} — ${bk.client_name || "cliente"} (${status})`,
      description: "Agendamento via IsoScanning.",
      location: bk.location ?? undefined,
      transparency: "opaque",
      ...timedRange(bk.date, start, bk.date, end, params.timezone),
    };
    items.push({ key: `booking:${bk.id}`, payload, hash: payloadHash(payload) });
  }

  return items;
}

// ── Diff contra o mapa ──────────────────────────────────────────────────────

export interface PushMapRow {
  item_key: string;
  google_event_id: string;
  content_hash: string;
}

export interface PushDiff {
  inserts: PushItem[];
  updates: { item: PushItem; googleEventId: string }[];
  deletes: { itemKey: string; googleEventId: string }[];
  unchanged: number;
}

export function diffPush(items: PushItem[], mapRows: PushMapRow[]): PushDiff {
  const byKey = new Map(mapRows.map((row) => [row.item_key, row]));
  const diff: PushDiff = { inserts: [], updates: [], deletes: [], unchanged: 0 };

  for (const item of items) {
    const existing = byKey.get(item.key);
    if (!existing) {
      diff.inserts.push(item);
    } else if (existing.content_hash !== item.hash) {
      diff.updates.push({ item, googleEventId: existing.google_event_id });
      byKey.delete(item.key);
    } else {
      diff.unchanged++;
      byKey.delete(item.key);
    }
  }
  // O que sobrou no mapa não existe mais localmente (ou saiu da janela)
  for (const row of byKey.values()) {
    diff.deletes.push({ itemKey: row.item_key, googleEventId: row.google_event_id });
  }
  return diff;
}

// ── Execução ────────────────────────────────────────────────────────────────

export interface PushResult {
  connectionId: string;
  inserted: number;
  updated: number;
  deleted: number;
  unchanged: number;
  skipped?: boolean;
  error?: string;
}

function isScopeError(err: unknown): boolean {
  return err instanceof GoogleApiError && err.status === 403 && /scope|insufficient/i.test(err.message);
}

async function loadLocalItems(
  admin: SupabaseClient,
  professionalId: string,
  from: string,
  to: string,
  timezone: string
): Promise<PushItem[]> {
  const [eventsRes, bookingsRes] = await Promise.all([
    admin
      .from("calendar_events")
      .select("id, title, description, location, date, end_date, start_time, end_time, all_day, blocks_agenda")
      .eq("professional_id", professionalId)
      .lte("date", to)
      .gte("end_date", from),
    admin
      .from("bookings")
      .select("id, date, start_time, status, service_type, client_name, location")
      .eq("professional_id", professionalId)
      .in("status", ["pending", "confirmed"])
      .gte("date", from)
      .lte("date", to),
  ]);

  if (eventsRes.error && eventsRes.error.code !== "42P01") throw new Error(eventsRes.error.message);
  return buildPushItems({
    events: (eventsRes.data ?? []) as LocalEventRow[],
    bookings: (bookingsRes.error ? [] : ((bookingsRes.data ?? []) as LocalBookingRow[])),
    timezone,
  });
}

/**
 * Espelha os itens locais no calendário "IsoScanning" da conta Google.
 * Nunca lança: erro vira `error` no resultado (e `last_error` na conexão).
 */
export async function pushConnection(admin: SupabaseClient, conn: CalendarConnection): Promise<PushResult> {
  const base: PushResult = { connectionId: conn.id, inserted: 0, updated: 0, deleted: 0, unchanged: 0 };
  if (conn.provider !== "google" || !conn.push_enabled) return { ...base, skipped: true };

  try {
    const timezone = await getProfessionalTimezone(admin, conn.professional_id);
    const token = await ensureGoogleAccessToken(admin, conn);

    let calendarId = conn.push_calendar_id;
    let mapWiped = false;
    if (!calendarId) {
      calendarId = (await createGoogleCalendar(token, PUSH_CALENDAR_NAME, timezone)).id;
      await admin
        .from("calendar_connections")
        .update({ push_calendar_id: calendarId, updated_at: new Date().toISOString() })
        .eq("id", conn.id);
      // Calendário novo: qualquer mapa antigo aponta para eventos que não existem
      await admin.from("calendar_push_map").delete().eq("connection_id", conn.id);
      mapWiped = true;
    }

    const today = nowInTimeZone(timezone).date;
    const from = addDaysToKey(today, -SYNC_PAST_DAYS);
    const to = addDaysToKey(today, SYNC_HORIZON_DAYS);

    const items = await loadLocalItems(admin, conn.professional_id, from, to, timezone);

    const { data: mapData, error: mapError } = await admin
      .from("calendar_push_map")
      .select("item_key, google_event_id, content_hash")
      .eq("connection_id", conn.id);
    if (mapError && mapError.code !== "42P01") throw new Error(mapError.message);
    if (mapError?.code === "42P01") {
      throw new Error("Tabela calendar_push_map não existe — aplique a migration 70.");
    }

    const applyAll = async (calId: string, diff: PushDiff): Promise<void> => {
      for (const { itemKey, googleEventId } of diff.deletes) {
        await deleteGoogleEvent(token, calId, googleEventId);
        await admin.from("calendar_push_map").delete().eq("connection_id", conn.id).eq("item_key", itemKey);
        base.deleted++;
      }
      for (const { item, googleEventId } of diff.updates) {
        try {
          await patchGoogleEvent(token, calId, googleEventId, item.payload);
        } catch (err) {
          // Evento sumiu lá (apagado à mão) → recria
          if (err instanceof GoogleApiError && (err.status === 404 || err.status === 410)) {
            const created = await insertGoogleEvent(token, calId, item.payload);
            await admin
              .from("calendar_push_map")
              .update({ google_event_id: created.id, content_hash: item.hash, updated_at: new Date().toISOString() })
              .eq("connection_id", conn.id)
              .eq("item_key", item.key);
            base.updated++;
            continue;
          }
          throw err;
        }
        await admin
          .from("calendar_push_map")
          .update({ content_hash: item.hash, updated_at: new Date().toISOString() })
          .eq("connection_id", conn.id)
          .eq("item_key", item.key);
        base.updated++;
      }
      for (const item of diff.inserts) {
        const created = await insertGoogleEvent(token, calId, item.payload);
        await admin.from("calendar_push_map").upsert(
          {
            connection_id: conn.id,
            item_key: item.key,
            google_event_id: created.id,
            content_hash: item.hash,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "connection_id,item_key" }
        );
        base.inserted++;
      }
    };

    const diff = diffPush(items, mapWiped ? [] : ((mapData ?? []) as PushMapRow[]));
    base.unchanged = diff.unchanged;

    try {
      await applyAll(calendarId, diff);
    } catch (err) {
      // Usuário apagou o calendário "IsoScanning" no Google → recria e refaz tudo
      if (err instanceof GoogleApiError && err.status === 404) {
        calendarId = (await createGoogleCalendar(token, PUSH_CALENDAR_NAME, timezone)).id;
        await admin
          .from("calendar_connections")
          .update({ push_calendar_id: calendarId, updated_at: new Date().toISOString() })
          .eq("id", conn.id);
        await admin.from("calendar_push_map").delete().eq("connection_id", conn.id);
        base.inserted = 0;
        base.updated = 0;
        base.deleted = 0;
        await applyAll(calendarId, { inserts: items, updates: [], deletes: [], unchanged: 0 });
      } else {
        throw err;
      }
    }

    return base;
  } catch (err) {
    console.error(`calendar-push: falha na conexão ${conn.id}:`, err);
    if (isScopeError(err)) {
      // Conectou antes do escopo novo existir: precisa reconectar e conceder
      await admin
        .from("calendar_connections")
        .update({
          push_enabled: false,
          last_error: "Para enviar sua agenda ao Google, reconecte a conta e aceite a nova permissão.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conn.id);
      return { ...base, error: "Reconecte o Google para ativar o envio (nova permissão necessária)." };
    }
    const message = err instanceof Error ? err.message : "Erro desconhecido no envio ao Google.";
    return { ...base, error: message.slice(0, 300) };
  }
}

export async function pushConnections(
  admin: SupabaseClient,
  connections: CalendarConnection[]
): Promise<PushResult[]> {
  const results: PushResult[] = [];
  for (const conn of connections) {
    results.push(await pushConnection(admin, conn));
  }
  return results;
}

/** Limpeza ao desligar o envio / desconectar: apaga o calendário criado pelo app. */
export async function removePushCalendar(admin: SupabaseClient, conn: CalendarConnection): Promise<void> {
  if (conn.provider !== "google" || !conn.push_calendar_id) return;
  try {
    const token = await ensureGoogleAccessToken(admin, conn);
    await deleteGoogleCalendar(token, conn.push_calendar_id);
  } catch (err) {
    console.warn(`calendar-push: não consegui apagar o calendário remoto da conexão ${conn.id} (não-crítico):`, err);
  }
  await admin.from("calendar_push_map").delete().eq("connection_id", conn.id);
  await admin
    .from("calendar_connections")
    .update({ push_calendar_id: null, updated_at: new Date().toISOString() })
    .eq("id", conn.id);
}
