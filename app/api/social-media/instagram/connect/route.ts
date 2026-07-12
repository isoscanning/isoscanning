import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/api-auth";
import { getMetaConfig, getRedirectUri, signState, META_SCOPES, META_MISSING_MSG, GRAPH_VERSION } from "@/lib/server/meta";

// Inicia a conexão OAuth com a Meta: valida que o usuário é dono do
// cronograma e devolve a URL do diálogo de autorização do Facebook.
// O client faz window.location.href = url.

// GET: checagem de configuração do servidor — o modal usa isso para avisar
// o que falta ANTES de o usuário tentar conectar.
export async function GET(request: NextRequest) {
  if (!(await requireUser(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const missing: string[] = [];
  if (!process.env.META_APP_ID) missing.push("META_APP_ID");
  if (!process.env.META_APP_SECRET) missing.push("META_APP_SECRET");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return NextResponse.json({ configured: missing.length === 0, missing });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado. Faça login novamente." }, { status: 401 });
    }

    const config = getMetaConfig();
    if (!config) {
      return NextResponse.json({ error: META_MISSING_MSG }, { status: 500 });
    }

    const { scheduleId } = await request.json();
    if (!scheduleId) {
      return NextResponse.json({ error: "scheduleId obrigatório" }, { status: 400 });
    }

    // Somente o dono do cronograma pode conectar a conta (RLS valida a leitura)
    const { data: schedule } = await auth.supabase
      .from("social_media_schedules")
      .select("id, owner_id")
      .eq("id", scheduleId)
      .maybeSingle();

    if (!schedule || schedule.owner_id !== auth.user.id) {
      return NextResponse.json({ error: "Apenas o dono do cronograma pode conectar o Instagram." }, { status: 403 });
    }

    const redirectUri = getRedirectUri(request);
    const state = signState({ scheduleId, userId: auth.user.id, ts: Date.now() }, config.appSecret);

    const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
    url.searchParams.set("client_id", config.appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");
    if (config.loginConfigId) {
      // Apps tipo Empresa (Login do Facebook para Empresas): a configuração
      // de login define as permissões — scope é ignorado nesses apps.
      url.searchParams.set("config_id", config.loginConfigId);
    } else {
      url.searchParams.set("scope", META_SCOPES);
    }

    return NextResponse.json({ url: url.toString() });
  } catch (error) {
    console.error("Error in instagram/connect route:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
