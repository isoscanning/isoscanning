"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Crown, Shield, Star, MapPin, MessageSquare, ExternalLink, MoreVertical, UserMinus, Pencil, Search, Loader2,
  UserPlus, Link2, Copy, RefreshCw, X, CalendarDays, UserCheck, Clock,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-service";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { usePlan } from "@/lib/plans/use-plan";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";
import { teamsService, teamsApiError } from "@/lib/teams-service";
import {
  TEAM_JOB_ROLE_SUGGESTIONS, TEAM_ROLE_LABELS, formatTeamDate, initials, isManagerRole,
  type TeamDetail, type TeamMemberView, type TeamProfileSummary,
} from "@/lib/teams-types";
import { AvailabilityGrid } from "./availability-grid";

function RoleSuggestions({ value, onPick }: { value: string; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TEAM_JOB_ROLE_SUGGESTIONS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          className={`rounded-full border px-2.5 py-0.5 text-xs transition ${value === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function InviteDialog({ teamId, open, onClose, onInvited, isOwner }: { teamId: string; open: boolean; onClose: () => void; onInvited: () => void; isOwner: boolean }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TeamProfileSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<TeamProfileSummary | null>(null);
  const [jobRole, setJobRole] = useState("");
  const [role, setRole] = useState<"member" | "manager">("member");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setQ(""); setResults([]); setSelected(null); setJobRole(""); setRole("member");
    }
  }, [open]);

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await teamsService.searchCandidates(teamId, q.trim()));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [q, open, teamId]);

  async function invite() {
    if (!selected) return;
    setSaving(true);
    try {
      await teamsService.invite(teamId, { user_id: selected.id, role, job_role: jobRole.trim() || undefined });
      toast.success(`Convite enviado para ${selected.display_name}`);
      onInvited();
      onClose();
    } catch (err) {
      if (!isPlanErrorBody((err as { response?: { data?: unknown } })?.response?.data)) toast.error(teamsApiError(err, "Não foi possível convidar"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar para o time</DialogTitle>
          <DialogDescription>Busque um profissional da plataforma pelo nome. Ele recebe o convite e entra ao aceitar.</DialogDescription>
        </DialogHeader>
        {!selected ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou @usuário" className="pl-9" autoFocus />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {searching && <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Buscando...</p>}
              {!searching && q.trim().length >= 2 && results.length === 0 && (
                <p className="text-sm text-muted-foreground">Ninguém encontrado. A pessoa precisa ter conta na IsoScanning — envie o link de convite do time.</p>
              )}
              {results.map((p) => (
                <button key={p.id} type="button" onClick={() => setSelected(p)} className="w-full flex items-center gap-3 rounded-lg p-2 text-left hover:bg-muted">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <span className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">{initials(p.display_name)}</span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.display_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{[p.specialties[0] ?? p.specialty, [p.city, p.state].filter(Boolean).join("/")].filter(Boolean).join(" · ")}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <span className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">{initials(selected.display_name)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{selected.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">{selected.specialties.join(", ") || selected.specialty || "—"}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label="Trocar"><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2">
              <Label>Função no time</Label>
              <Input value={jobRole} onChange={(e) => setJobRole(e.target.value)} placeholder="Ex.: Foto, Drone, Vídeo" maxLength={60} />
              <RoleSuggestions value={jobRole} onPick={setJobRole} />
            </div>
            {isOwner && (
              <div className="space-y-2">
                <Label>Papel</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant={role === "member" ? "default" : "outline"} onClick={() => setRole("member")}>Membro</Button>
                  <Button type="button" size="sm" variant={role === "manager" ? "default" : "outline"} onClick={() => setRole("manager")}><Shield className="mr-1 h-3.5 w-3.5" /> Gestor</Button>
                </div>
                <p className="text-xs text-muted-foreground">Gestores publicam jobs, escalam e convidam membros.</p>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={invite} disabled={!selected || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />} Convidar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditMemberDialog({ teamId, member, isOwner, onClose, onSaved }: { teamId: string; member: TeamMemberView | null; isOwner: boolean; onClose: () => void; onSaved: () => void }) {
  const [jobRole, setJobRole] = useState("");
  const [notes, setNotes] = useState("");
  const [role, setRole] = useState<"member" | "manager">("member");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member) {
      setJobRole(member.job_role ?? "");
      setNotes(member.notes ?? "");
      setRole(member.role === "manager" ? "manager" : "member");
    }
  }, [member]);

  async function save() {
    if (!member) return;
    setSaving(true);
    try {
      await teamsService.updateMember(teamId, member.id, {
        job_role: jobRole.trim(),
        notes: notes.trim(),
        ...(isOwner && member.role !== "owner" ? { role } : {}),
      });
      toast.success("Membro atualizado");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(teamsApiError(err, "Não foi possível salvar"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member?.profile?.display_name ?? "Membro"}</DialogTitle>
          <DialogDescription>Função no time e observações internas (só gestores veem).</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Função no time</Label>
            <Input value={jobRole} onChange={(e) => setJobRole(e.target.value)} placeholder="Ex.: Foto, Drone, Vídeo" maxLength={60} />
            <RoleSuggestions value={jobRole} onPick={setJobRole} />
          </div>
          {isOwner && member?.role !== "owner" && (
            <div className="space-y-2">
              <Label>Papel</Label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={role === "member" ? "default" : "outline"} onClick={() => setRole("member")}>Membro</Button>
                <Button type="button" size="sm" variant={role === "manager" ? "default" : "outline"} onClick={() => setRole("manager")}><Shield className="mr-1 h-3.5 w-3.5" /> Gestor</Button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} placeholder="Equipamento próprio, restrições de horário, cachê combinado..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InviteLinkCard({ detail, onChanged }: { detail: TeamDetail; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const token = detail.team.invite_token;
  const url = token && typeof window !== "undefined" ? `${window.location.origin}/times/entrar/${token}` : null;

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      onChanged();
    } catch (err) {
      toast.error(teamsApiError(err, "Não foi possível atualizar o link"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" /> Link de convite</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Quem abrir o link entra no time como <strong>{detail.team.invite_role === "manager" ? "gestor" : "membro"}</strong> (precisa ter conta na IsoScanning). Ideal para mandar no WhatsApp do grupo.
        </p>
        {url ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input readOnly value={url} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copiado"); }}><Copy className="mr-1 h-4 w-4" /> Copiar</Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => run(() => teamsService.enableInviteLink(detail.team.id, { regenerate: true }), "Novo link gerado — o antigo deixou de funcionar")}><RefreshCw className="mr-1 h-4 w-4" /> Novo</Button>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(() => teamsService.disableInviteLink(detail.team.id), "Link desativado")}><X className="mr-1 h-4 w-4" /> Desativar</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" disabled={busy || !!detail.team.archived_at} onClick={() => run(() => teamsService.enableInviteLink(detail.team.id), "Link de convite ativado")}>
            <Link2 className="mr-1 h-4 w-4" /> Ativar link de convite
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function MembersTab({ detail, currentUserId, onChanged }: { detail: TeamDetail; currentUserId: string; onChanged: () => void }) {
  const router = useRouter();
  const plan = usePlan();
  const { confirm, dialog } = useConfirmDialog();
  const isManager = isManagerRole(detail.my_role);
  const isOwner = detail.my_role === "owner";
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMemberView | null>(null);
  const [chatBusy, setChatBusy] = useState<string | null>(null);

  const membersLimit = plan.limitOf("teamMembers");
  const nonOwnerCount = detail.stats.members_active - 1 + detail.stats.members_invited;

  async function openChat(userId: string) {
    setChatBusy(userId);
    try {
      const res = await apiClient.post("/chat/conversations", { participantId: userId });
      router.push(`/dashboard/chat/${res.data.id}`);
    } catch (err) {
      toast.error(teamsApiError(err, "Não foi possível abrir a conversa"));
      setChatBusy(null);
    }
  }

  function remove(member: TeamMemberView) {
    const isSelf = member.user_id === currentUserId;
    confirm({
      title: isSelf ? "Sair do time?" : `Remover ${member.profile?.display_name ?? "membro"}?`,
      description: isSelf
        ? "Você deixará de ver os jobs e o chat deste time. Candidaturas pendentes serão retiradas."
        : "A pessoa perde o acesso ao time. Candidaturas pendentes em jobs do time são retiradas; escalações já confirmadas continuam e podem ser canceladas no job.",
      destructive: true,
      confirmLabel: isSelf ? "Sair" : "Remover",
      onConfirm: async () => {
        try {
          await teamsService.removeMember(detail.team.id, member.id);
          toast.success(isSelf ? "Você saiu do time" : "Membro removido");
          if (isSelf) router.push("/dashboard/times");
          else onChanged();
        } catch (err) {
          toast.error(teamsApiError(err, "Não foi possível remover"));
        }
      },
    });
  }

  function cancelInvite(member: TeamMemberView) {
    confirm({
      title: "Cancelar convite?",
      description: `${member.profile?.display_name ?? "A pessoa"} não poderá mais aceitar este convite.`,
      confirmLabel: "Cancelar convite",
      onConfirm: async () => {
        try {
          await teamsService.removeMember(detail.team.id, member.id);
          onChanged();
        } catch (err) {
          toast.error(teamsApiError(err, "Não foi possível cancelar"));
        }
      },
    });
  }

  return (
    <div className="space-y-6">
      {dialog}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Membros do time</h2>
          <p className="text-sm text-muted-foreground">
            {detail.stats.members_active} {detail.stats.members_active === 1 ? "ativo" : "ativos"}
            {detail.stats.members_invited > 0 ? ` · ${detail.stats.members_invited} ${detail.stats.members_invited === 1 ? "convite pendente" : "convites pendentes"}` : ""}
            {isManager && membersLimit !== null ? ` · limite do plano: ${nonOwnerCount}/${membersLimit}` : ""}
          </p>
        </div>
        {isManager && !detail.team.archived_at && (
          <Button onClick={() => setInviteOpen(true)}><UserPlus className="mr-2 h-4 w-4" /> Convidar</Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {detail.members.map((m) => {
          const p = m.profile;
          const isSelf = m.user_id === currentUserId;
          const specialties = p?.specialties?.length ? p.specialties : p?.specialty ? [p.specialty] : [];
          return (
            <Card key={m.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Link href={`/profissionais/${m.user_id}`} className="shrink-0">
                    {p?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <span className="h-12 w-12 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center">{initials(p?.display_name)}</span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link href={`/profissionais/${m.user_id}`} className="font-semibold hover:underline truncate">{p?.display_name ?? "Membro"}</Link>
                      {isSelf && <span className="text-xs text-muted-foreground">(você)</span>}
                      <Badge variant={m.role === "member" ? "secondary" : "default"} className="text-[10px]">
                        {m.role === "owner" ? <Crown className="mr-1 h-3 w-3" /> : m.role === "manager" ? <Shield className="mr-1 h-3 w-3" /> : null}
                        {TEAM_ROLE_LABELS[m.role]}
                      </Badge>
                    </div>
                    {m.job_role && <p className="text-sm text-primary font-medium mt-0.5">{m.job_role}</p>}
                    <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {specialties.length > 0 && <span>{specialties.slice(0, 3).join(", ")}</span>}
                      {(p?.city || p?.state) && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {[p?.city, p?.state].filter(Boolean).join("/")}</span>}
                      {p?.average_rating ? <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {Number(p.average_rating).toFixed(1)} ({p.total_reviews ?? 0})</span> : null}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1"><UserCheck className="h-3 w-3" /> {m.escalations_count} {m.escalations_count === 1 ? "escalação" : "escalações"} no time</span>
                      {m.next_job_date && <span className="inline-flex items-center gap-1 text-primary"><CalendarDays className="h-3 w-3" /> próximo: {formatTeamDate(m.next_job_date)}</span>}
                      {!m.next_job_date && m.last_job_date && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> último: {formatTeamDate(m.last_job_date)}</span>}
                    </p>
                    {isManager && m.notes && <p className="text-xs text-muted-foreground mt-1.5 italic line-clamp-2">{m.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!isSelf && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Mensagem" onClick={() => openChat(m.user_id)} disabled={chatBusy === m.user_id}>
                        {chatBusy === m.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link href={`/profissionais/${m.user_id}`}><ExternalLink className="mr-2 h-4 w-4" /> Perfil, portfólio e agenda</Link></DropdownMenuItem>
                        {!isSelf && <DropdownMenuItem onClick={() => openChat(m.user_id)}><MessageSquare className="mr-2 h-4 w-4" /> Enviar mensagem</DropdownMenuItem>}
                        {isManager && !detail.team.archived_at && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setEditing(m)}><Pencil className="mr-2 h-4 w-4" /> Função e observações</DropdownMenuItem>
                          </>
                        )}
                        {m.role !== "owner" && (isSelf || (isManager && (m.role !== "manager" || isOwner))) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => remove(m)}>
                              <UserMinus className="mr-2 h-4 w-4" /> {isSelf ? "Sair do time" : "Remover do time"}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isManager && detail.invited.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-3"><CardTitle className="text-base">Convites pendentes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {detail.invited.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                <span className="h-8 w-8 rounded-full bg-muted text-xs font-semibold flex items-center justify-center">{initials(m.profile?.display_name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.profile?.display_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{m.job_role || "sem função definida"} · convidado por {m.invited_by_profile?.display_name ?? "—"}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => cancelInvite(m)}><X className="mr-1 h-4 w-4" /> Cancelar</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isManager && <InviteLinkCard detail={detail} onChanged={onChanged} />}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Disponibilidade do time</CardTitle>
          <p className="text-sm text-muted-foreground">O que cada membro publica na própria agenda, mais as escalações deste time. Para reservar, publique um job e escale.</p>
        </CardHeader>
        <CardContent>
          <AvailabilityGrid teamId={detail.team.id} members={detail.members} />
        </CardContent>
      </Card>

      <InviteDialog teamId={detail.team.id} open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={onChanged} isOwner={isOwner} />
      <EditMemberDialog teamId={detail.team.id} member={editing} isOwner={isOwner} onClose={() => setEditing(null)} onSaved={onChanged} />
    </div>
  );
}
