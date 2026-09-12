"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, CalendarDays, Clock, MapPin, DollarSign, Users, UserCheck, UserPlus, MoreVertical, Pencil, Pause, Play,
  CheckCircle2, Trash2, Loader2, MessageSquare, FileSignature, ClipboardList, PlayCircle, Plus, Package, X, Check,
  Briefcase, ExternalLink, Calendar, FileText, Receipt,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-service";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";
import { teamsService, teamsApiError } from "@/lib/teams-service";
import {
  TEAM_JOB_ROLE_SUGGESTIONS, formatTeamDate, initials, isManagerRole,
  type TeamJobApplicationView, type TeamJobDetail, type TeamMemberView,
} from "@/lib/teams-types";
import { formatJobBudget, formatJobTimeRange, hasJobBudget, jobStatusInfo, jobTypeLabel, positionsLabel } from "@/lib/jobs/job-offer-display";
import { TeamChat } from "../../components/team-chat";
import { JobFinanceCard } from "../../components/job-finance-card";
import { BRIEFING_STATUS_CONFIG, BRIEFING_TYPE_LABELS, DELIVERABLE_STATUS_CONFIG, type BriefingStatus, type DeliverableStatus } from "@/lib/briefing-pro-types";

type TabKey = "escalacao" | "entregas" | "conversa" | "detalhes";
const TABS: TabKey[] = ["escalacao", "entregas", "conversa", "detalhes"];

