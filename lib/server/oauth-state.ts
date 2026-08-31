// `state` assinado para fluxos OAuth (anti-CSRF) — genérico.
//
// O callback do provedor chega por redirect, sem sessão. O único jeito de
// saber para QUEM o token pertence é o `state` que nós mesmos geramos ao
// iniciar o fluxo; a assinatura HMAC garante que ninguém forjou um state
// apontando para outro usuário. A versão do Instagram (lib/server/meta.ts)
// é específica de cronograma — esta serve para qualquer payload.

import crypto from "crypto";

const b64url = (buf: Buffer) => buf.toString("base64url");

function hmac(payload: string, secret: string): string {
  return b64url(crypto.createHmac("sha256", secret).update(payload).digest());
}

export function signOAuthState<T extends { ts: number }>(state: T, secret: string): string {
  const payload = b64url(Buffer.from(JSON.stringify(state)));
  return `${payload}.${hmac(payload, secret)}`;
}

export function verifyOAuthState<T extends { ts: number }>(
  raw: string,
  secret: string,
  maxAgeMs = 30 * 60 * 1000
): T | null {
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;
  const expected = hmac(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString()) as T;
    if (!state || typeof state.ts !== "number") return null;
    if (Date.now() - state.ts > maxAgeMs) return null;
    return state;
  } catch {
    return null;
  }
}
