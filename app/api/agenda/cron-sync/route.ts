import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, ADMIN_MISSING_MSG } from "@/lib/server/supabase-admin";
import { connectionsAllowedByPlan, loadActiveConnections, loadConnection, syncConnections } from "@/lib/server/calendar-sync";
import { pushConnections } from "@/lib/server/calendar-push";

// Sincronização periódica de TODOS os calendários conectados.
//
// É o que faz o Google Agenda "fechar sozinho" as datas no IsoScanning.
// Chamada pelo agendador (GitHub Actions gratuito — docs/agenda-sync.md;
// ou Vercel Cron / Render Cron) com "Authorization: Bearer $CRON_SECRET".
// Sugestão: a cada 30 min. Uma rodada gasta 1–3 requisições por conexão,
// muito abaixo do limite gratuito do Google.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization") ?? "";
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "CRON_SECRET não configurada — defina a env no projeto para habilitar o cron." },
        { status: 401 }
      );
    }

    const admin = getSupabaseAdmin();
    if (!admin) return NextResponse.json({ error: ADMIN_MISSING_MSG }, { status: 500 });

    const { connections: all, error } = await loadActiveConnections(admin);
    if (error) {
      return NextResponse.json({ error: `Erro ao listar conexões: ${error.message}` }, { status: 500 });
    }
    // Quem voltou para o Free fica dormente até o upgrade
    const connections = await connectionsAllowedByPlan(admin, all);

    const summary = await syncConnections(admin, connections);

    // Envio IsoScanning → Google (recarrega para pegar tokens renovados)
    const freshForPush = [];
    for (const conn of connections) {
      if (conn.provider !== "google" || !conn.push_enabled) continue;
      const { connection } = await loadConnection(admin, conn.id);
      if (connection) freshForPush.push(connection);
    }
    const pushes = await pushConnections(admin, freshForPush);

    console.log(
      "agenda/cron-sync:",
      JSON.stringify({
        connections: connections.length,
        synced: summary.synced,
        failed: summary.failed,
        pushed: pushes.filter((p) => !p.error && !p.skipped).length,
      })
    );

    return NextResponse.json({
      connections: connections.length,
      synced: summary.synced,
      failed: summary.failed,
      results: summary.results.map((r) => ({
        connectionId: r.connectionId,
        provider: r.provider,
        busyRows: r.busyRows,
        error: r.error ?? null,
        warnings: r.warnings,
      })),
      pushes,
    });
  } catch (error) {
    console.error("Error in agenda/cron-sync route:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
