import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, ADMIN_MISSING_MSG } from "@/lib/server/supabase-admin";
import { runExternalJobsImport } from "@/lib/server/external-jobs/import";

// Rotina das vagas externas (SQL 83): busca nas APIs oficiais (1x/dia),
// classifica com IA, expira as antigas e avisa os profissionais.
// Chamada pelo GitHub Actions (.github/workflows/external-jobs.yml) a cada
// 3 h com "Authorization: Bearer $CRON_SECRET" — rodadas extras só
// continuam a classificação que não coube na anterior.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
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

  try {
    const summary = await runExternalJobsImport(admin, { trigger: "cron" });
    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro na rotina de vagas externas";
    console.error("[vagas-externas/cron-import]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
