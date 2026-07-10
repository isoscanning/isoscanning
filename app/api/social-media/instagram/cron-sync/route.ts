import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, ADMIN_MISSING_MSG } from "@/lib/server/supabase-admin";
import { syncInstagramMonth, IgConnectionRow, InstagramSyncResult } from "@/lib/server/instagram-sync";

// Sincronização automática diária de TODAS as contas de Instagram conectadas.
// Chamada pelo Vercel Cron (ver vercel.json) — a Vercel envia automaticamente
// o header "Authorization: Bearer $CRON_SECRET" quando a env CRON_SECRET existe
// no projeto. Também pode ser disparada manualmente com o mesmo bearer
// (qualquer agendador externo funciona em deploys fora da Vercel).
//
// Sincroniza o mês corrente; nos 5 primeiros dias do mês sincroniza também o
// mês anterior (métricas de fim de mês ainda crescem nos primeiros dias).

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface AccountResult {
  schedule_id: string;
  ig_username?: string | null;
  months?: { month: number; year: number; result: InstagramSyncResult }[];
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Autenticação do cron
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
    if (!admin) {
      return NextResponse.json({ error: ADMIN_MISSING_MSG }, { status: 500 });
    }

    const { data: connections, error: connErr } = await admin
      .from("sm_instagram_accounts")
      .select("*");
    if (connErr) {
      return NextResponse.json({ error: `Erro ao listar conexões: ${connErr.message}` }, { status: 500 });
    }

    // Mês corrente no fuso do Brasil
    const brNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const targets: { month: number; year: number }[] = [
      { month: brNow.getMonth() + 1, year: brNow.getFullYear() },
    ];
    if (brNow.getDate() <= 5) {
      const prevMonth = targets[0].month === 1 ? 12 : targets[0].month - 1;
      const prevYear = targets[0].month === 1 ? targets[0].year - 1 : targets[0].year;
      targets.push({ month: prevMonth, year: prevYear });
    }

    const results: AccountResult[] = [];
    for (const conn of (connections ?? []) as IgConnectionRow[]) {
      const entry: AccountResult = {
        schedule_id: conn.schedule_id,
        ig_username: conn.ig_username,
        months: [],
      };
      try {
        for (const t of targets) {
          const result = await syncInstagramMonth({
            admin,
            connection: conn,
            month: t.month,
            year: t.year,
            createdBy: conn.connected_by ?? null,
          });
          entry.months!.push({ ...t, result });
        }
      } catch (err) {
        // Uma conta com token inválido não pode travar as demais
        entry.error = err instanceof Error ? err.message : "erro desconhecido";
        console.error(`cron-sync: falha em @${conn.ig_username ?? conn.schedule_id}:`, err);
      }
      results.push(entry);
    }

    const summary = {
      accounts: results.length,
      failures: results.filter((r) => r.error).length,
      totalUpdated: results.reduce(
        (s, r) => s + (r.months ?? []).reduce((a, m) => a + m.result.updated, 0), 0),
      totalCreated: results.reduce(
        (s, r) => s + (r.months ?? []).reduce((a, m) => a + m.result.created, 0), 0),
    };
    console.log("cron-sync:", JSON.stringify(summary));

    return NextResponse.json({ ...summary, results });
  } catch (error) {
    console.error("Error in instagram/cron-sync route:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
