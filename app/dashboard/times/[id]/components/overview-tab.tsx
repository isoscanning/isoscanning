"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Briefcase, CalendarDays, Clock, Megaphone, Pin, ChevronRight, UserCheck, Plus, UserPlus, AlertCircle } from "lucide-react";
import { formatTeamDate, isManagerRole, type TeamDetail, type TeamJobSummary } from "@/lib/teams-types";

function StatTile({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground truncate">{label}{hint ? ` · ${hint}` : ""}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function myStatusBadge(job: TeamJobSummary) {
  if (job.my_status === "accepted") return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Você está escalado</Badge>;
  if (job.my_status === "pending" && job.my_origin === "convocation") return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Responder convocação</Badge>;
  if (job.my_status === "pending") return <Badge variant="secondary">Candidatura enviada</Badge>;
  return null;
}

export function OverviewTab({ detail, onGoTo }: { detail: TeamDetail; onGoTo: (tab: string) => void; onChanged?: () => void }) {
  const isManager = isManagerRole(detail.my_role);
  const pinned = detail.announcements.filter((a) => a.pinned);
  const latest = pinned.length > 0 ? pinned : detail.announcements.slice(0, 2);

  return (
    <div className="space-y-6">
      {detail.stats.my_pending_convocations > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm flex-1">
            Você tem <strong>{detail.stats.my_pending_convocations}</strong> {detail.stats.my_pending_convocations === 1 ? "convocação pendente" : "convocações pendentes"}. Responda para confirmar sua escalação.
          </p>
          <Button size="sm" onClick={() => onGoTo("jobs")}>Ver jobs</Button>
        </div>
      )}
      {isManager && detail.stats.pending_applications > 0 && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <UserCheck className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm flex-1">
            <strong>{detail.stats.pending_applications}</strong> {detail.stats.pending_applications === 1 ? "candidatura aguarda" : "candidaturas aguardam"} sua confirmação de escalação.
          </p>
          <Button size="sm" onClick={() => onGoTo("jobs")}>Confirmar escalação</Button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={Users} label="Membros ativos" value={detail.stats.members_active} hint={detail.stats.members_invited > 0 ? `${detail.stats.members_invited} convidados` : undefined} />
        <StatTile icon={Briefcase} label="Jobs abertos" value={detail.stats.jobs_open} hint={`${detail.stats.jobs_total} no total`} />
        <StatTile icon={UserCheck} label="Candidaturas pendentes" value={detail.stats.pending_applications} />
        <StatTile icon={Megaphone} label="Avisos" value={detail.announcements.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Próximos jobs</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onGoTo("jobs")}>Ver todos <ChevronRight className="ml-1 h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {detail.upcoming_jobs.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Nenhum job aberto no momento.
                {isManager && !detail.team.archived_at && (
                  <div className="mt-3">
                    <Button asChild size="sm"><Link href={`/dashboard/times/${detail.team.id}/jobs/nova`}><Plus className="mr-1 h-4 w-4" /> Publicar job</Link></Button>
                  </div>
                )}
              </div>
            ) : (
              detail.upcoming_jobs.map((job) => (
                <Link key={job.id} href={`/dashboard/times/${detail.team.id}/jobs/${job.id}`} className="block rounded-xl border p-3 hover:border-primary/40 hover:bg-muted/30 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{job.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {job.start_date && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {formatTeamDate(job.start_date)}{job.end_date && job.end_date !== job.start_date ? ` – ${formatTeamDate(job.end_date)}` : ""}</span>}
                        {job.start_time && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {job.start_time}</span>}
                        <span className="inline-flex items-center gap-1"><UserCheck className="h-3 w-3" /> {job.confirmed_count}/{job.positions} escalados</span>
                        {isManager && job.pending_count > 0 && <span className="text-primary">{job.pending_count} pendente{job.pending_count > 1 ? "s" : ""}</span>}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {job.confirmed_count >= job.positions ? <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300">Escalação completa</Badge> : <Badge variant="outline">{job.positions - job.confirmed_count} vaga{job.positions - job.confirmed_count > 1 ? "s" : ""}</Badge>}
                      {myStatusBadge(job)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4" /> Avisos</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onGoTo("avisos")}>Todos <ChevronRight className="ml-1 h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {latest.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum aviso ainda.</p>
              ) : (
                latest.map((a) => (
                  <div key={a.id} className="rounded-lg bg-muted/40 p-3">
                    <p className="text-sm font-medium flex items-center gap-1">{a.pinned && <Pin className="h-3 w-3 text-primary" />} {a.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-3 mt-1 whitespace-pre-line">{a.content}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {isManager && !detail.team.archived_at && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Ações rápidas</CardTitle></CardHeader>
              <CardContent className="grid gap-2">
                <Button asChild variant="outline" className="justify-start"><Link href={`/dashboard/times/${detail.team.id}/jobs/nova`}><Plus className="mr-2 h-4 w-4" /> Publicar job para o time</Link></Button>
                <Button variant="outline" className="justify-start" onClick={() => onGoTo("membros")}><UserPlus className="mr-2 h-4 w-4" /> Convidar membro</Button>
                <Button variant="outline" className="justify-start" onClick={() => onGoTo("avisos")}><Megaphone className="mr-2 h-4 w-4" /> Publicar aviso</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

    </div>
  );
}
