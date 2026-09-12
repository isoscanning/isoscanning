"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderKanban, Plus, MoreVertical, Pencil, Lock, Unlock, Trash2, Loader2, Briefcase, Users, X, CheckCircle2, Archive } from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { formatBRL } from "@/lib/finances/money";
import {
  companiesService,
  PROJECT_STATUS_LABELS,
  type FinanceProject,
  type FinanceProjectInput,
  type FinanceProfileSummary,
  type ProjectStatus,
  type ProjectVisibility,
} from "@/lib/finances-service";
import { errorMessage } from "./labels";

const COLORS = ["#0ea5e9", "#8b5cf6", "#ec4899", "#f97316", "#10b981", "#eab308", "#ef4444", "#6366f1"];

function ProjectDialog({
  companyId, editing, open, onClose, onSaved, isAdmin,
}: {
  companyId: string;
  editing: FinanceProject | null;
  open: boolean;
  onClose: () => void;
  onSaved: (p: FinanceProject) => void;
  isAdmin: boolean;
}) {
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [visibility, setVisibility] = useState<ProjectVisibility>("company");
  const [budget, setBudget] = useState<number | null>(null);
  const [plannedCost, setPlannedCost] = useState<number | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setClient(editing?.client_name ?? "");
    setDescription(editing?.description ?? "");
    setColor(editing?.color ?? COLORS[0]);
    setStatus(editing?.status ?? "active");
    setVisibility(editing?.visibility ?? "company");
    setBudget(editing?.budget_amount ?? null);
    setPlannedCost(editing?.planned_cost ?? null);
    setStart(editing?.start_date ?? "");
    setEnd(editing?.end_date ?? "");
  }, [open, editing]);

  async function save() {
    if (name.trim().length < 2) {
      toast.error("Dê um nome ao projeto");
      return;
    }
    setSaving(true);
    const input: FinanceProjectInput = {
      name: name.trim(),
      client_name: client.trim() || null,
      description: description.trim() || null,
      color,
      status,
      visibility,
      budget_amount: budget,
      planned_cost: plannedCost,
      start_date: start || null,
      end_date: end || null,
    };
    try {
      const saved = editing
        ? await companiesService.updateProject(editing.id, input)
        : await companiesService.createProject(companyId, input);
      toast.success(editing ? "Projeto atualizado" : "Projeto criado");
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível salvar o projeto"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar projeto" : "Novo projeto"}</DialogTitle>
          <DialogDescription>Agrupa receitas e despesas de um trabalho, cliente ou evento da empresa e compara com o previsto.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Casamento Ana & Léo, Campanha verão" maxLength={120} autoFocus />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input value={client} onChange={(e) => setClient(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label>Situação</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((s) => <SelectItem key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Receita prevista (orçamento)</Label>
              <CurrencyInput value={budget} onValueChange={setBudget} />
            </div>
            <div className="space-y-2">
              <Label>Custo previsto</Label>
              <CurrencyInput value={plannedCost} onValueChange={setPlannedCost} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Início</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={2000} />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" aria-label={`Cor ${c}`} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full border-2 transition ${color === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          {isAdmin && (
            <div className="space-y-2">
              <Label>Quem vê este projeto</Label>
              <div className="grid gap-2">
                <button type="button" onClick={() => setVisibility("company")} className={`text-left rounded-lg border p-3 transition ${visibility === "company" ? "border-emerald-500 bg-emerald-500/5" : "hover:bg-muted/60"}`}>
                  <p className="font-medium text-sm inline-flex items-center gap-1"><Unlock className="h-3.5 w-3.5" /> Todos com acesso ao financeiro da empresa</p>
                </button>
                <button type="button" onClick={() => setVisibility("restricted")} className={`text-left rounded-lg border p-3 transition ${visibility === "restricted" ? "border-emerald-500 bg-emerald-500/5" : "hover:bg-muted/60"}`}>
                  <p className="font-medium text-sm inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Restrito: só administradores e pessoas que eu liberar</p>
                  <p className="text-xs text-muted-foreground">Você escolhe as pessoas no menu do projeto depois de salvar.</p>
                </button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectAccessDialog({
  project, people, open, onClose, onChanged,
}: {
  project: FinanceProject | null;
  people: FinanceProfileSummary[];
  open: boolean;
  onClose: () => void;
  onChanged: (p: FinanceProject) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!project) return null;
  const memberIds = new Set(project.members.map((m) => m.user_id));

  async function toggle(userId: string, canEdit: boolean, remove = false) {
    if (!project) return;
    setBusy(userId);
    try {
      const updated = remove
        ? await companiesService.removeProjectMember(project.id, userId)
        : await companiesService.setProjectMember(project.id, userId, canEdit);
      onChanged(updated);
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível alterar o acesso"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quem acessa "{project.name}"</DialogTitle>
          <DialogDescription>
            {project.visibility === "restricted"
              ? "Projeto restrito: administradores sempre veem; libere pessoas específicas abaixo (com ou sem edição)."
              : "Projeto aberto: todos com acesso ao financeiro da empresa veem. Mude para restrito na edição para limitar."}
          </DialogDescription>
        </DialogHeader>
        {project.visibility === "restricted" && (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {people.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma pessoa com acesso ao financeiro da empresa ainda. Nomeie pessoas nas configurações da empresa.</p>}
            {people.map((p) => {
              const member = project.members.find((m) => m.user_id === p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                  <span className="h-8 w-8 rounded-full bg-muted text-xs font-semibold flex items-center justify-center">{p.display_name.slice(0, 2).toUpperCase()}</span>
                  <p className="text-sm font-medium flex-1 truncate">{p.display_name}</p>
                  {member ? (
                    <>
                      <Select value={member.can_edit ? "edit" : "view"} onValueChange={(v) => toggle(p.id, v === "edit")} disabled={busy === p.id}>
                        <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">Só vê</SelectItem>
                          <SelectItem value="edit">Vê e edita</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={busy === p.id} onClick={() => toggle(p.id, false, true)} aria-label="Remover"><X className="h-4 w-4" /></Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => toggle(p.id, false)}>{busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Liberar"}</Button>
                  )}
                </div>
              );
            })}
            {memberIds.size === 0 && people.length > 0 && <p className="text-xs text-muted-foreground">Ninguém liberado ainda: só administradores veem este projeto.</p>}
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Projetos da empresa: previsto × realizado, filtro da lista e
 * gestão (criar, editar, restringir, arquivar).
 */
export function ProjectsPanel({
  companyId, projects, activeProjectId, canEdit, isAdmin, people, onSelect, onChanged,
}: {
  companyId: string;
  projects: FinanceProject[];
  activeProjectId: string | null;
  canEdit: boolean;
  isAdmin: boolean;
  /** Pessoas com acesso à empresa (para liberar projetos restritos). */
  people: FinanceProfileSummary[];
  onSelect: (projectId: string | null) => void;
  onChanged: () => void;
}) {
  const { confirm, dialog } = useConfirmDialog();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceProject | null>(null);
  const [accessFor, setAccessFor] = useState<FinanceProject | null>(null);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? projects : projects.filter((p) => p.status === "active");

  function remove(p: FinanceProject) {
    confirm({
      title: `Excluir "${p.name}"?`,
      description: "Só projetos sem lançamentos podem ser excluídos. Com lançamentos, arquive.",
      destructive: true,
      confirmLabel: "Excluir",
      onConfirm: async () => {
        try {
          await companiesService.deleteProject(p.id);
          if (activeProjectId === p.id) onSelect(null);
          onChanged();
        } catch (err) {
          toast.error(errorMessage(err, "Não foi possível excluir"));
        }
      },
    });
  }

  async function setStatus(p: FinanceProject, status: ProjectStatus) {
    try {
      await companiesService.updateProject(p.id, { status });
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível alterar"));
    }
  }

  return (
    <Card className="bg-card/80">
      {dialog}
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><FolderKanban className="h-4 w-4" /> Projetos da empresa</CardTitle>
            <CardDescription>Clique num projeto para ver só os lançamentos dele. Previsto × realizado no ano.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {projects.some((p) => p.status !== "active") && (
              <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>{showAll ? "Só em andamento" : "Mostrar encerrados"}</Button>
            )}
            {canEdit && <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="mr-1 h-4 w-4" /> Projeto</Button>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {projects.length === 0 ? "Nenhum projeto ainda. Crie um por trabalho ou cliente para acompanhar receita, custo e margem." : "Nenhum projeto em andamento."}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activeProjectId && (
              <button type="button" onClick={() => onSelect(null)} className="rounded-xl border border-dashed p-3 text-left text-sm text-muted-foreground hover:bg-muted/40">
                <X className="inline h-4 w-4 mr-1" /> Limpar filtro de projeto
              </button>
            )}
            {visible.map((p) => {
              const active = p.id === activeProjectId;
              const income = p.totals.received + p.totals.pending;
              const expenses = p.totals.expensesPaid + p.totals.expensesPending;
              const margin = p.totals.received - p.totals.expensesPaid;
              const pct = p.budget_amount ? Math.min(100, Math.round((income / p.budget_amount) * 100)) : null;
              return (
                <div key={p.id} className={`rounded-xl border p-3 transition ${active ? "border-emerald-500 bg-emerald-500/5" : "hover:bg-muted/30"}`}>
                  <div className="flex items-start gap-2">
                    <button type="button" onClick={() => onSelect(active ? null : p.id)} className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        <p className="font-medium truncate">{p.name}</p>
                        {p.visibility === "restricted" && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-label="Restrito" />}
                        {p.job_offer_id && <Briefcase className="h-3.5 w-3.5 text-teal-600 shrink-0" aria-label="Ligado a um job do time" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{[p.client_name, PROJECT_STATUS_LABELS[p.status]].filter(Boolean).join(" · ")}</p>
                    </button>
                    {(canEdit || isAdmin) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Mais"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {p.can_edit && <DropdownMenuItem onClick={() => { setEditing(p); setDialogOpen(true); }}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>}
                          {isAdmin && <DropdownMenuItem onClick={() => setAccessFor(p)}><Users className="mr-2 h-4 w-4" /> Quem acessa</DropdownMenuItem>}
                          {p.job_offer_id && <DropdownMenuItem asChild><Link href={`/dashboard/times?job=${p.job_offer_id}`}><Briefcase className="mr-2 h-4 w-4" /> Ver job do time</Link></DropdownMenuItem>}
                          {p.can_edit && (
                            <>
                              <DropdownMenuSeparator />
                              {p.status !== "completed" && <DropdownMenuItem onClick={() => setStatus(p, "completed")}><CheckCircle2 className="mr-2 h-4 w-4" /> Marcar concluído</DropdownMenuItem>}
                              {p.status !== "archived" && <DropdownMenuItem onClick={() => setStatus(p, "archived")}><Archive className="mr-2 h-4 w-4" /> Arquivar</DropdownMenuItem>}
                              {p.status !== "active" && <DropdownMenuItem onClick={() => setStatus(p, "active")}><Unlock className="mr-2 h-4 w-4" /> Reabrir</DropdownMenuItem>}
                            </>
                          )}
                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => remove(p)}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div><p className="text-muted-foreground">Receita</p><p className="font-semibold text-emerald-600">{formatBRL(income)}</p></div>
                    <div><p className="text-muted-foreground">Despesas</p><p className="font-semibold text-rose-600">{formatBRL(expenses)}</p></div>
                    <div><p className="text-muted-foreground">Margem</p><p className={`font-semibold ${margin >= 0 ? "" : "text-rose-600"}`}>{formatBRL(margin)}</p></div>
                  </div>
                  {p.budget_amount ? (
                    <div className="mt-2">
                      <div className="flex justify-between text-[11px] text-muted-foreground"><span>Orçado {formatBRL(p.budget_amount)}</span><span>{pct}%</span></div>
                      <Progress value={pct ?? 0} className="h-1.5 mt-1" />
                    </div>
                  ) : null}
                  {p.totals.overdue > 0 && <Badge variant="outline" className="mt-2 text-[10px] border-rose-500/40 text-rose-600">{formatBRL(p.totals.overdue)} vencido</Badge>}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <ProjectDialog companyId={companyId} editing={editing} open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={onChanged} isAdmin={isAdmin} />
      <ProjectAccessDialog project={accessFor ? projects.find((p) => p.id === accessFor.id) ?? accessFor : null} people={people} open={!!accessFor} onClose={() => setAccessFor(null)} onChanged={onChanged} />
    </Card>
  );
}
