import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getPlanLimits, resolveEffectiveTier } from "@/lib/plans/plan-limits";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * White label (página pública sem a marca IsoScanning) é recurso do plano do
 * DONO do cronograma. Esta rota é pública (sem sessão), então o dono e seu
 * plano são lidos com o client admin. Qualquer falha = false (a marca aparece).
 */
async function resolveWhiteLabel(scheduleId: unknown): Promise<boolean> {
  try {
    if (typeof scheduleId !== "string" || !scheduleId) return false;
    const admin = getSupabaseAdmin();
    if (!admin) return false;

    const { data: schedule } = await admin
      .from("social_media_schedules")
      .select("owner_id")
      .eq("id", scheduleId)
      .maybeSingle();
    const ownerId = (schedule as { owner_id?: string | null } | null)?.owner_id;
    if (!ownerId) return false;

    const { data: profile } = await admin
      .from("profiles")
      .select("subscription_tier, subscription_expires_at")
      .eq("id", ownerId)
      .maybeSingle();
    const p = profile as { subscription_tier?: string | null; subscription_expires_at?: string | null } | null;

    return getPlanLimits(resolveEffectiveTier(p?.subscription_tier, p?.subscription_expires_at)).whiteLabel;
  } catch {
    return false;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length !== 64) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  const client = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await client.rpc("sm_get_shared_calendar", {
    p_token: token,
  });

  if (error) {
    return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 404 });
  }

  // A RPC devolve { schedule: { id, ... }, posts }. Acrescenta a flag do plano do dono.
  const whiteLabel = await resolveWhiteLabel(
    (data as { schedule?: { id?: unknown } } | null)?.schedule?.id
  );

  return NextResponse.json(
    { ...(data as Record<string, unknown>), whiteLabel },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
