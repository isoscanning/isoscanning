import { NextRequest, NextResponse } from "next/server";
import { requireUser, checkOwnerPremiumSm, PREMIUM_SM_MSG } from "@/lib/server/api-auth";
import { graphGet, MetaApiError } from "@/lib/server/meta";
import { getSupabaseAdmin, ADMIN_MISSING_MSG } from "@/lib/server/supabase-admin";

// Feed real da conta conectada para o Simulador de Feed: últimas mídias do
// grid (feed + reels) com URL de imagem. As URLs de mídia da Meta expiram,
// por isso são buscadas frescas a cada abertura do simulador.

interface IgMediaRaw {
  id: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado. Faça login novamente." }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: ADMIN_MISSING_MSG }, { status: 500 });
    }

    const scheduleId = request.nextUrl.searchParams.get("scheduleId");
    if (!scheduleId) {
      return NextResponse.json({ error: "scheduleId obrigatório" }, { status: 400 });
    }

    // Leitura: dono ou qualquer membro ativo da equipe
    const { data: schedule } = await auth.supabase
      .from("social_media_schedules")
      .select("id, owner_id")
      .eq("id", scheduleId)
      .maybeSingle();

    let authorized = schedule?.owner_id === auth.user.id;
    if (!authorized && schedule) {
      const { data: member } = await auth.supabase
        .from("social_media_team_members")
        .select("role")
        .eq("schedule_id", scheduleId)
        .eq("user_id", auth.user.id)
        .eq("status", "active")
        .maybeSingle();
      authorized = Boolean(member);
    }
    if (!schedule || !authorized) {
      return NextResponse.json({ error: "Sem permissão para este cronograma." }, { status: 403 });
    }

    // Plano: Simulador de Feed é recurso Pro/Ultra (pelo plano do dono)
    const premium = await checkOwnerPremiumSm(auth, schedule.owner_id);
    if (!premium.allowed) {
      return NextResponse.json({ error: PREMIUM_SM_MSG, planLimit: true }, { status: 403 });
    }

    const { data: connection } = await admin
      .from("sm_instagram_accounts")
      .select("ig_user_id, access_token")
      .eq("schedule_id", scheduleId)
      .maybeSingle();

    if (!connection) {
      // Sem conexão: o simulador funciona só com os posts planejados
      return NextResponse.json({ connected: false, media: [] });
    }

    const res = await graphGet<{ data?: IgMediaRaw[] }>(`/${connection.ig_user_id}/media`, {
      fields: "id,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
      limit: "33",
      access_token: connection.access_token,
    });

    const media = (res.data || [])
      // Stories não aparecem no grid do perfil
      .filter((m) => m.media_product_type !== "STORY")
      .map((m) => ({
        id: m.id,
        image: m.thumbnail_url ?? m.media_url ?? null,
        permalink: m.permalink,
        timestamp: m.timestamp,
        media_type: m.media_type,
        media_product_type: m.media_product_type,
        like_count: m.like_count,
        comments_count: m.comments_count,
      }))
      .filter((m) => m.image);

    return NextResponse.json({ connected: true, media });
  } catch (error) {
    console.error("Error in instagram/feed route:", error);
    if (error instanceof MetaApiError) {
      const friendly = /session|token/i.test(error.message)
        ? "Token do Instagram expirado ou inválido. Reconecte a conta."
        : `Erro na API da Meta: ${error.message}`;
      return NextResponse.json({ error: friendly }, { status: 502 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
