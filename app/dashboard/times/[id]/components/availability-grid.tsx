"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addDaysToKey, todayKey } from "@/lib/availability";
import { teamsService, teamsApiError } from "@/lib/teams-service";
import { initials, type AgendaDayStatus, type TeamAvailabilityView, type TeamMemberView } from "@/lib/teams-types";
import { toast } from "sonner";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const RANGE_DAYS = 28;

const CELL: Record<AgendaDayStatus, string> = {
  free: "bg-emerald-500/25 border-emerald-500/40",
  partial: "bg-amber-500/25 border-amber-500/40",
  busy: "bg-rose-500/20 border-rose-500/40",
  unset: "bg-muted border-border",
};

function listDays(from: string, count: number): string[] {
  const days: string[] = [];
  for (let i = 0; i < count; i++) days.push(addDaysToKey(from, i));
  return days;
}

function weekdayOf(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12).getDay();
}

/**
 * Grade "quem está livre quando": linhas = membros, colunas = dias. Usa a
 * agenda pública de cada membro (o que ele publica) + as escalações do time.
 */
export function AvailabilityGrid({ teamId, members }: { teamId: string; members: TeamMemberView[] }) {
  const [from, setFrom] = useState(todayKey());
  const [view, setView] = useState<TeamAvailabilityView | null>(null);
  const [loading, setLoading] = useState(true);
  const days = useMemo(() => listDays(from, RANGE_DAYS), [from]);
  const to = days[days.length - 1];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setView(await teamsService.availability(teamId, from, to));
    } catch (err) {
      toast.error(teamsApiError(err, "Não foi possível carregar a disponibilidade"));
    } finally {
      setLoading(false);
    }
  }, [teamId, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const byMember = useMemo(() => new Map((view?.members ?? []).map((m) => [m.user_id, m])), [view]);
  const today = todayKey();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setFrom(addDaysToKey(from, -RANGE_DAYS))} aria-label="Período anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setFrom(today)}>Hoje</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setFrom(addDaysToKey(from, RANGE_DAYS))} aria-label="Próximo período"><ChevronRight className="h-4 w-4" /></Button>
          <span className="ml-2 text-sm text-muted-foreground inline-flex items-center gap-1">
            <CalendarDays className="h-4 w-4" /> {from.split("-").reverse().join("/")} – {to.split("-").reverse().join("/")}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className={cn("h-3 w-3 rounded-sm border", CELL.free)} /> Livre</span>
          <span className="inline-flex items-center gap-1"><span className={cn("h-3 w-3 rounded-sm border", CELL.partial)} /> Parcial</span>
          <span className="inline-flex items-center gap-1"><span className={cn("h-3 w-3 rounded-sm border", CELL.busy)} /> Ocupado</span>
          <span className="inline-flex items-center gap-1"><span className={cn("h-3 w-3 rounded-sm border", CELL.unset)} /> Não informado</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-primary" /> Escalado no time</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-muted/40">
              <th className="sticky left-0 z-10 bg-muted/40 text-left font-medium px-3 py-2 min-w-[160px]">Membro</th>
              {days.map((d) => {
                const wd = weekdayOf(d);
                return (
                  <th key={d} className={cn("px-0.5 py-1 font-normal text-center min-w-[26px]", (wd === 0 || wd === 6) && "text-muted-foreground/70", d === today && "text-primary font-semibold")}>
                    <div>{WEEKDAYS[wd]}</div>
                    <div>{d.slice(8, 10)}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const row = byMember.get(m.user_id);
              return (
                <tr key={m.user_id} className="border-t">
                  <td className="sticky left-0 z-10 bg-background px-3 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {m.profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.profile.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center">{initials(m.profile?.display_name)}</span>
                      )}
                      <span className="truncate max-w-[120px]">{m.profile?.display_name ?? "Membro"}</span>
                    </div>
                  </td>
                  {days.map((d) => {
                    const status = row?.days[d] ?? "unset";
                    const job = row?.jobs.find((j) => d >= j.start_date && d <= j.end_date);
                    return (
                      <td key={d} className="px-0.5 py-1">
                        <div
                          title={job ? `Escalado: ${job.title}` : status === "free" ? "Livre" : status === "partial" ? "Parcialmente livre" : status === "busy" ? "Ocupado" : "Sem disponibilidade informada"}
                          className={cn("h-6 w-full rounded-sm border", job ? "bg-primary border-primary" : CELL[status], loading && "opacity-50")}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {loading && <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Atualizando agendas...</p>}
    </div>
  );
}
