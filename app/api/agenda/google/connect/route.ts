import { NextRequest, NextResponse } from "next/server";
import { requireFeature, requireUser } from "@/lib/server/api-auth";
import {
  GOOGLE_MISSING_MSG,
  buildGoogleAuthUrl,
  getGoogleConfig,
  getGoogleRedirectUri,
} from "@/lib/server/google-calendar";
import { signOAuthState } from "@/lib/server/oauth-state";
import { encryptionReady } from "@/lib/server/calendar-sync";
import { ENCRYPTION_KEY_MISSING_MSG } from "@/lib/server/crypto";

// Inicia a conexão com o Google Agenda. Devolve a URL de autorização; o
// client faz window.location.href = url. O `state` assinado carrega o
// usuário para o callback (que chega sem sessão).

export interface GoogleAgendaState {
  userId: string;
  ts: number;
}

// GET: checagem de configuração — a tela avisa o que falta ANTES do clique.
export async function GET(request: NextRequest) {
  if (!(await requireUser(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const missing: string[] = [];
  if (!process.env.GOOGLE_CALENDAR_CLIENT_ID) missing.push("GOOGLE_CALENDAR_CLIENT_ID");
  if (!process.env.GOOGLE_CALENDAR_CLIENT_SECRET) missing.push("GOOGLE_CALENDAR_CLIENT_SECRET");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!encryptionReady()) missing.push("ENCRYPTION_KEY");
  return NextResponse.json({ configured: missing.length === 0, missing });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado. Faça login novamente." }, { status: 401 });
    }

    // Sincronização é recurso Pro (403 PLAN_FEATURE abre o modal de upgrade)
    const denied = await requireFeature(auth, "calendarSync");
    if (denied) return denied;

    const config = getGoogleConfig();
    if (!config) {
      return NextResponse.json({ error: GOOGLE_MISSING_MSG }, { status: 500 });
    }
    if (!encryptionReady()) {
      return NextResponse.json({ error: ENCRYPTION_KEY_MISSING_MSG }, { status: 500 });
    }

    const state = signOAuthState<GoogleAgendaState>({ userId: auth.user.id, ts: Date.now() }, config.clientSecret);
    const url = buildGoogleAuthUrl({
      clientId: config.clientId,
      redirectUri: getGoogleRedirectUri(request),
      state,
      loginHint: auth.user.email ?? undefined,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error in agenda/google/connect route:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
