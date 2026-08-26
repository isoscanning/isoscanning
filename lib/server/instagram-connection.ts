// Leitura/gravação da conexão com o Instagram (sm_instagram_accounts) com o
// access_token CIFRADO em repouso (AES-256-GCM — ver lib/server/crypto.ts).
//
// - sealAccessToken(): usar ao gravar (callback do OAuth).
// - loadInstagramConnection()/loadAllInstagramConnections(): devolvem a linha
//   já com o token em claro, só para uso no servidor. Linhas legadas (token em
//   texto puro, anteriores à migração) são recifradas na hora, de forma
//   transparente — não é preciso rodar script de migração.
//
// SOMENTE rotas de servidor com o client service role (getSupabaseAdmin).

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import {
  decryptField,
  encryptField,
  isEncrypted,
  isEncryptionConfigured,
} from "@/lib/server/crypto";
import type { IgConnectionRow } from "@/lib/server/instagram-sync";

export type IgConnectionRecord = IgConnectionRow & Record<string, unknown>;

export function sealAccessToken(token: string): string {
  const sealed = encryptField(token);
  if (!sealed) throw new Error("Token do Instagram vazio.");
  return sealed;
}

async function unseal(admin: SupabaseClient, row: Record<string, unknown>): Promise<IgConnectionRecord> {
  const stored = (row.access_token as string | null) ?? "";
  const plain = decryptField(stored) ?? "";

  // Migração transparente: token legado em texto puro → recifra agora.
  if (stored && !isEncrypted(stored) && isEncryptionConfigured()) {
    const { error } = await admin
      .from("sm_instagram_accounts")
      .update({ access_token: encryptField(stored), updated_at: new Date().toISOString() })
      .eq("schedule_id", row.schedule_id as string);
    if (error) {
      console.warn(`instagram-connection: falha ao recifrar token do cronograma ${row.schedule_id}:`, error.message);
    }
  }

  return { ...(row as IgConnectionRecord), access_token: plain };
}

export async function loadInstagramConnection(
  admin: SupabaseClient,
  scheduleId: string
): Promise<{ connection: IgConnectionRecord | null; error: PostgrestError | null }> {
  const { data, error } = await admin
    .from("sm_instagram_accounts")
    .select("*")
    .eq("schedule_id", scheduleId)
    .maybeSingle();

  if (error || !data) return { connection: null, error: error ?? null };
  return { connection: await unseal(admin, data as Record<string, unknown>), error: null };
}

export async function loadAllInstagramConnections(
  admin: SupabaseClient
): Promise<{ connections: IgConnectionRecord[]; error: PostgrestError | null }> {
  const { data, error } = await admin.from("sm_instagram_accounts").select("*");
  if (error) return { connections: [], error };

  const connections: IgConnectionRecord[] = [];
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    connections.push(await unseal(admin, row));
  }
  return { connections, error: null };
}
