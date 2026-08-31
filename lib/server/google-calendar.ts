// Integração com o Google Agenda — SOMENTE rotas de servidor.
//
// Fluxo: /api/agenda/google/connect gera a URL de autorização → usuário
// autoriza → /api/agenda/google/callback troca o code por tokens e grava a
// conexão → o sync (manual ou cron) consulta o endpoint freeBusy e grava só
// os intervalos ocupados em calendar_busy.
//
// Escopo pedido: `calendar.freebusy` — o mais estreito que existe. Devolve
// apenas "ocupado das X às Y"; nunca título, convidados ou descrição. Isso
// é melhor para o usuário e simplifica a verificação do app no Google.
//
// Custo: zero. A Calendar API não é cobrada; o limite gratuito é de
// 1.000.000 requisições/dia por projeto — uma sincronização usa 1 a 3.
//
// Configuração (docs/agenda-sync.md): GOOGLE_CALENDAR_CLIENT_ID e
// GOOGLE_CALENDAR_CLIENT_SECRET (OAuth "Aplicativo da Web" no Google Cloud),
// redirect URI = https://SEU_DOMINIO/api/agenda/google/callback.

import { getRequestOrigin } from "@/lib/server/meta";

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const GOOGLE_FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy";

export const GOOGLE_FREEBUSY_SCOPE = "https://www.googleapis.com/auth/calendar.freebusy";
/**
 * Escopo de ESCRITA mínimo: o app só cria/edita calendários criados por ele
 * mesmo (o "IsoScanning" na conta do usuário). Não enxerga os demais.
 */
export const GOOGLE_APP_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.app.created";
export const GOOGLE_SCOPES = ["openid", "email", GOOGLE_FREEBUSY_SCOPE, GOOGLE_APP_CALENDAR_SCOPE].join(" ");

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
}

export function getGoogleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export const GOOGLE_MISSING_MSG =
  "Integração com o Google Agenda não configurada. Defina GOOGLE_CALENDAR_CLIENT_ID e " +
  "GOOGLE_CALENDAR_CLIENT_SECRET (credencial OAuth no Google Cloud — veja docs/agenda-sync.md).";

/** redirect_uri precisa ser idêntico na autorização e na troca do code. */
export function getGoogleRedirectUri(request: { url: string; headers: Headers }): string {
  if (process.env.GOOGLE_CALENDAR_REDIRECT_URI) return process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  return `${getRequestOrigin(request)}/api/agenda/google/callback`;
}

export class GoogleApiError extends Error {
  constructor(message: string, public status: number = 500, public code?: string) {
    super(message);
    this.name = "GoogleApiError";
  }
}

export function buildGoogleAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  /** E-mail para pré-selecionar a conta (reconexão). */
  loginHint?: string;
}): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES);
  // offline + consent: é o que garante o refresh_token, sem o qual o cron
  // deixaria de sincronizar em 1 hora.
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", params.state);
  if (params.loginHint) url.searchParams.set("login_hint", params.loginHint);
  return url.toString();
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
  token_type?: string;
}

async function postForm<T>(url: string, form: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form).toString(),
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const code = typeof data.error === "string" ? data.error : undefined;
    const description = typeof data.error_description === "string" ? data.error_description : "";
    throw new GoogleApiError(
      description || code || `Erro na API do Google (${res.status})`,
      res.status,
      code
    );
  }
  return data as T;
}

export async function exchangeGoogleCode(
  config: GoogleConfig,
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  return postForm<TokenResponse>(GOOGLE_TOKEN_URL, {
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
}

export async function refreshGoogleToken(
  config: GoogleConfig,
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: Date }> {
  const data = await postForm<TokenResponse>(GOOGLE_TOKEN_URL, {
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
  });
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
  };
}

/** Melhor esforço: o Google pode já ter revogado; nada a fazer nesse caso. */
export async function revokeGoogleToken(token: string): Promise<void> {
  try {
    await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // ignorado de propósito
  }
}

/**
 * Identidade da conta a partir do id_token. Não validamos a assinatura de
 * propósito: o token veio DIRETO do endpoint do Google, por TLS, na troca do
 * code — não passou pelo browser nem por terceiros.
 */
export function decodeGoogleIdToken(idToken: string | undefined): { sub: string; email: string | null } | null {
  if (!idToken) return null;
  const parts = idToken.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      sub?: string;
      email?: string;
    };
    if (!payload.sub) return null;
    return { sub: payload.sub, email: payload.email ?? null };
  } catch {
    return null;
  }
}

