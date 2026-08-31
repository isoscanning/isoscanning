import { NextRequest, NextResponse } from "next/server";
import { getRequestOrigin } from "@/lib/server/meta";
import {
  GOOGLE_APP_CALENDAR_SCOPE,
  GOOGLE_FREEBUSY_SCOPE,
  GoogleApiError,
  decodeGoogleIdToken,
  exchangeGoogleCode,
  getGoogleConfig,
  getGoogleRedirectUri,
} from "@/lib/server/google-calendar";
import { verifyOAuthState } from "@/lib/server/oauth-state";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { encryptionReady, loadConnection, sealSecret, syncConnection } from "@/lib/server/calendar-sync";
import { pushConnection } from "@/lib/server/calendar-push";
import type { GoogleAgendaState } from "../connect/route";

// Callback do OAuth do Google. Chega via redirect (sem sessão) — a identidade
// vem do `state` assinado. Troca o code por tokens, grava a conexão cifrada e
// faz a primeira sincronização na hora, para a pessoa já ver as datas
// fechadas ao voltar para a tela.

function redirectTo(origin: string, params: Record<string, string>) {
  const url = new URL("/dashboard/agenda", origin);
  url.searchParams.set("tab", "sync");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url.toString());
}

export async function GET(request: NextRequest) {
  const origin = getRequestOrigin(request);
  const searchParams = request.nextUrl.searchParams;
  const config = getGoogleConfig();

  try {
    if (!config) return redirectTo(origin, { cal: "error", reason: "config" });

    const state = verifyOAuthState<GoogleAgendaState>(searchParams.get("state") ?? "", config.clientSecret);
    if (!state?.userId) return redirectTo(origin, { cal: "error", reason: "state" });

    if (searchParams.get("error")) {
      // usuário cancelou a tela de consentimento
      return redirectTo(origin, { cal: "error", reason: "denied" });
    }
    const code = searchParams.get("code");
    if (!code) return redirectTo(origin, { cal: "error", reason: "code" });

    const admin = getSupabaseAdmin();
    if (!admin) return redirectTo(origin, { cal: "error", reason: "service_role" });
    if (!encryptionReady()) return redirectTo(origin, { cal: "error", reason: "encryption" });

    const tokens = await exchangeGoogleCode(config, code, getGoogleRedirectUri(request));

    // Sem o escopo de free/busy não há o que sincronizar (a pessoa pode
    // desmarcar a caixa na tela do Google).
    const granted = (tokens.scope ?? "").split(/\s+/);
    if (!granted.includes(GOOGLE_FREEBUSY_SCOPE)) {
      return redirectTo(origin, { cal: "error", reason: "scope" });
    }
    // Envio para o Google só se a permissão de "criar calendários" veio junto
    // (o usuário pode desmarcar essa caixa e ficar só com a importação).
    const pushGranted = granted.includes(GOOGLE_APP_CALENDAR_SCOPE);
    // prompt=consent garante o refresh_token; se mesmo assim faltar, a conta
    // ficaria inutilizável em 1 hora — melhor avisar já.
    if (!tokens.refresh_token) {
      return redirectTo(origin, { cal: "error", reason: "no_refresh" });
    }

    const identity = decodeGoogleIdToken(tokens.id_token);
    if (!identity) return redirectTo(origin, { cal: "error", reason: "identity" });

    const now = new Date();
    const { data: saved, error: upsertErr } = await admin
      .from("calendar_connections")
      .upsert(
        {
          professional_id: state.userId,
          provider: "google",
          label: identity.email,
          external_account_id: identity.sub,
          calendar_ids: ["primary"],
          access_token: sealSecret(tokens.access_token),
          refresh_token: sealSecret(tokens.refresh_token),
          token_expires_at: new Date(now.getTime() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
          sync_enabled: true,
          push_enabled: pushGranted,
          status: "active",
          last_error: null,
          updated_at: now.toISOString(),
        },
        { onConflict: "professional_id,provider,external_account_id" }
      )
      .select("id")
      .single();

    if (upsertErr || !saved) {
      console.error("agenda/google/callback upsert error:", upsertErr);
      const reason = upsertErr?.code === "42P01" ? "migration" : "save";
      return redirectTo(origin, { cal: "error", reason, detail: (upsertErr?.message ?? "").slice(0, 180) });
    }

    // Primeira sincronização (e primeiro envio) — falha aqui não desfaz a
    // conexão; o cron tenta de novo.
    const { connection } = await loadConnection(admin, saved.id as string);
    if (connection) {
      await syncConnection(admin, connection);
      if (pushGranted) {
        const { connection: fresh } = await loadConnection(admin, saved.id as string);
        if (fresh) await pushConnection(admin, fresh);
      }
    }

    return redirectTo(origin, { cal: "connected", label: identity.email ?? "" });
  } catch (error) {
    console.error("Error in agenda/google/callback route:", error);
    const reason = error instanceof GoogleApiError ? "google_api" : "internal";
    const detail = error instanceof Error ? error.message.slice(0, 180) : "";
    return redirectTo(origin, { cal: "error", reason, detail });
  }
}
