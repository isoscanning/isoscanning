import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/api-auth";
import { getSupabaseAdmin, ADMIN_MISSING_MSG } from "@/lib/server/supabase-admin";
import {
  loadConnection,
  loadProfessionalConnections,
  syncConnections,
} from "@/lib/server/calendar-sync";

// POST — "Sincronizar agora" do próprio profissional. Com `connectionId`
// sincroniza só aquela; sem, todas as ligadas.

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const admin = getSupabaseAdmin();
    if (!admin) return NextResponse.json({ error: ADMIN_MISSING_MSG }, { status: 500 });

    const body = (await request.json().catch(() => ({}))) as { connectionId?: string };

    if (body.connectionId) {
      const { connection } = await loadConnection(admin, body.connectionId);
      if (!connection || connection.professional_id !== auth.user.id) {
        return NextResponse.json({ error: "Conexão não encontrada." }, { status: 404 });
      }
      const summary = await syncConnections(admin, [connection]);
      return NextResponse.json(summary);
    }

    const { connections, error } = await loadProfessionalConnections(admin, auth.user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const summary = await syncConnections(
      admin,
      connections.filter((c) => c.sync_enabled && c.status !== "revoked")
    );
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error in agenda/sync route:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
