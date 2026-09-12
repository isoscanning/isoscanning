"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { usePlan } from "@/lib/plans/use-plan";
import { PlanBadge } from "@/components/plan/plan-gate";
import { notifyPlanLimit } from "@/lib/plans/plan-events";
import { buildPlanFeatureBody } from "@/lib/plans/plan-limits";
import {
  bulkUpdateFinancialRecords,
  deleteFinancialRecord,
  fetchFinanceClients,
  fetchFinanceDashboard,
  fetchFinancialRecord,
  fetchFinancialRecords,
  fetchNfFileUrl,
  companiesService,
  readSavedFinanceScope,
  saveFinanceScope,
  updateFinanceSettings,
  type BulkAction,
  type FinanceDashboard,
  type FinanceProject,
  type CompanyDetail,
  type CompanyListRow,
  type FinancialRecord,
  type FinancialRecordInput,
  type TaxRegime,
} from "@/lib/finances-service";
import { formatBRL, MONTHS_PT } from "@/lib/finances/money";
import {
  BarChart3,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Plus,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { FinanceModal } from "./components/finance-modal";
import { ReceiveDialog } from "./components/receive-dialog";
import { SettingsDialog } from "./components/settings-dialog";
import { CompanySettingsDialog } from "./components/company-settings-dialog";
import { ScopeSwitcher } from "./components/scope-switcher";
import { ProjectsPanel } from "./components/projects-panel";
import { AnnualPanel } from "./components/annual-panel";
import { KpiCards } from "./components/kpi-cards";
import { RecordsTable, type SortKey } from "./components/records-table";
import { FinanceChart } from "./components/finance-chart";
import { buildFinanceCsv, downloadTextFile } from "./components/export-csv";
import { FILTER_CHIPS, applyFilter, errorMessage, isFilterKey, type FilterKey } from "./components/labels";

export default function FinancesDashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FinancesPageInner />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-background/50">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </main>
      <Footer />
    </div>
  );
}

const BULK_LABELS: Record<BulkAction, { label: string; title: string; description: string }> = {
  mark_received: { label: "Marcar recebido", title: "Marcar como recebido?", description: "Os lançamentos pendentes selecionados passam a recebidos com a data de hoje. Cancelados e já recebidos são ignorados." },
  mark_nf_issued: { label: "NF emitida", title: "Marcar nota como emitida?", description: "Só os lançamentos com nota a emitir são alterados. Você pode preencher o número depois, editando cada um." },
  cancel: { label: "Cancelar", title: "Cancelar lançamentos?", description: "Só pendentes podem ser cancelados. Cancelados saem do faturamento, mas continuam no histórico." },
  delete: { label: "Excluir", title: "Excluir lançamentos?", description: "Esta ação não pode ser desfeita. Arquivos de nota anexados também são apagados." },
};

function FinancesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile, loading } = useAuth();
  const { toast } = useToast();
  const plan = usePlan();
  const canExport = plan.can("financeExport");

  const initialParams = useRef(new URLSearchParams(searchParams.toString()));
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => {
    const m = parseInt(initialParams.current.get("mes") ?? "", 10);
    return m >= 1 && m <= 12 ? m : now.getMonth() + 1;
  });
  const [year, setYear] = useState(() => {
    const y = parseInt(initialParams.current.get("ano") ?? "", 10);
    return y >= 2000 && y <= 2100 ? y : now.getFullYear();
  });
  const [filter, setFilter] = useState<FilterKey>(() => {
    const f = initialParams.current.get("filtro");
    return isFilterKey(f) ? f : "todos";
  });

  // ── Escopo: pessoal (null) ou empresa (SQL 82) ──────────
  const [companies, setCompanies] = useState<CompanyListRow[]>([]);
  const [companiesLoaded, setCompaniesLoaded] = useState(false);
  const [scope, setScope] = useState<string | null>(() => initialParams.current.get("empresa") || readSavedFinanceScope());
  const [projectId, setProjectId] = useState<string | null>(() => initialParams.current.get("projeto") || null);
  const [companyDetail, setCompanyDetail] = useState<CompanyDetail | null>(null);
  const [projects, setProjects] = useState<FinanceProject[]>([]);
  const [companySettingsOpen, setCompanySettingsOpen] = useState(false);

  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [clients, setClients] = useState<string[]>([]);
  const [modal, setModal] = useState<{ open: boolean; initial?: FinancialRecord | null; duplicateOf?: FinancialRecord | null; prefill?: Partial<FinancialRecordInput> | null }>({ open: false });
  const [receiveTarget, setReceiveTarget] = useState<FinancialRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinancialRecord | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState<BulkAction | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingRegime, setSavingRegime] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const reqRef = useRef(0);
  const deepLinkHandled = useRef(false);

  const isCompany = !!scope;
  const currentCompany = scope ? companies.find((w) => w.company.id === scope) ?? null : null;
  const canEdit = dashboard ? dashboard.canEdit : !isCompany;
  const isAdmin = !isCompany || companyDetail?.isAdmin === true;
  const scopeParams = useMemo(() => ({ companyId: scope, projectId }), [scope, projectId]);

  // ── Empresas disponíveis ──────────────────────────────────────────
  const loadCompanies = useCallback(async () => {
    try {
      const rows = await companiesService.listMine();
      setCompanies(rows);
      // Empresa lembrada que não existe mais (ou sem acesso): volta ao pessoal
      setScope((s) => (s && !rows.some((r) => r.company.id === s) ? null : s));
    } catch {
      setCompanies([]);
    } finally {
      setCompaniesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (userProfile) void loadCompanies();
  }, [userProfile, loadCompanies]);

  const loadCompanyExtras = useCallback(async () => {
    if (!scope) {
      setCompanyDetail(null);
      setProjects([]);
      return;
    }
    const [detail, list] = await Promise.allSettled([
      companiesService.getDetail(scope),
      companiesService.listProjects(scope),
    ]);
    setCompanyDetail(detail.status === "fulfilled" ? detail.value : null);
    setProjects(list.status === "fulfilled" ? list.value : []);
  }, [scope]);

  useEffect(() => {
    if (userProfile && companiesLoaded) void loadCompanyExtras();
  }, [userProfile, companiesLoaded, loadCompanyExtras]);

  // Projeto do filtro precisa pertencer à empresa atual
  useEffect(() => {
    if (projectId && !projects.some((p) => p.id === projectId) && projects.length > 0) setProjectId(null);
  }, [projects, projectId]);

  const changeScope = (next: string | null) => {
    setScope(next);
    setProjectId(null);
    setFilter("todos");
    setSelected(new Set());
    saveFinanceScope(next);
  };

  // ── Carga (com guarda contra resposta atrasada — A10) ─────────────
  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!userProfile || !companiesLoaded) return;
      const id = ++reqRef.current;
      if (!opts?.silent) setLoadingData(true);
      try {
        const [d, r] = await Promise.all([
          fetchFinanceDashboard(year, month, scopeParams),
          fetchFinancialRecords({ year, month, companyId: scope ?? undefined, projectId: projectId ?? undefined }),
        ]);
        if (id !== reqRef.current) return;
        setDashboard(d);
        setRecords(r);
        setSelected(new Set());
      } catch (error) {
        if (id !== reqRef.current) return;
        toast({ variant: "destructive", title: "Não foi possível carregar o financeiro", description: errorMessage(error, "Tente novamente em instantes.") });
      } finally {
        if (id === reqRef.current) setLoadingData(false);
      }
    },
    [userProfile, companiesLoaded, year, month, scope, projectId, scopeParams, toast]
  );

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [loading, userProfile, router]);

  useEffect(() => {
    if (userProfile) void load();
  }, [userProfile, load]);

  const refreshClients = useCallback(() => {
    fetchFinanceClients({ companyId: scope }).then(setClients).catch(() => undefined);
  }, [scope]);
  useEffect(() => {
    if (userProfile && companiesLoaded) refreshClients();
  }, [userProfile, companiesLoaded, refreshClients]);

  const refreshProjects = useCallback(() => {
    if (!scope) return;
    companiesService.listProjects(scope).then(setProjects).catch(() => undefined);
    void load({ silent: true });
  }, [scope, load]);

  // ── Deep links: ?lancamento=id · ?novo=1&titulo&valor&cliente · ?painel=anual ──
  useEffect(() => {
    if (!userProfile || !companiesLoaded || deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    const p = initialParams.current;
    const lanc = p.get("lancamento");
    if (lanc) {
      fetchFinancialRecord(lanc)
        .then((r) => {
          const [y, m] = r.date.split("-").map(Number);
          // Lançamento de outra empresa: troca o escopo antes de destacar
          if ((r.companyId ?? null) !== scope) {
            setScope(r.companyId ?? null);
            setProjectId(null);
            saveFinanceScope(r.companyId ?? null);
          }
          setYear(y);
          setMonth(m);
          setFilter(r.status === "cancelled" ? "cancelados" : "todos");
          setHighlightId(r.id);
        })
        .catch(() => toast({ variant: "destructive", title: "Lançamento não encontrado", description: "Ele pode ter sido excluído ou você não tem acesso." }));
    }
    if (p.get("novo") === "1") {
      const valor = parseFloat(p.get("valor") ?? "");
      setModal({
        open: true,
        prefill: {
          title: p.get("titulo") ?? "",
          amount: Number.isFinite(valor) && valor > 0 ? valor : undefined,
          clientName: p.get("cliente") ?? undefined,
          status: "pending",
          source: "external",
        },
      });
    }
    if (p.get("painel") === "anual") {
      setTimeout(() => document.getElementById("painel-anual")?.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
    }
  }, [userProfile, companiesLoaded, scope, toast]);

  // URL espelha escopo/mês/ano/filtro (para voltar/compartilhar) — só depois da primeira carga
  useEffect(() => {
    if (!dashboard) return;
    const params = new URLSearchParams();
    if (scope) params.set("empresa", scope);
    if (projectId) params.set("projeto", projectId);
    params.set("mes", String(month));
    params.set("ano", String(year));
    if (filter !== "todos") params.set("filtro", filter);
    router.replace(`/dashboard/financeiro?${params.toString()}`, { scroll: false });
  }, [dashboard, month, year, filter, scope, projectId, router]);

  // Rola até a linha destacada e apaga o destaque depois
  useEffect(() => {
    if (!highlightId || loadingData) return;
    const el = document.getElementById(`lancamento-${highlightId}`) ?? document.getElementById(`lancamento-m-${highlightId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setHighlightId(null), 6000);
    return () => clearTimeout(t);
  }, [highlightId, loadingData, records]);

  // ── Derivados ──────────────────────────────────────────────────────
  const visible = useMemo(() => {
    const list = applyFilter(records, filter, search);
    const dir = order === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sort === "amount") return (a.amount - b.amount) * dir || b.date.localeCompare(a.date);
      return a.date.localeCompare(b.date) * dir || a.createdAt.localeCompare(b.createdAt) * dir;
    });
  }, [records, filter, search, sort, order]);

  const years = useMemo(() => {
    const first = Math.min(dashboard?.firstYear ?? year, year);
    const last = Math.max(now.getFullYear() + 1, year);
    const list: number[] = [];
    for (let y = last; y >= first; y--) list.push(y);
    return list;
  }, [dashboard?.firstYear, year, now]);

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
  const activeProject = projectId ? projects.find((p) => p.id === projectId) ?? null : null;
  const scopeQuery = `${scope ? `&empresa=${scope}` : ""}${projectId ? `&projeto=${projectId}` : ""}`;

  // ── Ações ──────────────────────────────────────────────────────────
  const shiftMonth = (delta: number) => {
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth() + 1);
  };

  const handleSaved = (record: FinancialRecord, mode: "created" | "updated") => {
    const [y, m] = record.date.split("-").map(Number);
    const moved = y !== year || m !== month;
    toast({
      title: mode === "created" ? "Lançamento salvo" : "Alterações salvas",
      description: moved ? `Ele fica em ${MONTHS_PT[m - 1]}/${y}. Mostrando esse mês.` : `${record.title} · ${formatBRL(record.amount)}`,
    });
    if (moved) {
      setYear(y);
      setMonth(m);
      if (record.status === "cancelled") setFilter("cancelados");
    } else {
      void load({ silent: true });
    }
    if (scope) companiesService.listProjects(scope).then(setProjects).catch(() => undefined);
    setHighlightId(record.id);
    if (record.clientName && !clients.includes(record.clientName)) refreshClients();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteFinancialRecord(target.id);
      toast({ title: "Lançamento excluído", description: `${target.title} · ${formatBRL(target.amount)}` });
      void load({ silent: true });
    } catch (error) {
      toast({ variant: "destructive", title: "Não foi possível excluir", description: errorMessage(error, "Tente novamente.") });
    }
  };

  const runBulk = async () => {
    if (!bulkConfirm || selected.size === 0) return;
    const action = bulkConfirm;
    setBulkBusy(true);
    try {
      const result = await bulkUpdateFinancialRecords([...selected], action, { companyId: scope });
      toast({
        title: `${result.updated} lançamento${result.updated === 1 ? "" : "s"} ${action === "delete" ? "excluído" : "atualizado"}${result.updated === 1 ? "" : "s"}`,
        description: result.skipped > 0 ? `${result.skipped} não se aplicava${result.skipped === 1 ? "" : "m"} e foi ignorado.` : undefined,
      });
      setSelected(new Set());
      void load({ silent: true });
    } catch (error) {
      toast({ variant: "destructive", title: "Ação em lote falhou", description: errorMessage(error, "Tente novamente.") });
    } finally {
      setBulkBusy(false);
      setBulkConfirm(null);
    }
  };

  const changeRegime = async (regime: TaxRegime) => {
    if (!dashboard) return;
    setSavingRegime(true);
    try {
      const settings = await updateFinanceSettings({ taxRegime: regime }, { companyId: scope });
      setDashboard({ ...dashboard, settings });
    } catch (error) {
      toast({ variant: "destructive", title: "Não foi possível trocar o regime", description: errorMessage(error, "Tente novamente.") });
    } finally {
      setSavingRegime(false);
    }
  };

  const exportCsv = async (scopeKind: "month" | "year") => {
    if (!canExport) {
      notifyPlanLimit(buildPlanFeatureBody("financeExport", plan.tier));
      return;
    }
    try {
      let rows = records;
      if (scopeKind === "year") {
        rows = [];
        for (let offset = 0; ; offset += 500) {
          const page = await fetchFinancialRecords({ year, limit: 500, offset, companyId: scope ?? undefined, projectId: projectId ?? undefined });
          rows.push(...page);
          if (page.length < 500) break;
        }
      }
      if (rows.length === 0) {
        toast({ title: "Nada para exportar", description: scopeKind === "year" ? `Sem lançamentos em ${year}.` : "Sem lançamentos neste mês." });
        return;
      }
      const prefix = currentCompany ? `financeiro-${currentCompany.company.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "financeiro";
      const name = scopeKind === "year" ? `${prefix}-${year}.csv` : `${prefix}-${year}-${String(month).padStart(2, "0")}.csv`;
      downloadTextFile(name, buildFinanceCsv(rows));
    } catch (error) {
      toast({ variant: "destructive", title: "Exportação falhou", description: errorMessage(error, "Tente novamente.") });
    }
  };

  const openNfFile = async (r: FinancialRecord) => {
    try {
      const url = await fetchNfFileUrl(r.id);
      if (!url) {
        toast({ title: "Sem arquivo", description: "Este lançamento não tem nota anexada." });
        return;
      }
      window.open(url, "_blank", "noopener");
    } catch (error) {
      toast({ variant: "destructive", title: "Não foi possível abrir a nota", description: errorMessage(error, "Tente novamente.") });
    }
  };

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = (ids: string[]) =>
    setSelected((s) => (ids.every((id) => s.has(id)) ? new Set() : new Set(ids)));

  if (loading || !userProfile) return <PageSkeleton />;

  const monthLabel = `${MONTHS_PT[month - 1]} de ${year}`;
  const scopeTitle = currentCompany ? currentCompany.company.name : "Gestão Financeira";

  return (
    <div className="min-h-screen flex flex-col bg-background/50">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          {/* Cabeçalho */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center gap-2">
                {isCompany && <Building2 className="h-7 w-7 text-teal-500" />}
                {scopeTitle}
              </h1>
              <p className="text-muted-foreground mt-1">
                {isCompany
                  ? `Financeiro da empresa, separado do seu pessoal${currentCompany?.teams_count ? ` · ${currentCompany.teams_count} ${currentCompany.teams_count === 1 ? "time ligado" : "times ligados"}` : ""}.${!canEdit ? " Você está em modo de visualização." : ""}`
                  : "Receitas, despesas, notas fiscais e o teto do seu regime, num lugar só."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-500">
                    <Download className="mr-2 h-4 w-4" /> Exportar
                    {!canExport && <PlanBadge className="ml-2" />}
                    <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>CSV para Excel</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => exportCsv("month")}>{monthLabel}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportCsv("year")}>Ano de {year} inteiro</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Relatório para imprimir / PDF</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => window.open(`/dashboard/financeiro/imprimir?mes=${month}&ano=${year}${scopeQuery}`, "_blank", "noopener")}>
                    <FileText className="mr-2 h-4 w-4" /> Extrato de {monthLabel}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open(`/dashboard/financeiro/imprimir?ano=${year}${scopeQuery}`, "_blank", "noopener")}>
                    <BarChart3 className="mr-2 h-4 w-4" /> Resumo anual de {year}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {isCompany && companyDetail?.isAdmin && (
                <Button variant="outline" onClick={() => setCompanySettingsOpen(true)} title="Quem acessa e dados da empresa" className="border-teal-500/30 hover:bg-teal-500/10 hover:text-teal-600">
                  <Building2 className="mr-2 h-4 w-4" /> Empresa
                </Button>
              )}
              {isAdmin && (
                <Button variant="outline" onClick={() => setSettingsOpen(true)} aria-label="Ajustes fiscais" title="Regime e lembretes fiscais" className="border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-500">
                  <Settings2 className="h-4 w-4" />
                </Button>
              )}
              {canEdit ? (
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setModal({ open: true })}>
                  <Plus className="mr-2 h-4 w-4" /> Novo lançamento
                </Button>
              ) : (
                <Badge variant="outline" className="self-center"><Eye className="mr-1 h-3.5 w-3.5" /> Só visualização</Badge>
              )}
            </div>
          </div>

          {/* Pessoal | Empresa */}
          {(companies.length > 0 || isCompany) && (
            <ScopeSwitcher companies={companies} value={scope} onChange={changeScope} loading={!companiesLoaded} />
          )}

          {/* Painel anual */}
          <section id="painel-anual" className="scroll-mt-24">
            {dashboard ? (
              <AnnualPanel dashboard={dashboard} onRegimeChange={changeRegime} onOpenSettings={() => setSettingsOpen(true)} busy={savingRegime || !isAdmin} />
            ) : (
              <Skeleton className="h-52 w-full rounded-2xl" />
            )}
          </section>

          {/* Projetos da empresa */}
          {isCompany && scope && (
            <ProjectsPanel
              companyId={scope}
              projects={projects}
              activeProjectId={projectId}
              canEdit={canEdit}
              isAdmin={companyDetail?.isAdmin === true}
              people={companyDetail?.members.map((m) => m.profile).filter((p): p is NonNullable<typeof p> => !!p) ?? []}
              onSelect={(id) => { setProjectId(id); setSelected(new Set()); }}
              onChanged={refreshProjects}
            />
          )}

          {/* Período */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
            <Select value={month.toString()} onValueChange={(val) => setMonth(parseInt(val, 10))}>
              <SelectTrigger className="w-[150px] bg-background" aria-label="Mês"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS_PT.map((name, i) => (
                  <SelectItem key={name} value={String(i + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year.toString()} onValueChange={(val) => setYear(parseInt(val, 10))}>
              <SelectTrigger className="w-[100px] bg-background" aria-label="Ano"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => shiftMonth(1)} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button>
            {!isCurrentMonth && (
              <Button variant="ghost" size="sm" onClick={() => { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); }}>Hoje</Button>
            )}
            {activeProject && (
              <Badge variant="outline" className="ml-auto border-emerald-500/40">
                <span className="h-2 w-2 rounded-full mr-1.5" style={{ backgroundColor: activeProject.color }} /> Projeto: {activeProject.name}
                <button type="button" onClick={() => setProjectId(null)} className="ml-1.5 hover:text-foreground" aria-label="Limpar projeto"><X className="h-3 w-3" /></button>
              </Badge>
            )}
          </div>

          {/* KPIs do mês */}
          <KpiCards monthly={dashboard?.monthly ?? null} active={filter} loading={loadingData} onFilter={(key) => setFilter((f) => (f === key ? "todos" : key))} />

          {/* Gráfico do ano */}
          <Card className="bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mês a mês em {year}</CardTitle>
              <CardDescription>Clique num mês para ver os lançamentos dele.</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard ? (
                <FinanceChart months={dashboard.months} year={year} activeMonth={month} onSelectMonth={setMonth} />
              ) : (
                <Skeleton className="h-56 w-full" />
              )}
            </CardContent>
          </Card>

          {/* Lançamentos */}
          <Card>
            <CardHeader className="border-b pb-4 mb-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Lançamentos de {monthLabel}{activeProject ? ` · ${activeProject.name}` : ""}</CardTitle>
                  <CardDescription>
                    {records.length === 0 ? "Nenhum registro neste mês." : `${visible.length} de ${records.length} lançamento${records.length === 1 ? "" : "s"}${filter !== "todos" || search ? " com o filtro atual" : ""}.`}
                  </CardDescription>
                </div>
                <div className="relative sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar título, cliente, nº da NF…" className="pl-9 pr-8" aria-label="Buscar lançamentos" />
                  {search && (
                    <button type="button" onClick={() => setSearch("")} aria-label="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtros">
                {FILTER_CHIPS.map((chip) => {
                  const active = filter === chip.key;
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setFilter(chip.key)}
                      aria-pressed={active}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? "bg-emerald-600 border-emerald-600 text-white" : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground"}`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              {selected.size > 0 && canEdit && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
                  <span className="font-medium">{selected.size} selecionado{selected.size === 1 ? "" : "s"}</span>
                  <span className="text-muted-foreground">·</span>
                  {(["mark_received", "mark_nf_issued", "cancel", "delete"] as BulkAction[]).map((action) => (
                    <Button key={action} size="sm" variant={action === "delete" ? "destructive" : "outline"} onClick={() => setBulkConfirm(action)} disabled={bulkBusy}>
                      {BULK_LABELS[action].label}
                    </Button>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="ml-auto">Limpar seleção</Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <RecordsTable
                records={visible}
                loading={loadingData}
                hasAnyInMonth={records.length > 0}
                selected={selected}
                highlightId={highlightId}
                sort={sort}
                order={order}
                onSortChange={(s, o) => { setSort(s); setOrder(o); }}
                onToggleSelect={toggleSelect}
                onToggleAll={toggleAll}
                onEdit={(r) => setModal({ open: true, initial: r })}
                onDuplicate={(r) => setModal({ open: true, duplicateOf: r })}
                onDelete={setDeleteTarget}
                onReceive={setReceiveTarget}
                onOpenNfFile={openNfFile}
                onNew={() => setModal({ open: true })}
              />
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      <FinanceModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false })}
        onSaved={handleSaved}
        initialData={modal.initial ?? null}
        duplicateOf={modal.duplicateOf ?? null}
        prefill={modal.prefill ?? null}
        clients={clients}
        companyId={scope}
        projects={projects.map((p) => ({ id: p.id, name: p.name, status: p.status, can_edit: p.can_edit }))}
        defaultProjectId={projectId}
      />

      <ReceiveDialog
        record={receiveTarget}
        onClose={() => setReceiveTarget(null)}
        onConfirmed={(r) => {
          toast({ title: r.type === "expense" ? "Pagamento registrado" : "Recebimento confirmado", description: `${r.title} · ${formatBRL(r.amount)}` });
          void load({ silent: true });
        }}
      />

      {dashboard && (
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          settings={dashboard.settings}
          limits={dashboard.limits}
          onSaved={(settings) => setDashboard({ ...dashboard, settings })}
          companyId={scope}
          companyName={currentCompany?.company.name ?? null}
        />
      )}

      {companyDetail && (
        <CompanySettingsDialog
          detail={companyDetail}
          open={companySettingsOpen}
          onOpenChange={setCompanySettingsOpen}
          onChanged={() => { void loadCompanyExtras(); void loadCompanies(); void load({ silent: true }); }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `"${deleteTarget.title}" (${formatBRL(deleteTarget.amount)}) some do histórico e dos totais. ` : ""}
              Esta ação não pode ser desfeita. Se você só quer tirar do faturamento, prefira cancelar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!bulkConfirm} onOpenChange={(open) => !open && !bulkBusy && setBulkConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{bulkConfirm ? BULK_LABELS[bulkConfirm].title : ""}</AlertDialogTitle>
            <AlertDialogDescription>
              {selected.size} lançamento{selected.size === 1 ? "" : "s"} selecionado{selected.size === 1 ? "" : "s"}. {bulkConfirm ? BULK_LABELS[bulkConfirm].description : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void runBulk(); }} disabled={bulkBusy} className={bulkConfirm === "delete" ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}>
              {bulkBusy ? "Aplicando…" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
