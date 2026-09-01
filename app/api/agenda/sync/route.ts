import { NextRequest, NextResponse } from "next/server";
import { requireFeature, requireUser } from "@/lib/server/api-auth";
import { getSupabaseAdmin, ADMIN_MISSING_MSG } from "@/lib/server/supabase-admin";
import {
  CalendarConnection,
  loadConnection,
  loadProfessionalConnections,
  syncConnections,
} from "@/lib/server/calendar-sync";
import { pushConnections } from "@/lib/server/calendar-push";

// POST — "Sincronizar agora" do próprio profissional.
//   { connectionId? }  → só aquela conexão; sem, todas as ligadas.
//   { pushOnly: true } → só o ENVIO IsoScanning → Google (usado pela tela
//                        logo após criar/editar/excluir um compromisso, para
//                        o Google refletir na hora sem pagar o custo da
//                        importação free/busy).

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (!auth) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const denied = await requireFeature(auth, "calendarSync");
    if (denied) return denied;

    const admin = getSupabaseAdmin();
    if (!admin) return NextResponse.json({ error: ADMIN_MISSING_MSG }, { status: 500 });

    const body = (await request.json().catch(() => ({}))) as {
      connectionId?: string;
      pushOnly?: boolean;
    };

    let connections: CalendarConnection[];
    if (body.connectionId) {
      const { connection } = await loadConnection(admin, body.connectionId);
      if (!connection || connection.professional_id !== auth.user.id) {
        return NextResponse.json({ error: "Conexão não encontrada." }, { status: 404 });
      }
      connections = [connection];
    } else {
      const { connections: all, error } = await loadProfessionalConnections(admin, auth.user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      connections = all.filter((c) => c.sync_enabled && c.status !== "revoked");
    }

    if (body.pushOnly) {
      const pushes = await pushConnections(admin, connections);
      return NextResponse.json({ results: [], synced: 0, failed: 0, pushes });
    }

    const summary = await syncConnections(admin, connections);
    // Recarrega para pegar tokens renovados/estados atualizados pela importação
    const fresh: CalendarConnection[] = [];
    for (const conn of connections) {
      const { connection } = await loadConnection(admin, conn.id);
      if (connection) fresh.push(connection);
    }
    const pushes = await pushConnections(admin, fresh);

    return NextResponse.json({ ...summary, pushes });
  } catch (error) {
    console.error("Error in agenda/sync route:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
