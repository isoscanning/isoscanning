import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, ADMIN_MISSING_MSG } from "@/lib/server/supabase-admin";
import { requirePlatformAdmin } from "@/lib/server/admin-auth";
import { runExternalJobsImport } from "@/lib/server/external-jobs/import";

// Botão "Rodar agora" do admin: mesma rotina do cron, forçando a busca nas APIs.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const { denied } = await requirePlatformAdmin(request);
  if (denied) return denied;
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: ADMIN_MISSING_MSG }, { status: 500 });

  try {
    const summary = await runExternalJobsImport(admin, { trigger: "admin", forceFetch: true });
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro na rotina de vagas externas" },
      { status: 500 }
    );
  }
}
