// Lembretes do Briefing Pro (Fase 2) — SOMENTE rotas de servidor.
//
// Três varreduras idempotentes (cada uma marca *_sent_at para nunca repetir):
//   1. Digest D-1: briefing aprovado/em execução com event_date AMANHÃ →
//      avisa dono + equipe.
//   2. Follow-up de leitura: briefing aprovado com execução em até 3 dias e
//      membros que ainda não confirmaram a versão atual → cobra cada um e
//      resume para o dono.
//   3. Entregável vencendo: due_date amanhã (pendente/em produção) → avisa o
//      responsável (ou o dono).
//
// Roda de carona no cron da agenda (a cada 30 min) e também na rota própria
// /api/briefing-pro/cron-reminders. Notificações inseridas direto na tabela
// `notifications` (o backend faz o mesmo formato) — o realtime do sino pega.

import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysToKey, nowInTimeZone } from "@/lib/server/tz";

const TZ = "America/Sao_Paulo";

export interface BriefingRemindersSummary {
  d1Digests: number;
  confirmReminders: number;
  deliverableReminders: number;
  errors: string[];
}

interface BriefingRow {
  id: string;
  title: string;
  owner_id: string;
  event_date: string | null;
  event_time: string | null;
  version: number;
  status: string;
}

async function notify(
  admin: SupabaseClient,
  profileIds: string[],
  type: string,
  title: string,
  message: string,
  referenceId: string
): Promise<void> {
  const unique = [...new Set(profileIds.filter(Boolean))];
  if (unique.length === 0) return;
  const { error } = await admin.from("notifications").insert(
    unique.map((profileId) => ({
      profile_id: profileId,
      type,
      title,
      message,
      reference_id: referenceId,
      is_read: false,
    }))
  );
  if (error) throw new Error(`notifications insert: ${error.message}`);
}

async function activeMemberIds(admin: SupabaseClient, briefingId: string): Promise<string[]> {
  const { data } = await admin
    .from("briefing_members")
    .select("user_id")
    .eq("briefing_id", briefingId)
    .eq("status", "active");
  return ((data ?? []) as Array<{ user_id: string }>).map((m) => m.user_id);
}

export async function runBriefingReminders(admin: SupabaseClient): Promise<BriefingRemindersSummary> {
  const summary: BriefingRemindersSummary = {
    d1Digests: 0,
    confirmReminders: 0,
    deliverableReminders: 0,
    errors: [],
  };

  const today = nowInTimeZone(TZ).date;
  const tomorrow = addDaysToKey(today, 1);

  // ── 1. Digest D-1 ─────────────────────────────────────────────────────────
  try {
    const { data, error } = await admin
      .from("briefings")
      .select("id, title, owner_id, event_date, event_time, version, status")
      .eq("event_date", tomorrow)
      .in("status", ["approved", "in_execution"])
      .is("d1_digest_sent_at", null)
      .limit(100);
    if (error) throw new Error(error.message);

    for (const briefing of (data ?? []) as BriefingRow[]) {
      const members = await activeMemberIds(admin, briefing.id);
      const when = briefing.event_time ? ` às ${briefing.event_time.slice(0, 5)}` : "";
      await notify(
        admin,
        [briefing.owner_id, ...members],
        "briefing_day_before",
        "Amanhã é dia de execução!",
        `"${briefing.title}" acontece amanhã${when}. Revise o cronograma, os contatos e as locações.`,
        briefing.id
      );
      await admin
        .from("briefings")
        .update({ d1_digest_sent_at: new Date().toISOString() })
        .eq("id", briefing.id);
      summary.d1Digests++;
    }
  } catch (err) {
    summary.errors.push(`d1: ${(err as Error).message}`);
  }

  // ── 2. Follow-up de leitura não confirmada ────────────────────────────────
  try {
    const { data, error } = await admin
      .from("briefings")
      .select("id, title, owner_id, event_date, event_time, version, status")
      .eq("status", "approved")
      .gte("event_date", today)
      .lte("event_date", addDaysToKey(today, 3))
      .is("confirm_reminder_sent_at", null)
      .limit(100);
    if (error) throw new Error(error.message);

    for (const briefing of (data ?? []) as BriefingRow[]) {
      const members = await activeMemberIds(admin, briefing.id);
      if (members.length === 0) {
        // Sem equipe não há quem cobrar; marca para não revisitar
        await admin
          .from("briefings")
          .update({ confirm_reminder_sent_at: new Date().toISOString() })
          .eq("id", briefing.id);
        continue;
      }

      const { data: reads } = await admin
        .from("briefing_read_confirmations")
        .select("user_id")
        .eq("briefing_id", briefing.id)
        .eq("version", briefing.version);
      const confirmed = new Set(((reads ?? []) as Array<{ user_id: string }>).map((r) => r.user_id));
      const pending = members.filter((id) => !confirmed.has(id) && id !== briefing.owner_id);

      if (pending.length > 0) {
        await notify(
          admin,
          pending,
          "briefing_confirm_reminder",
          "Confirme a leitura do briefing",
          `A execução de "${briefing.title}" está chegando e você ainda não confirmou a leitura da versão atual (v${briefing.version}).`,
          briefing.id
        );
        await notify(
          admin,
          [briefing.owner_id],
          "briefing_confirm_reminder",
          `${pending.length} ${pending.length === 1 ? "pessoa ainda não confirmou" : "pessoas ainda não confirmaram"} a leitura`,
          `Em "${briefing.title}", ${pending.length} de ${members.length} da equipe ${pending.length === 1 ? "não confirmou" : "não confirmaram"} a leitura da v${briefing.version}.`,
          briefing.id
        );
        summary.confirmReminders++;
      }
      await admin
        .from("briefings")
        .update({ confirm_reminder_sent_at: new Date().toISOString() })
        .eq("id", briefing.id);
    }
  } catch (err) {
    summary.errors.push(`confirm: ${(err as Error).message}`);
  }

  // ── 3. Entregável vencendo amanhã ─────────────────────────────────────────
  try {
    const { data, error } = await admin
      .from("briefing_deliverables")
      .select("id, briefing_id, title, assigned_to, due_date, status")
      .eq("due_date", tomorrow)
      .in("status", ["pending", "in_production"])
      .is("reminder_sent_at", null)
      .limit(200);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{
      id: string;
      briefing_id: string;
      title: string;
      assigned_to: string | null;
      due_date: string;
      status: string;
    }>;

    if (rows.length > 0) {
      const briefingIds = [...new Set(rows.map((r) => r.briefing_id))];
      const { data: briefings } = await admin
        .from("briefings")
        .select("id, title, owner_id")
        .in("id", briefingIds);
      const byId = new Map(
        ((briefings ?? []) as Array<{ id: string; title: string; owner_id: string }>).map((b) => [b.id, b])
      );

      for (const row of rows) {
        const briefing = byId.get(row.briefing_id);
        if (!briefing) continue;
        await notify(
          admin,
          [row.assigned_to ?? briefing.owner_id],
          "briefing_deliverable_due",
          "Entregável vence amanhã",
          `"${row.title}" do briefing "${briefing.title}" tem prazo para amanhã e ainda está ${row.status === "pending" ? "pendente" : "em produção"}.`,
          row.briefing_id
        );
        await admin
          .from("briefing_deliverables")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", row.id);
        summary.deliverableReminders++;
      }
    }
  } catch (err) {
    summary.errors.push(`deliverables: ${(err as Error).message}`);
  }

  return summary;
}
