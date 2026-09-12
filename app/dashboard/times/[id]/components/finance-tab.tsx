"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ExternalLink, FolderKanban, Lock, Loader2, Link2, Briefcase, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, MONTHS_PT } from "@/lib/finances/money";
import {
  fetchFinanceDashboard,
  companiesService,
  saveFinanceScope,
  PROJECT_STATUS_LABELS,
  COMPANY_ROLE_LABELS,
  type Company,
  type FinanceDashboard,
  type TeamFinanceView,
} from "@/lib/finances-service";
import { teamsService, teamsApiError } from "@/lib/teams-service";

/**
 * Aba Financeiro do time: o time pertence a uma EMPRESA (SQL 82) ou à pessoa.
 *  - Sem empresa: o dono liga o time a uma empresa que administra (ou cadastra
 *    uma). Enquanto isso, os contratos dos jobs caem no financeiro pessoal.
 *  - Com empresa e acesso: resumo do mês, projetos e atalho para a Gestão
 *    Financeira já no escopo da empresa.
 */
export function FinanceTab({ teamId, onChanged }: { teamId: string; teamName: string; isOwner: boolean; onChanged?: () => void }) {
  const [view, setView] = useState<TeamFinanceView | null>(null);
  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null);
  const [administered, setAdministered] = useState<Company[] | null>(null);
  const [selected, setSelected] = useState("");
  const [linking, setLinking] = useState(false);
  const now = new Date();

  const load = useCallback(async () => {
    try {
      const v = await companiesService.forTeam(teamId);
      setView(v);
      if (v.company) {
        fetchFinanceDashboard(now.getFullYear(), now.getMonth() + 1, { companyId: v.company.id })
          .then(setDashboard)
          .catch(() => setDashboard(null));
      } else if (v.can_link) {
        companiesService.listAdministered().then(setAdministered).catch(() => setAdministered([]));
      }
    } catch (err) {
      toast.error(teamsApiError(err, "Não foi possível carregar o financeiro do time"));
      setView({ company: null, team_company_id: null, can_link: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function link() {
    if (!selected) return;
    setLinking(true);
    try {
      await teamsService.update(teamId, { company_id: selected });
      saveFinanceScope(selected);
      toast.success("Time ligado à empresa. Os jobs deste time passam a cair no financeiro dela.");
      onChanged?.();
      await load();
    } catch (err) {
      toast.error(teamsApiError(err, "Não foi possível ligar o time à empresa"));
    } finally {
      setLinking(false);
    }
  }

  if (!view) {
    return <div className="space-y-3"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /></div>;
  }

  if (!view.company) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center space-y-4">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 flex items-center justify-center"><Building2 className="h-7 w-7" /></div>
          <div>
            <p className="font-semibold text-lg">{view.team_company_id ? "Financeiro da empresa" : "Este time é pessoal"}</p>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto mt-1">
              {view.team_company_id
                ? "O time pertence a uma empresa, mas você não tem acesso ao financeiro dela. Peça ao administrador da empresa."
                : "Os jobs deste time entram no financeiro pessoal de quem presta o serviço. Se o time é de uma empresa, ligue-o a ela: contratos e projetos dos jobs passam a cair no financeiro da empresa, com regime tributário e acesso próprios."}
            </p>
          </div>
          {view.can_link && (
            administered === null ? (
              <Skeleton className="h-10 w-72 mx-auto" />
            ) : administered.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <Select value={selected} onValueChange={setSelected}>
                  <SelectTrigger className="w-[260px]"><SelectValue placeholder="Escolha a empresa" /></SelectTrigger>
                  <SelectContent>
                    {administered.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={link} disabled={!selected || linking} className="bg-emerald-600 hover:bg-emerald-700">
                  {linking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />} Ligar time à empresa
                </Button>
              </div>
            ) : (
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/dashboard/empresas?nova=1"><Plus className="mr-2 h-4 w-4" /> Cadastrar minha empresa</Link>
              </Button>
            )
          )}
          {!view.can_link && !view.team_company_id && (
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Só o dono do time liga o time a uma empresa.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  const company = view.company;
  const m = dashboard?.monthly;
  const financeUrl = `/dashboard/financeiro?empresa=${company.id}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="h-4 w-4 rounded" style={{ backgroundColor: company.color }} /> {company.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {company.legal_name ? `${company.legal_name} · ` : ""}Você: {COMPANY_ROLE_LABELS[view.role]}{company.archived_at ? " · arquivada (somente leitura)" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link href={`/dashboard/empresas?empresa=${company.id}`}><Building2 className="mr-2 h-4 w-4" /> Empresa</Link></Button>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700" onClick={() => saveFinanceScope(company.id)}>
              <Link href={financeUrl}><ExternalLink className="mr-2 h-4 w-4" /> Abrir financeiro</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{MONTHS_PT[now.getMonth()]} de {now.getFullYear()} · empresa inteira</p>
          {!dashboard ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href={`${financeUrl}&filtro=recebidos`} className="rounded-xl border p-3 hover:bg-muted/40"><p className="text-xs text-muted-foreground">Recebido</p><p className="font-bold text-emerald-600">{formatBRL(m?.received ?? 0)}</p></Link>
              <Link href={`${financeUrl}&filtro=pendentes`} className="rounded-xl border p-3 hover:bg-muted/40"><p className="text-xs text-muted-foreground">A receber{(m?.overdueCount ?? 0) > 0 ? ` · ${m?.overdueCount} vencidos` : ""}</p><p className="font-bold">{formatBRL(m?.pending ?? 0)}</p></Link>
              <Link href={`${financeUrl}&filtro=despesas`} className="rounded-xl border p-3 hover:bg-muted/40"><p className="text-xs text-muted-foreground">Despesas pagas</p><p className="font-bold text-rose-600">{formatBRL(m?.expensesPaid ?? 0)}</p></Link>
              <Link href={financeUrl} className="rounded-xl border p-3 hover:bg-muted/40"><p className="text-xs text-muted-foreground">Resultado do mês</p><p className={`font-bold ${(m?.received ?? 0) - (m?.expensesPaid ?? 0) >= 0 ? "" : "text-rose-600"}`}>{formatBRL((m?.received ?? 0) - (m?.expensesPaid ?? 0))}</p></Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><FolderKanban className="h-4 w-4" /> Projetos deste time ({view.projects.filter((p) => p.team_id === teamId).length})</CardTitle>
          <Button asChild variant="outline" size="sm"><Link href={financeUrl}>Gerenciar</Link></Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {view.projects.filter((p) => p.team_id === teamId).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum projeto ligado a este time. Crie um pelo job (aba Entregas) ou na Gestão Financeira escolhendo o time.</p>
          ) : (
            view.projects.filter((p) => p.team_id === teamId).slice(0, 8).map((p) => {
              const income = p.totals.received + p.totals.pending;
              const expenses = p.totals.expensesPaid + p.totals.expensesPending;
              return (
                <Link key={p.id} href={`${financeUrl}&projeto=${p.id}`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/40">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate flex items-center gap-1">{p.name}{p.job_offer_id && <Briefcase className="h-3 w-3 text-teal-600" />}{p.visibility === "restricted" && <Lock className="h-3 w-3 text-muted-foreground" />}</p>
                    <p className="text-xs text-muted-foreground">{[p.client_name, PROJECT_STATUS_LABELS[p.status]].filter(Boolean).join(" · ")}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-emerald-600 font-medium">{formatBRL(income)}</p>
                    <p className="text-rose-600">{formatBRL(expenses)}</p>
                  </div>
                  {p.totals.overdue > 0 && <Badge variant="outline" className="text-[10px] border-rose-500/40 text-rose-600">vencido</Badge>}
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
