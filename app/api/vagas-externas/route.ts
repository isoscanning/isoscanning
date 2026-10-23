import { NextResponse } from "next/server";
import { getSupabaseAdmin, ADMIN_MISSING_MSG } from "@/lib/server/supabase-admin";
import { TEASER_COLUMNS, toTeaser } from "@/lib/server/external-jobs/mappers";

// Vitrine pública das vagas externas (SQL 83). Só o "teaser": quem quiser a
// descrição, a empresa e o link precisa estar logado (rota /[id]).

export const revalidate = 300;

export async function GET() {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: ADMIN_MISSING_MSG }, { status: 500 });

  const { data, error } = await admin
    .from("external_job_offers")
    .select(TEASER_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(300);

  if (error) {
    // Tabela ausente (SQL 83 não aplicada) não pode derrubar a página de vagas
    console.warn("[vagas-externas] listagem:", error.message);
    return NextResponse.json({ jobs: [] });
  }
  return NextResponse.json({ jobs: (data ?? []).map((row) => toTeaser(row as Record<string, unknown>)) });
}
