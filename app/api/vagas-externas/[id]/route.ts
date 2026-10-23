import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, ADMIN_MISSING_MSG } from "@/lib/server/supabase-admin";
import { requireUser } from "@/lib/server/api-auth";
import { isUuid } from "@/lib/server/public-catalog";
import { DETAIL_COLUMNS, TEASER_COLUMNS, toDetail, toTeaser } from "@/lib/server/external-jobs/mappers";

// Detalhe de uma vaga externa. Visitante anônimo recebe só o teaser
// (`locked: true`) — a vaga completa e o link exigem cadastro.

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: ADMIN_MISSING_MSG }, { status: 500 });

  const auth = await requireUser(request);
  const { data, error } = await admin
    .from("external_job_offers")
    .select(auth ? DETAIL_COLUMNS : TEASER_COLUMNS)
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Vaga não encontrada ou encerrada" }, { status: 404 });

  const row = data as unknown as Record<string, unknown>;
  return auth
    ? NextResponse.json({ locked: false, job: toDetail(row) })
    : NextResponse.json({ locked: true, job: toTeaser(row) });
}
