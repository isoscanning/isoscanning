// Lembretes dos Times (SQL 81) — SOMENTE rotas de servidor.
//
// Varredura idempotente: escalação confirmada (job_applications.status =
// 'accepted' em job de time) cujo job começa AMANHÃ → avisa o escalado uma
// única vez (team_reminder_sent_at). Roda de carona no cron da agenda
// (/api/agenda/cron-sync) e na rota própria /api/teams/cron-reminders.
// Notificações inseridas direto na tabela `notifications` (mesmo formato do
// backend; tipo team_job_day_before) — o realtime do sino pega.

import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysToKey, nowInTimeZone } from "@/lib/server/tz";

const TZ = "America/Sao_Paulo";

export interface TeamRemindersSummary {
  dayBefore: number;
  errors: string[];
}

interface EscalationRow {
  id: string;
  candidate_id: string;
  job_offer_id: string;
  team_reminder_sent_at: string | null;
  job_offers: {
    id: string;
    title: string;
    team_id: string | null;
    start_date: string | null;
    start_time: string | null;
    venue: string | null;
    city: string | null;
    status: string | null;
    deleted_at: string | null;
  } | null;
}

function formatDateBR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export async function runTeamReminders(admin: SupabaseClient): Promise<TeamRemindersSummary> {
  const summary: TeamRemindersSummary = { dayBefore: 0, errors: [] };
  const today = nowInTimeZone(TZ).date;
  const tomorrow = addDaysToKey(today, 1);

  try {
    const { data, error } = await admin
      .from("job_applications")
      .select(
        "id, candidate_id, job_offer_id, team_reminder_sent_at, job_offers!inner(id, title, team_id, start_date, start_time, venue, city, status, deleted_at)"
      )
      .eq("status", "accepted")
      .eq("is_team", true)
      .is("team_reminder_sent_at", null)
      .gte("job_offers.start_date", `${tomorrow}T00:00:00`)
      .lt("job_offers.start_date", `${addDaysToKey(tomorrow, 1)}T00:00:00`)
      .is("job_offers.deleted_at", null);
    if (error) throw new Error(`escalações: ${error.message}`);

    const rows = ((data ?? []) as unknown as EscalationRow[]).filter((r) => {
      const job = Array.isArray(r.job_offers) ? (r.job_offers as EscalationRow["job_offers"][])[0] : r.job_offers;
      return job && job.team_id && job.status !== "closed" && job.start_date?.slice(0, 10) === tomorrow;
    });

    for (const row of rows) {
      const job = (Array.isArray(row.job_offers) ? (row.job_offers as EscalationRow["job_offers"][])[0] : row.job_offers)!;
      try {
        const when = `${formatDateBR(job.start_date as string)}${job.start_time ? ` às ${String(job.start_time).slice(0, 5)}` : ""}`;
        const where = job.venue || job.city || null;
        const { error: insertError } = await admin.from("notifications").insert({
          profile_id: row.candidate_id,
          type: "team_job_day_before",
          title: "Amanhã é dia de job!",
          message: `Você está escalado em "${job.title}" — ${when}${where ? `, ${where}` : ""}. Confira os detalhes e o briefing no time.`,
          reference_id: `${job.team_id}:${job.id}`,
          is_read: false,
        });
        if (insertError) throw new Error(insertError.message);

        const { error: markError } = await admin
          .from("job_applications")
          .update({ team_reminder_sent_at: new Date().toISOString() })
          .eq("id", row.id);
        if (markError) throw new Error(markError.message);

        summary.dayBefore += 1;
      } catch (err) {
        summary.errors.push(`D-1 ${row.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    summary.errors.push(err instanceof Error ? err.message : String(err));
  }

  return summary;
}
