"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Users, Plus, Briefcase, MessageSquare, ChevronRight, Loader2, Mail, Archive, Crown, Shield, Link2,
} from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/lib/plans/use-plan";
import { UpgradeButton } from "@/components/plan/plan-gate";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";
import { teamsService, teamsApiError } from "@/lib/teams-service";
import {
  TEAM_COLORS, TEAM_ROLE_LABELS, initials,
  type TeamInvitationRow, type TeamListRow,
} from "@/lib/teams-types";

function CreateTeamDialog({
  open, onClose, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (teamId: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(TEAM_COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (name.trim().length < 2) {
      toast.error("Dê um nome ao time (mínimo 2 caracteres)");
      return;
    }
    setSaving(true);
    try {
      const team = await teamsService.create({ name: name.trim(), description: description.trim() || undefined, color });
      toast.success("Time criado! Agora convide as pessoas.");
      onCreated(team.id);
    } catch (err) {
      if (!isPlanErrorBody((err as { response?: { data?: unknown } })?.response?.data)) toast.error(teamsApiError(err, "Erro ao criar o time"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo time</DialogTitle>
          <DialogDescription>
            Um time reúne os profissionais com quem você trabalha. Você vê a agenda de cada um,
            publica jobs só para eles e confirma quem vai em cada trabalho.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Nome do time</Label>
            <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Equipe Casamentos" maxLength={80} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-desc">Descrição (opcional)</Label>
            <Textarea id="team-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Para que serve este time, região, tipo de trabalho..." rows={3} maxLength={1000} />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Criar time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvitationCard({ row, onDone }: { row: TeamInvitationRow; onDone: () => void }) {
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);

  async function respond(accept: boolean) {
    setBusy(accept ? "accept" : "decline");
    try {
      await teamsService.respondInvitation(row.team.id, row.membership.id, accept);
      toast.success(accept ? `Você entrou no time ${row.team.name}!` : "Convite recusado");
      onDone();
    } catch (err) {
      toast.error(teamsApiError(err, "Não foi possível responder ao convite"));
      setBusy(null);
    }
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-white font-semibold" style={{ backgroundColor: row.team.color }}>
          {initials(row.team.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{row.team.name}</p>
          <p className="text-sm text-muted-foreground">
            {row.invited_by_profile?.display_name ?? "Alguém"} convidou você
            {row.membership.job_role ? ` como ${row.membership.job_role}` : ""} · {row.members_count} {row.members_count === 1 ? "membro" : "membros"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => respond(false)} disabled={busy !== null}>
            {busy === "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Recusar"}
          </Button>
          <Button size="sm" onClick={() => respond(true)} disabled={busy !== null}>
            {busy === "accept" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Aceitar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamCard({ row }: { row: TeamListRow }) {
  const archived = !!row.team.archived_at;
  return (
    <Link href={`/dashboard/times/${row.team.id}`} className="block h-full group">
      <Card className={`h-full transition-all hover:shadow-md hover:border-primary/40 ${archived ? "opacity-60" : ""}`}>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-white font-semibold" style={{ backgroundColor: row.team.color }}>
              {initials(row.team.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{row.team.name}</h3>
                {row.unread_count > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                    {row.unread_count > 99 ? "99+" : row.unread_count}
                  </span>
                )}
              </div>
              {row.team.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{row.team.description}</p>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={row.my_role === "member" ? "secondary" : "default"} className="text-[11px]">
              {row.my_role === "owner" ? <Crown className="mr-1 h-3 w-3" /> : row.my_role === "manager" ? <Shield className="mr-1 h-3 w-3" /> : null}
              {TEAM_ROLE_LABELS[row.my_role]}
            </Badge>
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {row.members_count}</span>
            <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {row.open_jobs_count} {row.open_jobs_count === 1 ? "job aberto" : "jobs abertos"}</span>
            {row.unread_count > 0 && <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> novas mensagens</span>}
            {archived && <Badge variant="outline" className="text-[11px]"><Archive className="mr-1 h-3 w-3" /> Arquivado</Badge>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function TimesPageInner() {
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = usePlan();

  const [teams, setTeams] = useState<TeamListRow[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await teamsService.listMine();
      setTeams(data.teams);
      setInvitations(data.invitations);
    } catch (err) {
      toast.error(teamsApiError(err, "Erro ao carregar seus times"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !userProfile) router.push("/login");
  }, [authLoading, userProfile, router]);

  useEffect(() => {
    if (userProfile) void load();
  }, [userProfile, load]);

  const ownedActive = teams.filter((t) => t.my_role === "owner" && !t.team.archived_at).length;
  const teamsLimit = plan.limitOf("teams");
  const canCreate = plan.allows("teams", ownedActive);
  const showInvitesFirst = searchParams.get("tab") === "convites";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <span className="p-2 rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"><Users className="h-6 w-6" /></span>
                Times
              </h1>
              <p className="text-muted-foreground mt-2">
                Monte sua equipe, veja a disponibilidade de cada um, publique jobs só para o time e confirme a escalação.
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1">
              {canCreate ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Novo time
                </Button>
              ) : (
                <UpgradeButton size="default">Mais times no Pro</UpgradeButton>
              )}
              {teamsLimit !== null && (
                <span className="text-xs text-muted-foreground">
                  {ownedActive} de {teamsLimit} {teamsLimit === 1 ? "time" : "times"} no plano {plan.label}
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
            </div>
          ) : (
            <>
              {invitations.length > 0 && (
                <section className={`space-y-3 ${showInvitesFirst ? "ring-2 ring-primary/30 rounded-2xl p-3 -m-3" : ""}`} id="convites">
                  <h2 className="font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> Convites pendentes</h2>
                  {invitations.map((row) => <InvitationCard key={row.membership.id} row={row} onDone={load} />)}
                </section>
              )}

              {teams.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-14 text-center space-y-4">
                    <Users className="h-12 w-12 mx-auto opacity-30" />
                    <div>
                      <p className="font-medium">Você ainda não está em nenhum time</p>
                      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                        Crie um time para reunir sua equipe, ou peça o link de convite a quem gerencia um time do qual você faz parte.
                      </p>
                    </div>
                    {canCreate ? (
                      <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> Criar meu primeiro time</Button>
                    ) : (
                      <UpgradeButton />
                    )}
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><Link2 className="h-3 w-3" /> Recebeu um link /times/entrar/...? É só abrir.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {teams.map((row) => <TeamCard key={row.team.id} row={row} />)}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
      <CreateTeamDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          router.push(`/dashboard/times/${id}?tab=membros`);
        }}
      />
    </div>
  );
}

export default function TimesPage() {
  return (
    <Suspense fallback={null}>
      <TimesPageInner />
    </Suspense>
  );
}
