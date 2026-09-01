import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, ADMIN_MISSING_MSG } from "@/lib/server/supabase-admin";
import { runBriefingReminders } from "@/lib/server/briefing-reminders";

// Lembretes do Briefing Pro (digest D-1, leitura não confirmada, entregáveis).
// Idempotente — pode rodar quantas vezes for; cada aviso sai uma única vez.
// Já pega carona no cron da agenda (/api/agenda/cron-sync); esta rota existe
// para disparo manual e para quem preferir um agendador dedicado.

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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

    const summary = await runBriefingReminders(admin);
    console.log("briefing-pro/cron-reminders:", JSON.stringify(summary));
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error in briefing-pro/cron-reminders route:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
