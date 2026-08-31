import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/api-auth";
import { getSupabaseAdmin, ADMIN_MISSING_MSG } from "@/lib/server/supabase-admin";
import { loadConnection, syncConnection } from "@/lib/server/calendar-sync";
import { revokeGoogleToken } from "@/lib/server/google-calendar";

// PATCH  — liga/desliga a sincronização ou troca os calendários do Google.
// DELETE — desconecta (revoga o token no Google e apaga a ocupação importada).

type Params = { params: Promise<{ id: string }> };

async function ownedConnection(request: NextRequest, id: string) {
  const auth = await requireUser(request);
  if (!auth) return { error: NextResponse.json({ error: "Não autorizado" }, { status: 401 }) };
  const admin = getSupabaseAdmin();
  if (!admin) return { error: NextResponse.json({ error: ADMIN_MISSING_MSG }, { status: 500 }) };

  const { connection } = await loadConnection(admin, id);
  if (!connection || connection.professional_id !== auth.user.id) {
    return { error: NextResponse.json({ error: "Conexão não encontrada." }, { status: 404 }) };
  }
  return { auth, admin, connection };
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const ctx = await ownedConnection(request, id);
    if ("error" in ctx) return ctx.error;
    const { admin, connection } = ctx;

    const body = (await request.json().catch(() => ({}))) as {
      syncEnabled?: boolean;
      calendarIds?: string[];
    };

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.syncEnabled === "boolean") patch.sync_enabled = body.syncEnabled;
    if (Array.isArray(body.calendarIds) && connection.provider === "google") {
      const ids = body.calendarIds
        .map((v) => String(v).trim())
        .filter((v) => v.length > 0 && v.length <= 200)
        .slice(0, 10);
      patch.calendar_ids = ids.length ? ids : ["primary"];
    }

    const { error } = await admin.from("calendar_connections").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Desligar precisa reabrir as datas na hora — não no próximo cron.
    if (body.syncEnabled === false) {
      await admin.from("calendar_busy").delete().eq("connection_id", id);
      return NextResponse.json({ ok: true });
    }

    // Religar ou trocar calendários: sincroniza já.
    const { connection: fresh } = await loadConnection(admin, id);
    const sync = fresh ? await syncConnection(admin, fresh) : null;
    return NextResponse.json({ ok: true, sync });
  } catch (error) {
    console.error("Error in agenda/connections PATCH:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const ctx = await ownedConnection(request, id);
    if ("error" in ctx) return ctx.error;
    const { admin, connection } = ctx;

    if (connection.provider === "google") {
      // Revogar no Google faz a conexão sumir da lista "apps com acesso" da
      // conta da pessoa — é o comportamento que ela espera de "desconectar".
      await revokeGoogleToken(connection.refresh_token ?? connection.access_token ?? "");
    }

    // ON DELETE CASCADE apaga calendar_busy; as datas reabrem imediatamente.
    const { error } = await admin.from("calendar_connections").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in agenda/connections DELETE:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