export interface GoogleBusyInterval {
  start: Date;
  end: Date;
}

interface FreeBusyResponse {
  calendars?: Record<
    string,
    {
      busy?: { start: string; end: string }[];
      errors?: { domain?: string; reason?: string }[];
    }
  >;
}

/** freeBusy aceita janelas grandes, mas fatiamos para não estourar limites internos. */
const FREEBUSY_CHUNK_DAYS = 60;

/**
 * Intervalos ocupados dos calendários informados entre `timeMin` e `timeMax`.
 * Erros por calendário (id inexistente, sem acesso) voltam em `errors` sem
 * derrubar os demais.
 */
export async function fetchGoogleFreeBusy(params: {
  accessToken: string;
  calendarIds: string[];
  timeMin: Date;
  timeMax: Date;
  timeZone?: string;
}): Promise<{ busy: GoogleBusyInterval[]; errors: string[] }> {
  const busy: GoogleBusyInterval[] = [];
  const errors = new Set<string>();
  const ids = params.calendarIds.length > 0 ? params.calendarIds : ["primary"];

  let cursor = params.timeMin;
  while (cursor < params.timeMax) {
    const chunkEnd = new Date(Math.min(
      cursor.getTime() + FREEBUSY_CHUNK_DAYS * 86_400_000,
      params.timeMax.getTime()
    ));

    const res = await fetch(GOOGLE_FREEBUSY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: cursor.toISOString(),
        timeMax: chunkEnd.toISOString(),
        timeZone: params.timeZone ?? "UTC",
        items: ids.map((id) => ({ id })),
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const data = (await res.json().catch(() => ({}))) as FreeBusyResponse & {
      error?: { message?: string; status?: string; code?: number };
    };

    if (!res.ok) {
      const code = data.error?.status ?? String(res.status);
      throw new GoogleApiError(
        data.error?.message || `Erro no freeBusy do Google (${res.status})`,
        res.status,
        code
      );
    }

    for (const [id, entry] of Object.entries(data.calendars ?? {})) {
      for (const err of entry.errors ?? []) {
        errors.add(`${id}: ${err.reason ?? "erro"}`);
      }
      for (const item of entry.busy ?? []) {
        const start = new Date(item.start);
        const end = new Date(item.end);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) continue;
        busy.push({ start, end });
      }
    }

    cursor = chunkEnd;
  }

  return { busy, errors: [...errors] };
}

// ── Calendário do app (escrita — escopo calendar.app.created) ───────────────

const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

export interface GoogleEventPayload {
  summary: string;
  description?: string;
  location?: string;
  /** Dia inteiro usa `date` (fim EXCLUSIVO); com horário, `dateTime` + `timeZone`. */
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  transparency?: "opaque" | "transparent";
}

async function calendarApi<T>(
  accessToken: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${CALENDAR_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    error?: { message?: string; status?: string };
  };
  if (!res.ok) {
    throw new GoogleApiError(
      data.error?.message || `Erro na Calendar API (${res.status})`,
      res.status,
      data.error?.status
    );
  }
  return data as T;
}

export async function createGoogleCalendar(
  accessToken: string,
  summary: string,
  timeZone: string
): Promise<{ id: string }> {
  return calendarApi<{ id: string }>(accessToken, "POST", "/calendars", { summary, timeZone });
}

/** Melhor esforço — 404/410 significa que já não existe. */
export async function deleteGoogleCalendar(accessToken: string, calendarId: string): Promise<void> {
  try {
    await calendarApi(accessToken, "DELETE", `/calendars/${encodeURIComponent(calendarId)}`);
  } catch (err) {
    if (err instanceof GoogleApiError && (err.status === 404 || err.status === 410)) return;
    throw err;
  }
}

export async function insertGoogleEvent(
  accessToken: string,
  calendarId: string,
  payload: GoogleEventPayload
): Promise<{ id: string }> {
  return calendarApi<{ id: string }>(
    accessToken,
    "POST",
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    payload
  );
}

export async function patchGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  payload: GoogleEventPayload
): Promise<void> {
  await calendarApi(
    accessToken,
    "PATCH",
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    payload
  );
}

/** 404/410 é sucesso: o evento já não está lá. */
export async function deleteGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  try {
    await calendarApi(
      accessToken,
      "DELETE",
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
    );
  } catch (err) {
    if (err instanceof GoogleApiError && (err.status === 404 || err.status === 410)) return;
    throw err;
  }
}
