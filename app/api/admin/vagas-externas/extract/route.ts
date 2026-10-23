import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, ADMIN_MISSING_MSG } from "@/lib/server/supabase-admin";
import { requirePlatformAdmin } from "@/lib/server/admin-auth";
import { loadCategories } from "@/lib/server/external-jobs/import";
import { extractJobDraft } from "@/lib/server/external-jobs/classify";
import { GroqError } from "@/lib/server/groq";

// Importação manual: o admin cola o texto da vaga (grupo de WhatsApp, post)
// e a IA devolve o rascunho para conferir antes de publicar.

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { denied } = await requirePlatformAdmin(request);
  if (denied) return denied;
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY não configurada." }, { status: 500 });
  }
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: ADMIN_MISSING_MSG }, { status: 500 });

  const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (text.length < 20) {
    return NextResponse.json({ error: "Cole o texto completo da vaga (mínimo 20 caracteres)." }, { status: 400 });
  }

  try {
    const draft = await extractJobDraft(text, await loadCategories(admin));
    return NextResponse.json({ draft });
  } catch (err) {
    const status = err instanceof GroqError ? err.status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Não foi possível ler a vaga com a IA." },
      { status: status >= 400 && status < 600 ? status : 500 }
    );
  }
}
