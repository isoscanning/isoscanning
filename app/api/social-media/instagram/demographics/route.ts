import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/api-auth";
import { graphGet, MetaApiError } from "@/lib/server/meta";
import { getSupabaseAdmin, ADMIN_MISSING_MSG } from "@/lib/server/supabase-admin";

// Demografia dos seguidores da conta conectada (o mesmo dado do app do
// Instagram em "Total de seguidores"): faixa etária, gênero, cidade e país.
// Restrição da Meta: só disponível para contas com 100+ seguidores.
// Observação: a API NÃO expõe demografia por publicação individual — apenas
// no nível da conta.

interface BreakdownResult {
  dimension_values?: string[];
  value?: number;
}

interface InsightsResponse {
  data?: {
    total_value?: {
      breakdowns?: { results?: BreakdownResult[] }[];
    };
  }[];
}

async function fetchBreakdown(
  igUserId: string,
  token: string,
  breakdown: "age" | "gender" | "city" | "country"
): Promise<{ label: string; value: number }[]> {
  // timeframe é obrigatório em algumas versões/contas — tenta com e sem
  const paramSets: Record<string, string>[] = [
    { metric: "follower_demographics", period: "lifetime", timeframe: "this_month", metric_type: "total_value", breakdown },
    { metric: "follower_demographics", period: "lifetime", metric_type: "total_value", breakdown },
  ];
  let lastErr: unknown = null;
  for (const params of paramSets) {
    try {
      const res = await graphGet<InsightsResponse>(`/${igUserId}/insights`, {
        ...params,
        access_token: token,
      });
      const results = res.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
      return results
        .map((r) => ({ label: String(r.dimension_values?.[0] ?? "?"), value: Number(r.value) || 0 }))
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado. Faça login novamente." }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ error: ADMIN_MISSING_MSG }, { status: 500 });
    }

    const { scheduleId } = await request.json();
    if (!scheduleId) {
      return NextResponse.json({ error: "scheduleId obrigatório" }, { status: 400 });
    }

    // Leitura permitida para dono ou qualquer membro ativo da equipe
    const { data: schedule } = await auth.supabase
      .from("social_media_schedules")
      .select("id, owner_id")
      .eq("id", scheduleId)
      .maybeSingle();

    let authorized = schedule?.owner_id === auth.user.id;
    if (!authorized && schedule) {
      const { data: member } = await auth.supabase
        .from("social_media_team_members")
        .select("role")
        .eq("schedule_id", scheduleId)
        .eq("user_id", auth.user.id)
        .eq("status", "active")
        .maybeSingle();
      authorized = Boolean(member);
    }
    if (!schedule || !authorized) {
      return NextResponse.json({ error: "Sem permissão para este cronograma." }, { status: 403 });
    }

    const { data: connection } = await admin
      .from("sm_instagram_accounts")
      .select("ig_user_id, access_token, ig_username")
      .eq("schedule_id", scheduleId)
      .maybeSingle();

    if (!connection) {
      return NextResponse.json({ error: "Instagram não conectado a este cronograma." }, { status: 400 });
    }

    // Total de seguidores (sempre disponível)
    let followers: number | undefined;
    try {
      const profile = await graphGet<{ followers_count?: number }>(`/${connection.ig_user_id}`, {
        fields: "followers_count",
        access_token: connection.access_token,
      });
      followers = profile.followers_count;
    } catch {
      // não bloqueia — segue sem o total
    }

    // Demografia (exige 100+ seguidores — a Meta retorna erro abaixo disso)
    try {
      const [age, gender, city, country] = await Promise.all([
        fetchBreakdown(connection.ig_user_id, connection.access_token, "age"),
        fetchBreakdown(connection.ig_user_id, connection.access_token, "gender"),
        fetchBreakdown(connection.ig_user_id, connection.access_token, "city"),
        fetchBreakdown(connection.ig_user_id, connection.access_token, "country"),
      ]);

      return NextResponse.json({
        audience: {
          followers: followers ?? null,
          age,
          gender,
          city,
          country,
          fetched_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      console.warn("instagram/demographics indisponível:", msg);
      // Caso típico: conta com menos de 100 seguidores
      return NextResponse.json({
        audience: null,
        followers: followers ?? null,
        note: /follower|100|not enough|insufficient/i.test(msg)
          ? "A Meta só libera dados demográficos para contas com 100 ou mais seguidores."
          : `Dados demográficos indisponíveis para esta conta no momento.${msg ? ` (${msg})` : ""}`,
      });
    }
  } catch (error) {
    console.error("Error in instagram/demographics route:", error);
    if (error instanceof MetaApiError) {
      return NextResponse.json({ error: `Erro na API da Meta: ${error.message}` }, { status: 502 });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
