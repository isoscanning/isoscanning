import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, ADMIN_MISSING_MSG } from "@/lib/server/supabase-admin";
import { requireUser } from "@/lib/server/api-auth";
import { isUuid } from "@/lib/server/public-catalog";

// Registra o clique em "Candidatar-se no site original" (métrica de interesse
// no painel admin). Nunca bloqueia o redirecionamento do usuário.

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ ok: false }, { status: 404 });

  const auth = await requireUser(request);
  if (!auth) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: ADMIN_MISSING_MSG }, { status: 500 });

  const { error } = await admin.rpc("increment_external_job_click", {
    p_offer_id: id,
    p_profile_id: auth.user.id,
  });
  if (error) console.warn("[vagas-externas] clique:", error.message);
  return NextResponse.json({ ok: !error });
}