function RoleField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>Função neste job</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Ex.: Foto, Drone, Vídeo" maxLength={60} />
      <div className="flex flex-wrap gap-1.5">
        {TEAM_JOB_ROLE_SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => onChange(s)} className={`rounded-full border px-2.5 py-0.5 text-xs transition ${value === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{s}</button>
        ))}
      </div>
    </div>
  );
}

function PersonRow({ app, children }: { app: TeamJobApplicationView; children?: React.ReactNode }) {
  const p = app.profile;
  const role = app.team_role || app.member_job_role;
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Link href={`/profissionais/${app.candidate_id}`} className="shrink-0">
        {p?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span className="h-10 w-10 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">{initials(p?.display_name)}</span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{p?.display_name ?? "Membro"}{role ? <span className="text-primary font-normal"> · {role}</span> : null}</p>
        <p className="text-xs text-muted-foreground truncate">
          {app.origin === "convocation" ? "Convocado pelo gestor" : "Candidatou-se"}
          {app.message ? ` — "${app.message}"` : ""}
          {app.contract_id ? " · contrato gerado" : ""}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">{children}</div>
    </div>
  );
}

function JobDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = params.id as string;
  const jobId = params.jobId as string;
  const { userProfile, loading: authLoading } = useAuth();
  const { confirm, dialog } = useConfirmDialog();

  const [detail, setDetail] = useState<TeamJobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requested = searchParams.get("tab") as TabKey | null;
  const [tab, setTab] = useState<TabKey>(requested && TABS.includes(requested) ? requested : "escalacao");
  const [busy, setBusy] = useState<string | null>(null);

  // Diálogos
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyRole, setApplyRole] = useState("");
  const [applyMessage, setApplyMessage] = useState("");
  const [convokeOpen, setConvokeOpen] = useState(false);
  const [members, setMembers] = useState<TeamMemberView[] | null>(null);
  const [convokeUser, setConvokeUser] = useState("");
  const [convokeRole, setConvokeRole] = useState("");
  const [convokeMessage, setConvokeMessage] = useState("");
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [briefingTitle, setBriefingTitle] = useState("");
  const [briefingType, setBriefingType] = useState("photography");
  const [briefingCrew, setBriefingCrew] = useState(true);
  const [briefingMembers, setBriefingMembers] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await teamsService.getJob(teamId, jobId);
      setDetail(data);
      setError(null);
    } catch (err) {
      setError(teamsApiError(err, "Não foi possível carregar o job"));
    }
  }, [teamId, jobId]);

  useEffect(() => {
    if (!authLoading && !userProfile) router.push("/login");
  }, [authLoading, userProfile, router]);

  useEffect(() => {
    if (userProfile) void load();
  }, [userProfile, load]);

  function changeTab(next: string) {
    setTab(next as TabKey);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.toString());
  }

  async function run(key: string, fn: () => Promise<unknown>, ok?: string) {
    setBusy(key);
    try {
      await fn();
      if (ok) toast.success(ok);
      await load();
    } catch (err) {
      if (!isPlanErrorBody((err as { response?: { data?: unknown } })?.response?.data)) toast.error(teamsApiError(err, "Não foi possível concluir a ação"));
    } finally {
      setBusy(null);
    }
  }

  async function openConvoke() {
    setConvokeOpen(true);
    if (members) return;
    try {
      const team = await teamsService.getDetail(teamId);
      setMembers(team.members);
    } catch {
      setMembers([]);
    }
  }

  async function openChat(userId: string) {
    setBusy(`chat:${userId}`);
    try {
      const res = await apiClient.post("/chat/conversations", { participantId: userId });
      router.push(`/dashboard/chat/${res.data.id}`);
    } catch (err) {
      toast.error(teamsApiError(err, "Não foi possível abrir a conversa"));
      setBusy(null);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-12 px-4">
          <div className="container mx-auto max-w-3xl rounded-2xl border border-dashed p-10 text-center">
            <p className="font-medium">{error}</p>
            <Button asChild variant="outline" className="mt-4"><Link href={`/dashboard/times/${teamId}?tab=jobs`}>Voltar aos jobs</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const job = detail?.job;
  const isManager = isManagerRole(detail?.my_role);
  const isEmployer = !!job && job.employerId === userProfile?.id;
  const status = job ? jobStatusInfo(job) : null;
  const isOpen = status?.status === "open";
  const mine = detail?.my_application ?? null;
  const confirmed = detail?.applications.filter((a) => a.status === "accepted") ?? [];
  const pendingCandidates = detail?.applications.filter((a) => a.status === "pending" && a.origin === "candidate") ?? [];
  const pendingConvocations = detail?.applications.filter((a) => a.status === "pending" && a.origin === "convocation") ?? [];
  const history = detail?.applications.filter((a) => a.status === "rejected" || a.status === "withdrawn") ?? [];
  const canConvoke = isManager && isOpen && !!detail && !detail.escalation.complete;
  const times = job ? formatJobTimeRange(job.startTime, job.endTime) : null;

  const convokeCandidates = (members ?? []).filter((m) => !detail?.applications.some((a) => a.candidate_id === m.user_id && (a.status === "pending" || a.status === "accepted")));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {dialog}
      <Header />
      <main className="flex-1 py-6 md:py-10 px-4">
        <div className="container mx-auto max-w-5xl space-y-6">
          <Link href={`/dashboard/times/${teamId}?tab=jobs`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Jobs do time
          </Link>

          {!detail || !job || !status ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-10 w-full max-w-md" />
              <Skeleton className="h-72 w-full rounded-2xl" />
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold">{job.title}</h1>
                    <Badge variant={isOpen ? "default" : "secondary"} title={status.hint}>{status.label}</Badge>
                    <Badge variant="outline" className="border-teal-500/40 text-teal-700 dark:text-teal-300"><Users className="mr-1 h-3 w-3" /> Job do time</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                    {job.startDate && <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {formatTeamDate(job.startDate)}{job.endDate && job.endDate.slice(0, 10) !== job.startDate.slice(0, 10) ? ` – ${formatTeamDate(job.endDate)}` : ""}</span>}
                    {times && <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {times}</span>}
                    {(job.venue || job.city) && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {job.venue || [job.city, job.state].filter(Boolean).join("/")}</span>}
                    {hasJobBudget(job) && <span className="inline-flex items-center gap-1"><DollarSign className="h-4 w-4" /> {formatJobBudget(job)}</span>}
                    <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {positionsLabel(detail.escalation.positions)}</span>
                  </p>
                </div>
                {isManager && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline"><MoreVertical className="mr-2 h-4 w-4" /> Gerenciar</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild><Link href={`/dashboard/times/${teamId}/jobs/${jobId}/editar`}><Pencil className="mr-2 h-4 w-4" /> Editar job</Link></DropdownMenuItem>
                      {status.status === "open" && <DropdownMenuItem onClick={() => run("status", () => teamsService.updateJobStatus(teamId, jobId, "paused"), "Job pausado")}><Pause className="mr-2 h-4 w-4" /> Pausar candidaturas</DropdownMenuItem>}
                      {(status.status === "paused" || status.status === "closed") && <DropdownMenuItem onClick={() => run("status", () => teamsService.updateJobStatus(teamId, jobId, "open"), "Job reaberto")}><Play className="mr-2 h-4 w-4" /> Reabrir</DropdownMenuItem>}
                      {status.status === "expired" && <DropdownMenuItem asChild><Link href={`/dashboard/times/${teamId}/jobs/${jobId}/editar`}><Calendar className="mr-2 h-4 w-4" /> Novas datas e reabrir</Link></DropdownMenuItem>}
                      {status.status !== "closed" && <DropdownMenuItem onClick={() => confirm({ title: "Concluir o job?", description: "Marca o trabalho como concluído. As escalações confirmadas permanecem no histórico.", confirmLabel: "Concluir", onConfirm: () => run("status", () => teamsService.updateJobStatus(teamId, jobId, "closed"), "Job concluído") })}><CheckCircle2 className="mr-2 h-4 w-4" /> Concluir job</DropdownMenuItem>}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => confirm({ title: "Excluir o job?", description: "Escalados perdem a reserva na agenda e são avisados. Briefings ligados continuam existindo.", destructive: true, confirmLabel: "Excluir", onConfirm: async () => { await teamsService.removeJob(teamId, jobId); toast.success("Job excluído"); router.push(`/dashboard/times/${teamId}?tab=jobs`); } })}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <Tabs value={tab} onValueChange={changeTab} className="space-y-6">
                <div className="overflow-x-auto -mx-4 px-4">
                  <TabsList>
                    <TabsTrigger value="escalacao"><UserCheck className="mr-1.5 h-4 w-4" /> Escalação <span className="ml-1.5 text-xs text-muted-foreground">{detail.escalation.confirmed}/{detail.escalation.positions}</span></TabsTrigger>
                    <TabsTrigger value="entregas"><Package className="mr-1.5 h-4 w-4" /> Entregas{detail.briefings.length > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{detail.briefings.length}</span>}</TabsTrigger>
                    <TabsTrigger value="conversa"><MessageSquare className="mr-1.5 h-4 w-4" /> Conversa</TabsTrigger>
                    <TabsTrigger value="detalhes"><FileText className="mr-1.5 h-4 w-4" /> Detalhes</TabsTrigger>
                  </TabsList>
                </div>

                {/* ─── Escalação ─────────────────────────────────────────── */}
                <TabsContent value="escalacao" className="space-y-6">
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{detail.escalation.confirmed} de {detail.escalation.positions} escalados</span>
                        {detail.escalation.complete ? <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Escalação completa</Badge> : <span className="text-muted-foreground">faltam {detail.escalation.positions - detail.escalation.confirmed}</span>}
                      </div>
                      <Progress value={Math.min(100, (detail.escalation.confirmed / Math.max(1, detail.escalation.positions)) * 100)} />
                    </CardContent>
                  </Card>

                  {/* Minha situação */}
                  <Card className={mine?.status === "accepted" ? "border-emerald-500/40" : mine?.origin === "convocation" && mine.status === "pending" ? "border-amber-500/50" : undefined}>
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        {!mine || mine.status === "rejected" || mine.status === "withdrawn" ? (
                          <>
                            <p className="font-medium">Você ainda não está neste job</p>
                            <p className="text-sm text-muted-foreground">{isOpen ? "Candidate-se informando sua função. O gestor confirma a escalação." : "Este job não está recebendo candidaturas."}</p>
                          </>
                        ) : mine.status === "accepted" ? (
                          <>
                            <p className="font-medium text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Você está escalado{mine.team_role ? ` como ${mine.team_role}` : ""}</p>
                            <p className="text-sm text-muted-foreground">{job.startDate ? "A data já está reservada na sua agenda." : "Sem data definida ainda — a reserva na agenda entra quando o job ganhar data."}</p>
                          </>
                        ) : mine.origin === "convocation" ? (
                          <>
                            <p className="font-medium text-amber-700 dark:text-amber-300">Você foi convocado{mine.team_role ? ` como ${mine.team_role}` : ""}</p>
                            <p className="text-sm text-muted-foreground">Ao aceitar, sua escalação é confirmada e a data reservada na agenda.</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">Candidatura enviada</p>
                            <p className="text-sm text-muted-foreground">Aguardando o gestor confirmar a escalação.</p>
                          </>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(!mine || mine.status === "rejected" || mine.status === "withdrawn") && isOpen && (
                          <Button onClick={() => { setApplyRole(""); setApplyMessage(""); setApplyOpen(true); }}><UserPlus className="mr-2 h-4 w-4" /> Candidatar-se</Button>
                        )}
                        {mine?.status === "pending" && mine.origin === "convocation" && (
                          <>
                            <Button variant="outline" disabled={busy !== null} onClick={() => run("respond", () => teamsService.respond(teamId, jobId, mine.id, false), "Convocação recusada")}><X className="mr-1 h-4 w-4" /> Recusar</Button>
                            <Button disabled={busy !== null} onClick={() => run("respond", () => teamsService.respond(teamId, jobId, mine.id, true), "Escalação confirmada! Data reservada na sua agenda.")}>{busy === "respond" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />} Aceitar convocação</Button>
                          </>
                        )}
                        {mine?.status === "pending" && mine.origin === "candidate" && (
                          <Button variant="outline" disabled={busy !== null} onClick={() => run("withdraw", () => teamsService.withdraw(teamId, jobId, mine.id), "Candidatura retirada")}>Retirar candidatura</Button>
                        )}
                        {mine?.status === "accepted" && (
                          <>
                            <Button asChild variant="outline"><Link href="/dashboard/agenda"><Calendar className="mr-1 h-4 w-4" /> Minha agenda</Link></Button>
                            <Button variant="ghost" className="text-destructive hover:text-destructive" disabled={busy !== null} onClick={() => confirm({ title: "Desistir da escalação?", description: "O gestor será avisado e a reserva na sua agenda será liberada.", destructive: true, confirmLabel: "Desistir", onConfirm: () => run("withdraw", () => teamsService.withdraw(teamId, jobId, mine.id), "Você saiu da escalação") })}>Desistir</Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Escalados */}
                  <Card>
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2"><UserCheck className="h-4 w-4" /> Escalados ({confirmed.length})</CardTitle>
                      {canConvoke && <Button size="sm" onClick={openConvoke}><UserPlus className="mr-1 h-4 w-4" /> Convocar membro</Button>}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {confirmed.length === 0 ? (
                        <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-6 text-center">Ninguém escalado ainda.{isManager ? " Convoque membros ou confirme as candidaturas." : ""}</p>
                      ) : (
                        confirmed.map((app) => (
                          <PersonRow key={app.id} app={app}>
                            {app.candidate_id !== userProfile?.id && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Mensagem" disabled={busy === `chat:${app.candidate_id}`} onClick={() => openChat(app.candidate_id)}>
                                {busy === `chat:${app.candidate_id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                              </Button>
                            )}
                            {isManager && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild><Link href={`/profissionais/${app.candidate_id}`}><ExternalLink className="mr-2 h-4 w-4" /> Perfil e portfólio</Link></DropdownMenuItem>
                                  {app.contract_id ? (
                                    <DropdownMenuItem asChild><Link href={`/dashboard/contratos/${app.contract_id}`}><FileSignature className="mr-2 h-4 w-4" /> Ver contrato</Link></DropdownMenuItem>
                                  ) : isEmployer ? (
                                    <DropdownMenuItem asChild><Link href={`/dashboard/vagas/${jobId}/acordo/${app.id}`}><FileSignature className="mr-2 h-4 w-4" /> Acordo e contrato</Link></DropdownMenuItem>
                                  ) : null}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => confirm({ title: "Cancelar esta escalação?", description: `${app.profile?.display_name ?? "A pessoa"} será avisada e a reserva na agenda dela liberada.`, destructive: true, confirmLabel: "Cancelar escalação", onConfirm: () => run(`reject:${app.id}`, () => teamsService.reject(teamId, jobId, app.id), "Escalação cancelada") })}><X className="mr-2 h-4 w-4" /> Cancelar escalação</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </PersonRow>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {isManager && (pendingCandidates.length > 0 || pendingConvocations.length > 0) && (
                    <Card className="border-primary/30">
                      <CardHeader className="pb-3"><CardTitle className="text-base">Pendentes</CardTitle></CardHeader>
                      <CardContent className="space-y-2">
                        {pendingCandidates.map((app) => (
                          <PersonRow key={app.id} app={app}>
                            <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => run(`reject:${app.id}`, () => teamsService.reject(teamId, jobId, app.id), "Candidatura recusada")}><X className="mr-1 h-4 w-4" /> Recusar</Button>
                            <Button size="sm" disabled={busy !== null || detail.escalation.complete} title={detail.escalation.complete ? "Escalação completa — aumente a quantidade de profissionais no job" : undefined} onClick={() => run(`confirm:${app.id}`, () => teamsService.confirm(teamId, jobId, app.id), "Escalação confirmada — agenda reservada")}>
                              {busy === `confirm:${app.id}` ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />} Confirmar
                            </Button>
                          </PersonRow>
                        ))}
                        {pendingConvocations.map((app) => (
                          <PersonRow key={app.id} app={app}>
                            <Badge variant="outline" className="text-[11px]">Aguardando resposta</Badge>
                            <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => run(`reject:${app.id}`, () => teamsService.reject(teamId, jobId, app.id), "Convocação cancelada")}><X className="mr-1 h-4 w-4" /> Cancelar</Button>
                          </PersonRow>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {isManager && history.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground">Histórico ({history.length})</summary>
                      <div className="mt-2 space-y-2 opacity-70">
                        {history.map((app) => (
                          <PersonRow key={app.id} app={app}><Badge variant="secondary" className="text-[11px]">{app.status === "rejected" ? "Recusado" : "Retirou"}</Badge></PersonRow>
                        ))}
                      </div>
                    </details>
                  )}
                </TabsContent>

                {/* ─── Entregas ──────────────────────────────────────────── */}
                <TabsContent value="entregas" className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">Acompanhamento de entregas</h2>
                      <p className="text-sm text-muted-foreground">Cada briefing ligado ao job traz o roteiro do dia, a equipe com funções e os entregáveis com status.</p>
                    </div>
                    {isManager && (
                      <Button onClick={() => { setBriefingTitle(job.title); setBriefingOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Criar briefing deste job</Button>
                    )}
                  </div>

                  <JobFinanceCard teamId={teamId} jobId={jobId} jobTitle={job.title} isManager={isManager} />

                  {job.deliverables && (
                    <Card className="bg-muted/30">
                      <CardContent className="p-4 text-sm">
                        <p className="font-medium mb-1 inline-flex items-center gap-1"><Package className="h-4 w-4" /> Entregáveis combinados no job</p>
                        <p className="whitespace-pre-line text-muted-foreground">{job.deliverables}</p>
                        {job.deliveryDeadline && <p className="mt-2 text-muted-foreground"><strong className="text-foreground">Prazo:</strong> {job.deliveryDeadline}</p>}
                      </CardContent>
                    </Card>
                  )}

                  {detail.briefings.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="py-12 text-center space-y-2">
                        <ClipboardList className="h-10 w-10 mx-auto opacity-30" />
                        <p className="font-medium">Nenhum briefing ligado a este job</p>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                          {isManager ? "Crie o briefing a partir do job: título, data, local e escalados entram automaticamente. Depois acompanhe a execução e as entregas por aqui." : "Quando o gestor criar o briefing do job, ele aparece aqui com o roteiro e as entregas."}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    detail.briefings.map((b) => {
                      const pct = b.items_total > 0 ? Math.round((b.items_done / b.items_total) * 100) : 0;
                      const cfg = BRIEFING_STATUS_CONFIG[b.status as BriefingStatus];
                      return (
                        <Card key={b.id}>
                          <CardContent className="p-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link href={`/dashboard/briefing-pro/${b.id}`} className="font-semibold hover:underline">{b.title}</Link>
                                  {cfg && <Badge className={cfg.className} variant="secondary">{cfg.label}</Badge>}
                                  <Badge variant="outline">{BRIEFING_TYPE_LABELS[b.briefing_type as keyof typeof BRIEFING_TYPE_LABELS] ?? b.briefing_type}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {b.event_date ? `${formatTeamDate(b.event_date)}${b.event_time ? ` às ${b.event_time.slice(0, 5)}` : ""} · ` : ""}
                                  {b.items_done}/{b.items_total} itens concluídos
                                </p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Button asChild variant="outline" size="sm"><Link href={`/dashboard/briefing-pro/${b.id}`}><ClipboardList className="mr-1 h-4 w-4" /> Abrir</Link></Button>
                                <Button asChild size="sm"><Link href={`/dashboard/briefing-pro/${b.id}/execucao`}><PlayCircle className="mr-1 h-4 w-4" /> Execução</Link></Button>
                              </div>
                            </div>
                            <Progress value={pct} />
                            {b.deliverables.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Entregáveis</p>
                                {b.deliverables.map((d) => {
                                  const dc = DELIVERABLE_STATUS_CONFIG[d.status as DeliverableStatus];
                                  return (
                                    <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                                      <span className="min-w-0 truncate">{d.quantity > 1 ? `${d.quantity}× ` : ""}{d.title}{d.due_date ? <span className="text-xs text-muted-foreground"> · até {formatTeamDate(d.due_date)}</span> : null}</span>
                                      {dc && <Badge className={dc.className} variant="secondary">{dc.label}</Badge>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}

                  {confirmed.some((a) => a.contract_id) && (
                    <Card className="bg-muted/30">
                      <CardContent className="p-4 text-sm space-y-1">
                        <p className="font-medium inline-flex items-center gap-1"><FileSignature className="h-4 w-4" /> Contratos dos escalados</p>
                        {confirmed.filter((a) => a.contract_id).map((a) => (
                          <p key={a.id}><Link href={`/dashboard/contratos/${a.contract_id}`} className="text-primary hover:underline">{a.profile?.display_name ?? "Escalado"}</Link></p>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* ─── Conversa ──────────────────────────────────────────── */}
                <TabsContent value="conversa">
                  <TeamChatLazy teamId={teamId} jobId={jobId} currentUserId={userProfile?.id ?? ""} title={`Conversa do job: ${job.title}`} disabled={status.status === "closed"} />
                </TabsContent>

                {/* ─── Detalhes ──────────────────────────────────────────── */}
                <TabsContent value="detalhes" className="space-y-4">
                  <Card>
                    <CardContent className="p-5 space-y-4 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary"><Briefcase className="mr-1 h-3 w-3" /> {jobTypeLabel(job.jobType)}</Badge>
                        <Badge variant="secondary">{job.category}</Badge>
                        {job.requiresInvoice && <Badge variant="outline"><Receipt className="mr-1 h-3 w-3" /> Exige nota fiscal</Badge>}
                      </div>
                      <div>
                        <p className="font-medium mb-1">Descrição</p>
                        <p className="whitespace-pre-line text-muted-foreground">{job.description}</p>
                      </div>
                      {job.requirements && <div><p className="font-medium mb-1">Requisitos</p><p className="whitespace-pre-line text-muted-foreground">{job.requirements}</p></div>}
                      {job.paymentTerms && <div><p className="font-medium mb-1">Pagamento</p><p className="whitespace-pre-line text-muted-foreground">{job.paymentTerms}</p></div>}
                      <p className="text-xs text-muted-foreground">Publicado por {job.employerName}.</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>
      <Footer />

      {/* Candidatar-se */}
      <Dialog open={applyOpen} onOpenChange={(o) => !o && setApplyOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Candidatar-se ao job</DialogTitle>
            <DialogDescription>Informe com que função você quer participar. O gestor confirma a escalação.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <RoleField value={applyRole} onChange={setApplyRole} />
            <div className="space-y-2">
              <Label>Mensagem (opcional)</Label>
              <Textarea value={applyMessage} onChange={(e) => setApplyMessage(e.target.value)} rows={3} maxLength={2000} placeholder="Disponibilidade, equipamento, observações..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancelar</Button>
            <Button disabled={busy === "apply"} onClick={async () => { await run("apply", () => teamsService.apply(teamId, jobId, { team_role: applyRole.trim() || undefined, message: applyMessage.trim() || undefined }), "Candidatura enviada ao gestor"); setApplyOpen(false); }}>
              {busy === "apply" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />} Enviar candidatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convocar */}
      <Dialog open={convokeOpen} onOpenChange={(o) => !o && setConvokeOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convocar membro</DialogTitle>
            <DialogDescription>O membro recebe a convocação e confirma a escalação ao aceitar. Convocar a si mesmo escala na hora.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Membro</Label>
              {members === null ? (
                <Skeleton className="h-10 w-full" />
              ) : convokeCandidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todos os membros já estão escalados ou com pendência neste job.</p>
              ) : (
                <Select value={convokeUser} onValueChange={(v) => { setConvokeUser(v); const m = convokeCandidates.find((c) => c.user_id === v); if (m?.job_role && !convokeRole) setConvokeRole(m.job_role); }}>
                  <SelectTrigger><SelectValue placeholder="Escolha quem convocar" /></SelectTrigger>
                  <SelectContent>
                    {convokeCandidates.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.profile?.display_name ?? "Membro"}{m.user_id === userProfile?.id ? " (você)" : ""}{m.job_role ? ` · ${m.job_role}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <RoleField value={convokeRole} onChange={setConvokeRole} />
            <div className="space-y-2">
              <Label>Mensagem (opcional)</Label>
              <Textarea value={convokeMessage} onChange={(e) => setConvokeMessage(e.target.value)} rows={2} maxLength={2000} placeholder="Ex.: preciso de você das 8h às 14h" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvokeOpen(false)}>Cancelar</Button>
            <Button disabled={!convokeUser || busy === "convoke"} onClick={async () => { await run("convoke", () => teamsService.convoke(teamId, jobId, { user_id: convokeUser, team_role: convokeRole.trim() || undefined, message: convokeMessage.trim() || undefined }), convokeUser === userProfile?.id ? "Você foi escalado" : "Convocação enviada"); setConvokeOpen(false); setConvokeUser(""); setConvokeRole(""); setConvokeMessage(""); }}>
              {busy === "convoke" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />} Convocar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Criar briefing */}
      <Dialog open={briefingOpen} onOpenChange={(o) => !o && setBriefingOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar briefing deste job</DialogTitle>
            <DialogDescription>Título, data, horário, local, objetivo e entregáveis vêm do job. Você edita tudo no Briefing Pro depois.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={briefingTitle} onChange={(e) => setBriefingTitle(e.target.value)} maxLength={300} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={briefingType} onValueChange={setBriefingType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(BRIEFING_TYPE_LABELS) as Array<keyof typeof BRIEFING_TYPE_LABELS>).map((t) => (
                    <SelectItem key={t} value={t}>{BRIEFING_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={briefingCrew} onCheckedChange={(c) => setBriefingCrew(c === true)} className="mt-0.5" />
              <span>Escalados entram como <strong>equipe do trabalho</strong> (nome + função) — pronto para atribuir quem faz o quê.</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={briefingMembers} onCheckedChange={(c) => setBriefingMembers(c === true)} className="mt-0.5" />
              <span>Escalados também <strong>ganham acesso</strong> ao briefing (visualizadores) e recebem o aviso para confirmar a leitura.</span>
            </label>
            <p className="text-xs text-muted-foreground">Usa a cota de briefings e de membros do seu plano.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBriefingOpen(false)}>Cancelar</Button>
            <Button disabled={busy === "briefing"} onClick={async () => {
              setBusy("briefing");
              try {
                const b = await teamsService.createBriefing(teamId, jobId, { title: briefingTitle.trim() || undefined, briefing_type: briefingType, include_crew: briefingCrew, add_members: briefingMembers });
                toast.success("Briefing criado a partir do job");
                setBriefingOpen(false);
                router.push(`/dashboard/briefing-pro/${b.id}`);
              } catch (err) {
                if (!isPlanErrorBody((err as { response?: { data?: unknown } })?.response?.data)) toast.error(teamsApiError(err, "Não foi possível criar o briefing"));
                setBusy(null);
              }
            }}>
              {busy === "briefing" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardList className="mr-2 h-4 w-4" />} Criar briefing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeamChatLazy(props: { teamId: string; jobId: string; currentUserId: string; title: string; disabled: boolean }) {
  return <TeamChat {...props} />;
}

export default function TeamJobPage() {
  return (
    <Suspense fallback={null}>
      <JobDetailInner />
    </Suspense>
  );
}
