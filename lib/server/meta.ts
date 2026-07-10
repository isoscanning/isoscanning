// Helpers da integração oficial com a Meta (Instagram Graph API).
// Fluxo: /instagram/connect gera a URL do diálogo OAuth → usuário autoriza →
// /instagram/callback troca o code por token de longa duração e descobre a
// conta Instagram Business vinculada à Página → /instagram/sync puxa mídias
// e insights e preenche as colunas metric_* dos posts.

import crypto from "crypto";

export const GRAPH_VERSION = "v21.0";
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// Permissões mínimas para ler a conta IG Business e suas métricas
export const META_SCOPES = [
  "instagram_basic",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
].join(",");

export interface MetaConfig {
  appId: string;
  appSecret: string;
  /** ID da Configuração do "Login do Facebook para Empresas".
   *  Apps do tipo Empresa IGNORAM o parâmetro scope — sem config_id o token
   *  sai só com public_profile e /me/accounts volta vazio. */
  loginConfigId?: string;
}

export function getMetaConfig(): MetaConfig | null {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return null;
  return { appId, appSecret, loginConfigId: process.env.META_LOGIN_CONFIG_ID || undefined };
}

export const META_MISSING_MSG =
  "Integração com a Meta não configurada. Defina META_APP_ID e META_APP_SECRET no .env.local " +
  "(crie um app Business em developers.facebook.com — veja docs/instagram-integration.md).";

/** redirect_uri precisa ser idêntico no diálogo OAuth e na troca do code */
export function getRedirectUri(requestUrl: string): string {
  if (process.env.META_REDIRECT_URI) return process.env.META_REDIRECT_URI;
  const origin = new URL(requestUrl).origin;
  return `${origin}/api/social-media/instagram/callback`;
}

// ── state assinado (anti-CSRF) ────────────────────────────────

export interface OAuthState {
  scheduleId: string;
  userId: string;
  ts: number;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

function hmac(payload: string, secret: string): string {
  return b64url(crypto.createHmac("sha256", secret).update(payload).digest());
}

export function signState(state: OAuthState, secret: string): string {
  const payload = b64url(Buffer.from(JSON.stringify(state)));
  return `${payload}.${hmac(payload, secret)}`;
}

export function verifyState(raw: string, secret: string, maxAgeMs = 30 * 60 * 1000): OAuthState | null {
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;
  const expected = hmac(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString()) as OAuthState;
    if (!state.scheduleId || !state.userId || !state.ts) return null;
    if (Date.now() - state.ts > maxAgeMs) return null;
    return state;
  } catch {
    return null;
  }
}

// ── chamadas à Graph API ──────────────────────────────────────

export class MetaApiError extends Error {
  constructor(message: string, public status: number = 500) {
    super(message);
    this.name = "MetaApiError";
  }
}

/** GET na Graph API com querystring; lança MetaApiError com a mensagem da Meta */
export async function graphGet<T = Record<string, unknown>>(
  pathOrUrl: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = pathOrUrl.startsWith("http")
    ? new URL(pathOrUrl)
    : new URL(`${GRAPH_BASE}${pathOrUrl}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: { message?: string } })?.error?.message || `Erro na API da Meta (${res.status})`;
    throw new MetaApiError(msg, res.status);
  }
  return data as T;
}
