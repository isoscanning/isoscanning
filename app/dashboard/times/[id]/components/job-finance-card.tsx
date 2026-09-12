"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Wallet, ExternalLink, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/finances/money";
import { companiesService, type FinanceProject, type TeamFinanceView } from "@/lib/finances-service";
import { teamsApiError } from "@/lib/teams-service";

/**
 * Projeto financeiro do job (financeiro da empresa, SQL 82): mostra o
 * previsto × realizado ou permite criar o projeto a partir do job, já
 * importando os cachês acordados dos escalados como despesas.
 */
export function JobFinanceCard({ teamId, jobId, jobTitle, isManager }: { teamId: string; jobId: string; jobTitle: string; isManager: boolean }) {
  const [project, setProject] = useState<FinanceProject | null | undefined>(undefined);
  const [team, setTeam] = useState<TeamFinanceView | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(jobTitle);
  const [importCosts, setImportCosts] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [p, t] = await Promise.allSettled([companiesService.projectForJob(jobId), companiesService.forTeam(teamId)]);
    setProject(p.status === "fulfilled" ? p.value : null);
    setTeam(t.status === "fulfilled" ? t.value : null);
  }, [jobId, teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (project === undefined || team === null) return <Skeleton className="h-24 rounded-xl" />;
  const ws = team.company;
  if (!ws && !project) {
    // Sem financeiro da empresa: só o dono vê o convite para ativar (na aba Financeiro do time)
    return null;
  }

  async function create() {
    if (!ws) return;
    setSaving(true);
    try {
      const created = await companiesService.createProject(ws.id, { name: name.trim() || jobTitle, job_offer_id: jobId, import_job_costs: importCosts });
      toast.success("Projeto financeiro criado");
      setProject(created);
      setOpen(false);
    } catch (err) {
      toast.error(teamsApiError(err, "Não foi possível criar o projeto"));
    } finally {
      setSaving(false);
    }
  }

  const canCreate = ws && !ws.archived_at && isManager && (team.company ? team.role !== "viewer" : false);

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-sm inline-flex items-center gap-1"><Wallet className="h-4 w-4 text-emerald-600" /> Financeiro do job</CardTitle>
        {project && ws && (
          <Button asChild size="sm" variant="outline"><Link href={`/dashboard/financeiro?empresa=${ws.id}&projeto=${project.id}`}><ExternalLink className="mr-1 h-4 w-4" /> Abrir projeto</Link></Button>
        )}
      </CardHeader>
      <CardContent className="text-sm">
        {project ? (
          <div className="grid grid-cols-3 gap-3">
            <div><p className="text-xs text-muted-foreground">Receita</p><p className="font-semibold text-emerald-600">{formatBRL(project.totals.received + project.totals.pending)}</p>{project.budget_amount ? <p className="text-[11px] text-muted-foreground">orçado {formatBRL(project.budget_amount)}</p> : null}</div>
            <div><p className="text-xs text-muted-foreground">Despesas</p><p className="font-semibold text-rose-600">{formatBRL(project.totals.expensesPaid + project.totals.expensesPending)}</p></div>
            <div><p className="text-xs text-muted-foreground">Margem</p><p className="font-semibold">{formatBRL(project.totals.received - project.totals.expensesPaid)}</p></div>
          </div>
        ) : canCreate ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-muted-foreground">Crie o projeto na empresa {ws?.name} para acompanhar receita, cachês e margem deste job.</p>
            <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Criar projeto financeiro</Button>
          </div>
        ) : (
          <p className="text-muted-foreground">Este job ainda não tem projeto financeiro.</p>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => !o && !saving && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Projeto financeiro do job</DialogTitle>
            <DialogDescription>Título, datas e orçamento vêm do job. O contrato assinado de cada escalado cai como receita neste projeto.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do projeto</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={importCosts} onCheckedChange={(c) => setImportCosts(c === true)} className="mt-0.5" />
              <span>Lançar os <strong>cachês acordados dos escalados</strong> como despesas pendentes (só quem já tem valor acordado).</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={create} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />} Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
