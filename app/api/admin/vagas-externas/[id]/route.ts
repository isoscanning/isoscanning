import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, ADMIN_MISSING_MSG } from "@/lib/server/supabase-admin";
import { requirePlatformAdmin } from "@/lib/server/admin-auth";
import { isUuid } from "@/lib/server/public-catalog";
import { ADMIN_COLUMNS, toAdmin } from "@/lib/server/external-jobs/mappers";
import { loadCategories } from "@/lib/server/external-jobs/import";
import { normalizeJobType, normalizeUf } from "@/lib/server/external-jobs/normalize";

// Revisão do admin: publicar/ocultar e corrigir categoria, local e tipo.

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await requirePlatformAdmin(request);
  if (denied) return denied;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: ADMIN_MISSING_MSG }, { status: 500 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: now };

  if (body.status !== undefined) {
    if (body.status !== "published" && body.status !== "hidden") {
      return NextResponse.json({ error: "Status deve ser 'published' ou 'hidden'." }, { status: 400 });
    }
    patch.status = body.status;
    if (body.status === "published") {
      patch.published_at = now;
      // Ao republicar uma vencida/expirada, dá mais 21 dias
      patch.expires_at = new Date(Date.now() + 21 * 86_400_000).toISOString();
      patch.last_seen_at = now;
    }
  }
  if (body.category !== undefined) {
    const categories = await loadCategories(admin);
    patch.category = typeof body.category === "string" && categories.includes(body.category) ? body.category : null;
  }
  if (body.jobType !== undefined) patch.job_type = normalizeJobType(body.jobType);
  if (body.state !== undefined) patch.state = normalizeUf(body.state);
  if (body.city !== undefined) patch.city = typeof body.city === "string" && body.city.trim() ? body.city.trim().slice(0, 80) : null;
  if (body.isRemote !== undefined) patch.is_remote = body.isRemote === true;
  if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim().slice(0, 140);

  const { data, error } = await admin
    .from("external_job_offers")
    .update(patch)
    .eq("id", id)
    .select(ADMIN_COLUMNS)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  return NextResponse.json({ job: toAdmin(data as unknown as Record<string, unknown>) });
}
