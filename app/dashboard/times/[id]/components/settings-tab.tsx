"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Archive, ArchiveRestore, Trash2, LogOut, Loader2, Save, Shield } from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";
import { teamsService, teamsApiError } from "@/lib/teams-service";
import { TEAM_COLORS, isManagerRole, type TeamDetail } from "@/lib/teams-types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { companiesService, type Company } from "@/lib/finances-service";

export function SettingsTab({ detail, currentUserId, onChanged, onLeftOrDeleted }: { detail: TeamDetail; currentUserId: string; onChanged: () => void; onLeftOrDeleted: () => void }) {
  const isManager = isManagerRole(detail.my_role);
  const isOwner = detail.my_role === "owner";
  const archived = !!detail.team.archived_at;
  const { confirm, dialog } = useConfirmDialog();

  const [name, setName] = useState(detail.team.name);
  const [description, setDescription] = useState(detail.team.description ?? "");
  const [color, setColor] = useState(detail.team.color);
  const [inviteRole, setInviteRole] = useState<"member" | "manager">(detail.team.invite_role);
  // Empresa dona do time (SQL 82): só o dono liga/desliga, entre empresas que administra
  const [companyId, setCompanyId] = useState<string>(detail.team.company_id ?? "");
  const [companies, setCompanies] = useState<Company[] | null>(null);
  useEffect(() => {
    if (!isOwner) return;
    companiesService.listAdministered().then(setCompanies).catch(() => setCompanies([]));
  }, [isOwner]);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(detail.team.name);
    setDescription(detail.team.description ?? "");
    setColor(detail.team.color);
    setInviteRole(detail.team.invite_role);
  }, [detail.team]);

  async function save() {
    if (name.trim().length < 2) {
      toast.error("O nome precisa ter pelo menos 2 caracteres");
      return;
    }
    setSaving(true);
    try {
      await teamsService.update(detail.team.id, {
        name: name.trim(),
        description: description.trim(),
        color,
        invite_role: inviteRole,
        ...(isOwner ? { company_id: companyId || null } : {}),
      });
      toast.success("Time atualizado");
      onChanged();
    } catch (err) {
      toast.error(teamsApiError(err, "Não foi possível salvar"));
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive() {
    setBusy(true);
    try {
      if (archived) await teamsService.unarchive(detail.team.id);
      else await teamsService.archive(detail.team.id);
      toast.success(archived ? "Time reativado" : "Time arquivado");
      onChanged();
    } catch (err) {
      if (!isPlanErrorBody((err as { response?: { data?: unknown } })?.response?.data)) toast.error(teamsApiError(err, "Não foi possível alterar"));
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    confirm({
      title: "Excluir o time?",
      description: "Só é possível excluir times sem jobs publicados. Membros e avisos são apagados. Esta ação não pode ser desfeita.",
      destructive: true,
      confirmLabel: "Excluir time",
      onConfirm: async () => {
        try {
          await teamsService.remove(detail.team.id);
          onLeftOrDeleted();
        } catch (err) {
          toast.error(teamsApiError(err, "Não foi possível excluir"));
        }
      },
    });
  }

  function leave() {
    const me = detail.members.find((m) => m.user_id === currentUserId);
    if (!me) return;
    confirm({
      title: "Sair do time?",
      description: "Você deixará de ver os jobs e o chat deste time. Candidaturas pendentes serão retiradas.",
      destructive: true,
      confirmLabel: "Sair",
      onConfirm: async () => {
        try {
          await teamsService.removeMember(detail.team.id, me.id);
          onLeftOrDeleted();
        } catch (err) {
          toast.error(teamsApiError(err, "Não foi possível sair"));
        }
      },
    });
  }

  return (
    <div className="space-y-6">
      {dialog}
      {isManager && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Dados do time</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="t-name">Nome</Label>
              <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} disabled={archived} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-desc">Descrição</Label>
              <Textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} disabled={archived} />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {TEAM_COLORS.map((c) => (
                  <button key={c} type="button" aria-label={`Cor ${c}`} disabled={archived} onClick={() => setColor(c)} className={`h-8 w-8 rounded-full border-2 transition ${color === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            {isOwner && (
              <div className="space-y-2">
                <Label>Este time pertence a</Label>
                <Select value={companyId || "personal"} onValueChange={(v) => setCompanyId(v === "personal" ? "" : v)} disabled={archived || companies === null}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Mim (time pessoal, autônomo)</SelectItem>
                    {(companies ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Time de empresa: contratos e projetos dos jobs caem no financeiro da empresa e os membros podem receber acesso a ele.
                  {companies !== null && companies.length === 0 ? " Você ainda não cadastrou nenhuma empresa — faça isso em Empresas, no painel." : ""}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Quem entra pelo link de convite vira</Label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={inviteRole === "member" ? "default" : "outline"} disabled={archived} onClick={() => setInviteRole("member")}>Membro</Button>
                <Button type="button" size="sm" variant={inviteRole === "manager" ? "default" : "outline"} disabled={archived} onClick={() => setInviteRole("manager")}><Shield className="mr-1 h-3.5 w-3.5" /> Gestor</Button>
              </div>
            </div>
            <Button onClick={save} disabled={saving || archived}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Papéis</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p><strong className="text-foreground">Dono</strong>: tudo, inclusive trocar papéis, arquivar e excluir o time.</p>
          <p><strong className="text-foreground">Gestor</strong>: convida membros, publica jobs, convoca, confirma a escalação e publica avisos.</p>
          <p><strong className="text-foreground">Membro</strong>: vê o time, os jobs e o chat; se candidata e responde convocações.</p>
        </CardContent>
      </Card>

      {isOwner ? (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3"><CardTitle className="text-base">Zona de perigo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm">{archived ? "Reativar time" : "Arquivar time"}</p>
                <p className="text-xs text-muted-foreground">{archived ? "Volta a permitir jobs, convites e chat." : "Somente leitura para todos; o histórico de jobs e escalações fica preservado."}</p>
              </div>
              <Button variant="outline" onClick={toggleArchive} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : archived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                {archived ? "Reativar" : "Arquivar"}
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm">Excluir time</p>
                <p className="text-xs text-muted-foreground">Só para times sem jobs publicados. Irreversível.</p>
              </div>
              <Button variant="destructive" onClick={remove}><Trash2 className="mr-2 h-4 w-4" /> Excluir</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sm">Sair do time</p>
              <p className="text-xs text-muted-foreground">Você deixa de ver os jobs e o chat. Pode voltar por um novo convite.</p>
            </div>
            <Button variant="outline" onClick={leave}><LogOut className="mr-2 h-4 w-4" /> Sair do time</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
