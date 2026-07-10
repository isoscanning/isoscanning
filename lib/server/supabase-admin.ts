// Client Supabase com service role — SOMENTE para uso em rotas de servidor.
// Necessário onde não há sessão do usuário (ex.: callback OAuth da Meta) ou
// onde o token de acesso do Instagram precisa ser lido sem nunca passar pelo
// browser (tabela sm_instagram_accounts tem RLS sem policies de leitura).

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const ADMIN_MISSING_MSG =
  "SUPABASE_SERVICE_ROLE_KEY não configurada no .env.local. " +
  "Copie a service_role key em Supabase > Project Settings > API e reinicie o servidor.";
