"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, Shield, UserPlus, X, Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { usePlan } from "@/lib/plans/use-plan";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";
import {
  companiesService,
  TEAM_ACCESS_LABELS,
  COMPANY_ROLE_LABELS,
  type FinanceProfileSummary,
  type CompanyDetail,
  type TeamAccess,
  type CompanyRole,
} from "@/lib/finances-service";
import { errorMessage } from "./labels";

/**
 * Configurações da empresa: dados, quem acessa (time inteiro ou
 * pessoas nomeadas com papel) e arquivamento. Só administradores abrem.
 */
export function CompanySettingsDialog({
  detail, open, onOpenChange, onChanged,
}: {
  detail: CompanyDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const plan = usePlan();
  const { confirm, dialog } = useConfirmDialog();
  const ws = detail.company;
  const [name, setName] = useState(ws.name);
  const [legalName, setLegalName] = useState(ws.legal_name ?? "");
  const [cnpj, setCnpj] = useState(ws.cnpj ?? "");
  const [teamAccess, setTeamAccess] = useState<TeamAccess>(ws.team_access);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FinanceProfileSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<CompanyRole>("viewer");

  useEffect(() => {
    if (!open) return;
    setName(ws.name);
    setLegalName(ws.legal_name ?? "");
    setCnpj(ws.cnpj ?? "");
    setTeamAccess(ws.team_access);
    setQ("");
    setResults([]);
  }, [open, ws]);

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await companiesService.searchCandidates(ws.id, q.trim()));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, open, ws.id]);

  async function save() {
    const digits = cnpj.replace(/\D/g, "");
    if (digits && digits.length !== 14) {
      toast.error("CNPJ precisa ter 14 dígitos");
      return;
    }
    setSaving(true);
    try {
      await companiesService.update(ws.id, {
        name: name.trim(),
        legal_name: legalName.trim() || null,
        cnpj: digits || null,
        ...(detail.isOwner ? { team_access: teamAccess } : {}),
      });
      toast.success("Financeiro da empresa atualizado");
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível salvar"));
    } finally {
      setSaving(false);
    }
  }

  async function add(userId: string) {
    setAdding(userId);
    try {
      await companiesService.addMember(ws.id, userId, newRole);
      toast.success("Acesso concedido");
      setQ("");
      setResults([]);
      onChanged();
    } catch (err) {
      if (!isPlanErrorBody((err as { response?: { data?: unknown } })?.response?.data)) toast.error(errorMessage(err, "Não foi possível dar acesso"));
    } finally {
      setAdding(null);
    }
  }

  async function changeRole(userId: string, role: CompanyRole) {
    try {
      await companiesService.updateMember(ws.id, userId, role);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível alterar"));
    }
  }

  function remove(userId: string, label: string) {
    confirm({
      title: `Remover acesso de ${label}?`,
      description: "A pessoa deixa de ver o financeiro da empresa (a não ser pelo acesso do time, se estiver ligado).",
      destructive: true,
      confirmLabel: "Remover",
      onConfirm: async () => {
        try {
          await companiesService.removeMember(ws.id, userId);
          onChanged();
        } catch (err) {
          toast.error(errorMessage(err, "Não foi possível remover"));
        }
      },
    });
  }

  async function toggleArchive() {
    try {
      if (ws.archived_at) await companiesService.unarchive(ws.id);
      else await companiesService.archive(ws.id);
      toast.success(ws.archived_at ? "Financeiro reativado" : "Financeiro arquivado (somente leitura)");
      onChanged();
    } catch (err) {
      if (!isPlanErrorBody((err as { response?: { data?: unknown } })?.response?.data)) toast.error(errorMessage(err, "Não foi possível alterar"));
    }
  }

  const membersLimit = plan.limitOf("companyMembers");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {dialog}
      <DialogContent className="sm:max-w-[640px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Financeiro da empresa · {ws.name}</DialogTitle>
          <DialogDescription>
            {detail.teams.length === 0 ? "Nenhum time ligado ainda." : `${detail.teams.length} ${detail.teams.length === 1 ? "time ligado" : "times ligados"}: ${detail.teams.map((t) => t.name).join(", ")}.`} Quem administra decide quem vê e quem lança.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="acesso">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="acesso">Quem acessa</TabsTrigger>
            <TabsTrigger value="dados">Dados da empresa</TabsTrigger>
          </TabsList>

          <TabsContent value="acesso" className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label>Acesso padrão dos membros dos times da empresa</Label>
              <Select value={teamAccess} onValueChange={(v) => setTeamAccess(v as TeamAccess)} disabled={!detail.isOwner}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TEAM_ACCESS_LABELS) as TeamAccess[]).map((k) => <SelectItem key={k} value={k}>{TEAM_ACCESS_LABELS[k].label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{TEAM_ACCESS_LABELS[teamAccess].hint}{!detail.isOwner ? " (só o dono altera)" : ""}</p>
              {detail.isOwner && teamAccess !== ws.team_access && (
                <Button size="sm" variant="outline" onClick={save} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Aplicar acesso do time</Button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Pessoas nomeadas</Label>
              <p className="text-xs text-muted-foreground">
                Quem gerencia o financeiro com você (ex.: sócio, contador). Não precisa ser do time.
                {membersLimit !== null ? ` Limite do plano: ${detail.members.length}/${membersLimit}.` : ""}
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border p-2.5 bg-muted/30">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  <p className="text-sm flex-1">Dono do time</p>
                  <span className="text-xs text-muted-foreground">Administrador</span>
                </div>
                {detail.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 rounded-lg border p-2.5">
                    <span className="h-8 w-8 rounded-full bg-muted text-xs font-semibold flex items-center justify-center">{(m.profile?.display_name ?? "?").slice(0, 2).toUpperCase()}</span>
                    <p className="text-sm flex-1 truncate">{m.profile?.display_name ?? "—"}</p>
                    <Select value={m.role} onValueChange={(v) => changeRole(m.user_id, v as CompanyRole)} disabled={m.role === "admin" && !detail.isOwner}>
                      <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(COMPANY_ROLE_LABELS) as CompanyRole[]).map((r) => (
                          <SelectItem key={r} value={r} disabled={r === "admin" && !detail.isOwner}>{COMPANY_ROLE_LABELS[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(m.user_id, m.profile?.display_name ?? "esta pessoa")} aria-label="Remover"><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </div>

            {!ws.archived_at && (
              <div className="space-y-2 rounded-lg border p-3">
                <Label className="inline-flex items-center gap-1"><UserPlus className="h-4 w-4" /> Dar acesso a alguém</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou @usuário" className="pl-9" />
                  </div>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as CompanyRole)}>
                    <SelectTrigger className="sm:w-[170px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(COMPANY_ROLE_LABELS) as CompanyRole[]).map((r) => (
                        <SelectItem key={r} value={r} disabled={r === "admin" && !detail.isOwner}>{COMPANY_ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {detail.team_members.length > 0 && q.trim().length < 2 && (
                  <div className="flex flex-wrap gap-1.5">
                    {detail.team_members.filter((p) => !detail.members.some((m) => m.user_id === p.id)).slice(0, 8).map((p) => (
                      <button key={p.id} type="button" disabled={adding === p.id} onClick={() => add(p.id)} className="rounded-full border px-2.5 py-0.5 text-xs hover:bg-muted disabled:opacity-50">
                        {adding === p.id ? "..." : `+ ${p.display_name}`}
                      </button>
                    ))}
                  </div>
                )}
                {searching && <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Buscando...</p>}
                {results.map((p) => (
                  <button key={p.id} type="button" disabled={adding === p.id} onClick={() => add(p.id)} className="w-full flex items-center gap-3 rounded-lg p-2 text-left hover:bg-muted disabled:opacity-50">
                    <span className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">{p.display_name.slice(0, 2).toUpperCase()}</span>
                    <span className="text-sm flex-1 truncate">{p.display_name}{p.username ? <span className="text-muted-foreground"> @{p.username}</span> : null}</span>
                    {adding === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 text-muted-foreground" />}
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="dados" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nome da empresa</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Razão social (opcional)</Label>
                <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} maxLength={160} />
              </div>
              <div className="space-y-2">
                <Label>CNPJ (opcional)</Label>
                <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} inputMode="numeric" placeholder="00.000.000/0000-00" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">O regime tributário da empresa fica no botão de ajustes fiscais do painel (engrenagem), separado do seu regime pessoal.</p>
            <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar dados</Button>

            {detail.isOwner && (
              <div className="rounded-lg border border-destructive/30 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{ws.archived_at ? "Reativar financeiro da empresa" : "Arquivar financeiro da empresa"}</p>
                  <p className="text-xs text-muted-foreground">{ws.archived_at ? "Volta a aceitar lançamentos." : "Fica somente leitura; nada é apagado."}</p>
                </div>
                <Button variant="outline" onClick={toggleArchive}>{ws.archived_at ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}{ws.archived_at ? "Reativar" : "Arquivar"}</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
