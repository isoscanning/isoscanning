import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/api-auth";
import { MetaApiError } from "@/lib/server/meta";
import { getSupabaseAdmin, ADMIN_MISSING_MSG } from "@/lib/server/supabase-admin";
import { syncInstagramMonth, IgConnectionRow } from "@/lib/server/instagram-sync";

// Sincronização manual (botão na UI) das métricas do Instagram de um mês.
// A lógica de matching/insights/importação vive em lib/server/instagram-sync.ts
// e é compartilhada com o cron diário (/instagram/cron-sync).

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado. Faça login novamente." }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: ADMIN_MISSING_MSG }, { status: 500 });
    }

    const { scheduleId, month, year } = await request.json();
    if (!scheduleId || !month || !year) {
      return NextResponse.json({ error: "Parâmetros obrigatórios faltando" }, { status: 400 });
    }

    // Autorização: dono ou editor/approver ativo (consultas sob RLS do usuário)
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
      authorized = member?.role === "editor" || member?.role === "approver";
    }
    if (!schedule || !authorized) {
      return NextResponse.json({ error: "Sem permissão para sincronizar este cronograma." }, { status: 403 });
    }

    // Conexão (token nunca sai do servidor)
    const { data: connection, error: connErr } = await admin
      .from("sm_instagram_accounts")
      .select("*")
      .eq("schedule_id", scheduleId)
      .maybeSingle();

    if (connErr?.code === "42P01") {
      return NextResponse.json(
        { error: "Banco desatualizado. Execute a migration 44-social-media-instagram.sql no Supabase." },
        { status: 500 }
      );
    }
    if (!connection) {
      return NextResponse.json({ error: "Instagram não conectado a este cronograma." }, { status: 400 });
    }

    const result = await syncInstagramMonth({
      admin,
      connection: connection as IgConnectionRow,
      month: Number(month),
      year: Number(year),
      createdBy: auth.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in instagram/sync route:", error);
    if (error instanceof MetaApiError) {
      const friendly = error.status === 190 || /session|token/i.test(error.message)
        ? "Token do Instagram expirado ou inválido. Reconecte a conta."
        : `Erro na API da Meta: ${error.message}`;
      return NextResponse.json({ error: friendly }, { status: 502 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
