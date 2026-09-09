"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Briefcase, CalendarDays, Clock, MapPin, UserCheck, ChevronRight, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { teamsService, teamsApiError } from "@/lib/teams-service";
import { formatTeamDate, type TeamJobRow } from "@/lib/teams-types";
import { formatJobBudget, formatJobTimeRange, hasJobBudget, jobStatusInfo } from "@/lib/jobs/job-offer-display";

type Filter = "open" | "all" | "closed";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "open", label: "Abertos" },
  { value: "all", label: "Todos" },
  { value: "closed", label: "Concluídos" },
];

function myBadge(row: TeamJobRow) {
  const mine = row.my_application;
  if (!mine) return null;
  if (mine.status === "accepted") return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Você está escalado{mine.team_role ? ` · ${mine.team_role}` : ""}</Badge>;
  if (mine.status === "pending" && mine.origin === "convocation") return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Convocado — responda</Badge>;
  if (mine.status === "pending") return <Badge variant="secondary">Candidatura enviada</Badge>;
  return null;
}

export function JobsTab({ teamId, isManager, archived }: { teamId: string; isManager: boolean; archived: boolean }) {
  const [rows, setRows] = useState<TeamJobRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("open");

  const load = useCallback(async () => {
    try {
      setRows(await teamsService.listJobs(teamId));
    } catch (err) {
      toast.error(teamsApiError(err, "Não foi possível carregar os jobs"));
      setRows([]);
    }
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = (rows ?? []).filter((r) => {
    const status = jobStatusInfo(r.job).status;
    if (filter === "open") return status === "open" || status === "paused";
    if (filter === "closed") return status === "closed" || status === "expired";
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button key={f.value} onClick={() => setFilter(f.value)} className={`rounded-full px-3 py-1 text-xs font-medium transition ${filter === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
              {f.label}
            </button>
          ))}
        </div>
        {isManager && !archived && (
          <Button asChild><Link href={`/dashboard/times/${teamId}/jobs/nova`}><Plus className="mr-2 h-4 w-4" /> Publicar job</Link></Button>
        )}
      </div>

      {rows === null ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-3">
            <Briefcase className="h-10 w-10 mx-auto opacity-30" />
            <p className="font-medium">{filter === "open" ? "Nenhum job aberto" : "Nenhum job aqui"}</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {isManager
                ? "Publique um job só para o time: os membros são avisados, se candidatam ou você convoca quem quiser, e a escalação confirmada reserva a agenda de cada um."
                : "Quando o gestor publicar um job, ele aparece aqui e você recebe um aviso."}
            </p>
            {isManager && !archived && <Button asChild size="sm"><Link href={`/dashboard/times/${teamId}/jobs/nova`}><Plus className="mr-1 h-4 w-4" /> Publicar job</Link></Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => {
            const status = jobStatusInfo(row.job);
            const times = formatJobTimeRange(row.job.startTime, row.job.endTime);
            const complete = row.confirmed_count >= row.positions;
            return (
              <Link key={row.job.id} href={`/dashboard/times/${teamId}/jobs/${row.job.id}`} className="block group">
                <Card className="transition hover:border-primary/40 hover:shadow-sm">
                  <CardContent className="p-4 md:p-5">
                    <div className="flex items-start gap-4">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{row.job.title}</h3>
                          <Badge variant={status.status === "open" ? "default" : "secondary"} title={status.hint}>{status.label}</Badge>
                          {myBadge(row)}
                        </div>
                        <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                          {row.job.startDate && (
                            <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {formatTeamDate(row.job.startDate)}{row.job.endDate && row.job.endDate.slice(0, 10) !== row.job.startDate.slice(0, 10) ? ` – ${formatTeamDate(row.job.endDate)}` : ""}</span>
                          )}
                          {times && <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {times}</span>}
                          {(row.job.venue || row.job.city) && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {row.job.venue || [row.job.city, row.job.state].filter(Boolean).join("/")}</span>}
                          {hasJobBudget(row.job) && <span className="inline-flex items-center gap-1"><DollarSign className="h-4 w-4" /> {formatJobBudget(row.job)}</span>}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className={`inline-flex items-center gap-1 ${complete ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                            <UserCheck className="h-4 w-4" /> {row.confirmed_count}/{row.positions} {complete ? "escalação completa" : "escalados"}
                          </span>
                          {isManager && row.pending_count > 0 && (
                            <span className="text-primary font-medium">{row.pending_count} {row.pending_count === 1 ? "pendente" : "pendentes"}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
