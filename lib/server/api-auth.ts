// Autenticação server-side para as rotas /app/api.
//
// As rotas de IA proxiam a chave GROQ — sem esta validação qualquer pessoa
// na internet poderia consumir a cota de IA do projeto. Todas as rotas de
// IA devem chamar requireUser() antes de tocar na Groq.

import { NextRequest } from "next/server";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

export interface AuthenticatedRequest {
  user: User;
  token: string;
  /** Client Supabase agindo como o usuário (RLS aplicado). */
  supabase: SupabaseClient;
}

export async function requireUser(
  request: NextRequest
): Promise<AuthenticatedRequest | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;

  const authorization = request.headers.get("authorization");
  const token = authorization?.replace(/Bearer\s+/i, "").trim();
  if (!token) return null;

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  return { user: data.user, token, supabase };
}

/**
 * Cota mensal de gerações de calendário com IA.
 * Free: 1/mês | Pro/Standard/Ultra(vip): ilimitado.
 * Tier null é tratado como vip (promoção de lançamento).
 */
export async function checkAiCalendarQuota(
  auth: AuthenticatedRequest
): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", auth.user.id)
    .maybeSingle();

  const tier = (profile?.subscription_tier as string | null) ?? "vip";
  const limit = tier === "free" ? 1 : null;

  if (limit === null) return { allowed: true, used: 0, limit: null };

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { count } = await auth.supabase
    .from("sm_ai_generations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .eq("kind", "calendar")
    .gte("created_at", monthStart.toISOString());

  const used = count ?? 0;
  return { allowed: used < limit, used, limit };
}

/** Registra uma geração de calendário (chamar após sucesso). */
export async function recordAiCalendarUsage(auth: AuthenticatedRequest): Promise<void> {
  // Tabela criada na migration 41 — se ainda não existir, não quebra a rota.
  await auth.supabase
    .from("sm_ai_generations")
    .insert({ user_id: auth.user.id, kind: "calendar" })
    .then(({ error }) => {
      if (error) console.warn("[api-auth] Falha ao registrar uso de IA:", error.message);
    });
}
