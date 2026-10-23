import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, ADMIN_MISSING_MSG } from "@/lib/server/supabase-admin";
import { requirePlatformAdmin } from "@/lib/server/admin-auth";
import { sendExternalJobsDigest } from "@/lib/server/external-jobs/import";

// Botão "Avisar profissionais agora": envia o aviso de vagas novas sem
// esperar o intervalo automático. Registra como execução para o intervalo
// do cron contar a partir daqui.

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const { denied } = await requirePlatformAdmin(request);
  if (denied) return denied;
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: ADMIN_MISSING_MSG }, { status: 500 });

  try {
    const result = await sendExternalJobsDigest(admin, true);
    if (result.notified > 0) {
      const now = new Date().toISOString();
      await admin
        .from("external_job_import_runs")
        .insert({ trigger: "admin", started_at: now, finished_at: now, notified: result.notified });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao enviar o aviso" },
      { status: 500 }
    );
  }
}
