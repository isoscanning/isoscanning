"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Calculator,
  Plus,
  Pencil,
  Trash2,
  Package,
  TrendingDown,
  DollarSign,
  ArrowLeft,
  ChevronRight,
  MonitorSmartphone,
  RefreshCw,
  CalendarDays,
  Building2,
  Zap,
  ChevronDown,
  FileText,
  ClipboardList,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";
import apiClient from "@/lib/api-service";
import { ScrollReveal } from "@/components/scroll-reveal";

// ── Types ──────────────────────────────────────────────────────

interface EquipmentItem {
  id: string;
  name: string;
  value: number;
  usefulLifeMonths: number;
  jobsPerMonth: number;
  costPerJob: number;
}

interface SoftwareItem {
  id: string;
  name: string;
  billingCycle: "monthly" | "annual";
  cost: number;
  monthlyCost: number;
}

interface InfrastructureItem {
  id: string;
  name: string;
  monthlyCost: number;
}

const EMPTY_EQUIP_FORM = { name: "", value: "", usefulLifeMonths: "", jobsPerMonth: "" };
const EMPTY_SW_FORM = { name: "", billingCycle: "monthly" as "monthly" | "annual", cost: "" };
const EMPTY_INFRA_FORM = { name: "", monthlyCost: "" };

// ── Helpers ────────────────────────────────────────────────────

function fmt(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ── Page ───────────────────────────────────────────────────────

export default function BudgetCalculatorPage() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();

  const [equipments, setEquipments] = useState<EquipmentItem[]>([]);
  const [softwares, setSoftwares] = useState<SoftwareItem[]>([]);
  const [infrastructures, setInfrastructures] = useState<InfrastructureItem[]>([]);
  const [quotes, setQuotes] = useState<{ id: string; eventName: string; eventDate?: string; grandTotal: number; createdAt: string }[]>([]);
  const [fetching, setFetching] = useState(true);

  // Equipment dialog
  const [equipDialogOpen, setEquipDialogOpen] = useState(false);
  const [editingEquip, setEditingEquip] = useState<EquipmentItem | null>(null);
  const [equipForm, setEquipForm] = useState(EMPTY_EQUIP_FORM);
  const [equipSaving, setEquipSaving] = useState(false);
  const [equipError, setEquipError] = useState("");

  // Software dialog
  const [swDialogOpen, setSwDialogOpen] = useState(false);
  const [editingSw, setEditingSw] = useState<SoftwareItem | null>(null);
  const [swForm, setSwForm] = useState(EMPTY_SW_FORM);
  const [swSaving, setSwSaving] = useState(false);
  const [swError, setSwError] = useState("");

  // Infrastructure dialog
  const [infraDialogOpen, setInfraDialogOpen] = useState(false);
  const [editingInfra, setEditingInfra] = useState<InfrastructureItem | null>(null);
  const [infraForm, setInfraForm] = useState(EMPTY_INFRA_FORM);
  const [infraSaving, setInfraSaving] = useState(false);
  const [infraError, setInfraError] = useState("");

  // Delete confirmation (equipment/software/infrastructure)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: "equipment" | "software" | "infrastructure" } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Delete quote
  const [deleteQuoteTarget, setDeleteQuoteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deletingQuote, setDeletingQuote] = useState(false);

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  const fetchAll = useCallback(async () => {
    if (!userProfile) return;
    try {
      const [equipRes, swRes, infraRes, quotesRes] = await Promise.all([
        apiClient.get("/budget-calculator"),
        apiClient.get("/budget-calculator/softwares"),
        apiClient.get("/budget-calculator/infrastructure"),
        apiClient.get("/budget-quotes"),
      ]);
      setEquipments(equipRes.data ?? []);
      setSoftwares(swRes.data ?? []);
      setInfrastructures(infraRes.data ?? []);
      setQuotes(quotesRes.data ?? []);
    } catch (e) {
      console.error("Error fetching budget data", e);
    } finally {
      setFetching(false);
    }
  }, [userProfile]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived totals ──────────────────────────────────────────

  const totalCostPerJob = equipments.reduce((s, i) => s + i.costPerJob, 0);
  const totalMonthlySoftware = softwares.reduce((s, i) => s + i.monthlyCost, 0);
  const totalMonthlyInfra = infrastructures.reduce((s, i) => s + i.monthlyCost, 0);
  const totalInvestment = equipments.reduce((s, i) => s + i.value, 0);

  // ── Equipment CRUD ──────────────────────────────────────────

  function openCreateEquip() {
    setEditingEquip(null);
    setEquipForm(EMPTY_EQUIP_FORM);
    setEquipError("");
    setEquipDialogOpen(true);
  }

  function openEditEquip(item: EquipmentItem) {
    setEditingEquip(item);
    setEquipForm({
      name: item.name,
      value: String(item.value),
      usefulLifeMonths: String(item.usefulLifeMonths),
      jobsPerMonth: String(item.jobsPerMonth),
    });
    setEquipError("");
    setEquipDialogOpen(true);
  }

  function validateEquipForm(): boolean {
    if (!equipForm.name.trim()) { setEquipError("Informe o nome do equipamento."); return false; }
    if (!equipForm.value || Number(equipForm.value) <= 0) { setEquipError("Informe um valor válido."); return false; }
    if (!equipForm.usefulLifeMonths || Number(equipForm.usefulLifeMonths) <= 0) { setEquipError("Informe a vida útil em meses."); return false; }
    if (!equipForm.jobsPerMonth || Number(equipForm.jobsPerMonth) <= 0) { setEquipError("Informe os trabalhos por mês."); return false; }
    return true;
  }

  async function handleSaveEquip() {
    if (!validateEquipForm()) return;
    setEquipSaving(true);
    setEquipError("");
    try {
      const payload = {
        name: equipForm.name.trim(),
        value: Number(equipForm.value),
        usefulLifeMonths: Number(equipForm.usefulLifeMonths),
        jobsPerMonth: Number(equipForm.jobsPerMonth),
      };
      if (editingEquip) {
        await apiClient.put(`/budget-calculator/${editingEquip.id}`, payload);
      } else {
        await apiClient.post("/budget-calculator", payload);
      }
      setEquipDialogOpen(false);
      await fetchAll();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? "Erro ao salvar.";
      setEquipError(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setEquipSaving(false);
    }
  }

  // ── Software CRUD ───────────────────────────────────────────

  function openCreateSw() {
    setEditingSw(null);
    setSwForm(EMPTY_SW_FORM);
    setSwError("");
    setSwDialogOpen(true);
  }

  function openEditSw(item: SoftwareItem) {
    setEditingSw(item);
    setSwForm({ name: item.name, billingCycle: item.billingCycle, cost: String(item.cost) });
    setSwError("");
    setSwDialogOpen(true);
  }

  async function handleSaveSw() {
    if (!swForm.name.trim()) { setSwError("Informe o nome do software."); return; }
    if (!swForm.cost || Number(swForm.cost) <= 0) { setSwError("Informe um valor válido."); return; }
    setSwSaving(true);
    setSwError("");
    try {
      const payload = {
        name: swForm.name.trim(),
        billingCycle: swForm.billingCycle,
        cost: Number(swForm.cost),
      };
      if (editingSw) {
        await apiClient.put(`/budget-calculator/softwares/${editingSw.id}`, payload);
      } else {
        await apiClient.post("/budget-calculator/softwares", payload);
      }
      setSwDialogOpen(false);
      await fetchAll();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? "Erro ao salvar.";
      setSwError(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setSwSaving(false);
    }
  }

  // ── Infrastructure CRUD ─────────────────────────────────────

  function openCreateInfra() {
    setEditingInfra(null);
    setInfraForm(EMPTY_INFRA_FORM);
    setInfraError("");
    setInfraDialogOpen(true);
  }

  function openEditInfra(item: InfrastructureItem) {
    setEditingInfra(item);
    setInfraForm({ name: item.name, monthlyCost: String(item.monthlyCost) });
    setInfraError("");
    setInfraDialogOpen(true);
  }

  async function handleSaveInfra() {
    if (!infraForm.name.trim()) { setInfraError("Informe o nome do item."); return; }
    if (!infraForm.monthlyCost || Number(infraForm.monthlyCost) <= 0) { setInfraError("Informe um valor mensal válido."); return; }
    setInfraSaving(true);
    setInfraError("");
    try {
      const payload = { name: infraForm.name.trim(), monthlyCost: Number(infraForm.monthlyCost) };
      if (editingInfra) {
        await apiClient.put(`/budget-calculator/infrastructure/${editingInfra.id}`, payload);
      } else {
        await apiClient.post("/budget-calculator/infrastructure", payload);
      }
      setInfraDialogOpen(false);
      await fetchAll();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? "Erro ao salvar.";
      setInfraError(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setInfraSaving(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === "equipment") {
        await apiClient.delete(`/budget-calculator/${deleteTarget.id}`);
      } else if (deleteTarget.type === "software") {
        await apiClient.delete(`/budget-calculator/softwares/${deleteTarget.id}`);
      } else {
        await apiClient.delete(`/budget-calculator/infrastructure/${deleteTarget.id}`);
      }
      setDeleteTarget(null);
      await fetchAll();
    } catch (e) {
      console.error("Error deleting item", e);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteQuote() {
    if (!deleteQuoteTarget) return;
    setDeletingQuote(true);
    try {
      await apiClient.delete(`/budget-quotes/${deleteQuoteTarget.id}`);
      setDeleteQuoteTarget(null);
      await fetchAll();
    } catch (e) {
      console.error("Error deleting quote", e);
    } finally {
      setDeletingQuote(false);
    }
  }

  // ── Live previews ───────────────────────────────────────────

  const equipPreview =
    equipForm.value && equipForm.usefulLifeMonths && equipForm.jobsPerMonth &&
    Number(equipForm.value) > 0 && Number(equipForm.usefulLifeMonths) > 0 && Number(equipForm.jobsPerMonth) > 0
      ? Number(equipForm.value) / (Number(equipForm.usefulLifeMonths) * Number(equipForm.jobsPerMonth))
      : null;

  const swPreview =
    swForm.cost && Number(swForm.cost) > 0
      ? swForm.billingCycle === "annual"
        ? Number(swForm.cost) / 12
        : Number(swForm.cost)
      : null;

  // ── Render ──────────────────────────────────────────────────

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (!userProfile) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background/50">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-10">

          {/* Breadcrumb + Hero */}
          <ScrollReveal>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-sm">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Calculadora de Orçamento</span>
            </div>

            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 p-8 md:p-12 border border-amber-500/10">
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex items-center justify-center shadow-lg shrink-0">
                    <Calculator className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-500">
                      Calculadora de Orçamento
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                      Descubra o custo real de cada trabalho com base na depreciação de equipamentos e assinaturas de software.
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/calculadora-orcamento/novo-orcamento" className="shrink-0">
                  <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 font-semibold px-5 py-2.5">
                    <FileText className="h-4 w-4" />
                    Criar Orçamento
                  </Button>
                </Link>
              </div>
              <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-64 w-64 rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />
            </div>
          </ScrollReveal>

          {/* Summary Cards */}
          <ScrollReveal delay={0.1}>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="border-primary/10 hover:shadow-md transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Equipamentos</CardTitle>
                  <Package className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{equipments.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">itens cadastrados</p>
                </CardContent>
              </Card>

              <Card className="border-primary/10 hover:shadow-md transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Custo / Trabalho</CardTitle>
                  <TrendingDown className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">{fmt(totalCostPerJob)}</div>
                  <p className="text-xs text-muted-foreground mt-1">depreciação de equipamentos</p>
                </CardContent>
              </Card>

              <Card className="border-primary/10 hover:shadow-md transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Softwares / Mês</CardTitle>
                  <MonitorSmartphone className="h-4 w-4 text-violet-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-violet-500">{fmt(totalMonthlySoftware)}</div>
                  <p className="text-xs text-muted-foreground mt-1">recorrente por mês</p>
                </CardContent>
              </Card>

              <Card className="border-primary/10 hover:shadow-md transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Infraestrutura / Mês</CardTitle>
                  <Building2 className="h-4 w-4 text-rose-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-rose-500">{fmt(totalMonthlyInfra)}</div>
                  <p className="text-xs text-muted-foreground mt-1">recorrente por mês</p>
                </CardContent>
              </Card>

              <Card className="border-primary/10 hover:shadow-md transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Investimento Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fmt(totalInvestment)}</div>
                  <p className="text-xs text-muted-foreground mt-1">em equipamentos</p>
                </CardContent>
              </Card>
            </div>
          </ScrollReveal>

          {/* ── Accordion de Categorias ── */}
          <ScrollReveal delay={0.2}>
            <Accordion
              type="multiple"
              defaultValue={[]}
              className="space-y-3"
            >
              {/* ── Equipamentos ── */}
              <AccordionItem value="equipment" className="border rounded-2xl overflow-hidden bg-card shadow-sm">
                <div className="flex items-center justify-between pr-4 bg-card group">
                  <AccordionTrigger className="flex-1 hover:no-underline px-6 py-4 [&[data-state=open]>svg]:rotate-180">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-data-[state=open]:shadow-md transition-shadow">
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-base leading-tight">Equipamentos</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {equipments.length} {equipments.length === 1 ? "item" : "itens"} cadastrados
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <div className="flex items-center gap-3 mr-4">
                    {equipments.length > 0 && (
                      <div className="hidden sm:flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Custo/trabalho</span>
                        <span className="font-bold text-amber-500 text-sm">{fmt(totalCostPerJob)}</span>
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs shrink-0"
                      onClick={(e) => { e.stopPropagation(); openCreateEquip(); }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Adicionar</span>
                    </Button>
                  </div>
                </div>

                <AccordionContent className="px-6 pb-6 pt-2">
                  {equipments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-3 border-2 border-dashed border-amber-200 dark:border-amber-900/40 rounded-xl">
                      <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Package className="h-6 w-6 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Nenhum equipamento cadastrado</p>
                        <p className="text-muted-foreground text-xs mt-1 max-w-xs">Cadastre seus equipamentos para calcular o custo de depreciação por trabalho.</p>
                      </div>
                      <Button size="sm" onClick={openCreateEquip} className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs">
                        <Plus className="h-3.5 w-3.5" /> Cadastrar primeiro equipamento
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {equipments.map((item) => (
                          <Card key={item.id} className="group border hover:border-amber-500/50 hover:shadow-md transition-all duration-300">
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                    <Package className="h-4 w-4" />
                                  </div>
                                  <CardTitle className="text-sm leading-tight truncate">{item.name}</CardTitle>
                                </div>
                                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-amber-500" onClick={() => openEditEquip(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => setDeleteTarget({ id: item.id, name: item.name, type: "equipment" })}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                                <div><p className="font-medium text-foreground">{fmt(item.value)}</p><p>Valor</p></div>
                                <div><p className="font-medium text-foreground">{item.usefulLifeMonths}m</p><p>Vida útil</p></div>
                                <div><p className="font-medium text-foreground">{item.jobsPerMonth}/mês</p><p>Jobs/mês</p></div>
                              </div>
                              <div className="pt-2 border-t border-border flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Custo/trabalho</span>
                                <span className="font-bold text-amber-500 text-sm">{fmt(item.costPerJob)}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <div className="rounded-xl bg-amber-50/70 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30 p-4">
                        <div className="space-y-1.5">
                          {equipments.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b border-border/40 last:border-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                <span className="font-medium truncate">{item.name}</span>
                                <span className="text-xs text-muted-foreground hidden md:block shrink-0">{fmt(item.value)} ÷ ({item.usefulLifeMonths}×{item.jobsPerMonth})</span>
                              </div>
                              <span className="font-semibold text-amber-500 shrink-0 ml-2">{fmt(item.costPerJob)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-amber-300/30 flex items-center justify-between">
                          <span className="font-bold text-sm">Total por trabalho</span>
                          <span className="font-bold text-amber-500 text-lg">{fmt(totalCostPerJob)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* ── Softwares ── */}
              <AccordionItem value="software" className="border rounded-2xl overflow-hidden bg-card shadow-sm">
                <div className="flex items-center justify-between pr-4 bg-card group">
                  <AccordionTrigger className="flex-1 hover:no-underline px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 group-data-[state=open]:shadow-md transition-shadow">
                        <MonitorSmartphone className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-base leading-tight">Softwares</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {softwares.length} {softwares.length === 1 ? "item" : "itens"} cadastrados
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <div className="flex items-center gap-3 mr-4">
                    {softwares.length > 0 && (
                      <div className="hidden sm:flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Total/mês</span>
                        <span className="font-bold text-violet-500 text-sm">{fmt(totalMonthlySoftware)}</span>
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs shrink-0"
                      onClick={(e) => { e.stopPropagation(); openCreateSw(); }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Adicionar</span>
                    </Button>
                  </div>
                </div>

                <AccordionContent className="px-6 pb-6 pt-2">
                  {softwares.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-3 border-2 border-dashed border-violet-200 dark:border-violet-900/40 rounded-xl">
                      <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                        <MonitorSmartphone className="h-6 w-6 text-violet-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Nenhum software cadastrado</p>
                        <p className="text-muted-foreground text-xs mt-1 max-w-xs">Cadastre suas assinaturas para visualizar o custo mensal total.</p>
                      </div>
                      <Button size="sm" onClick={openCreateSw} className="gap-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs">
                        <Plus className="h-3.5 w-3.5" /> Cadastrar primeiro software
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {softwares.map((item) => (
                          <Card key={item.id} className="group border hover:border-violet-500/50 hover:shadow-md transition-all duration-300">
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                                    <MonitorSmartphone className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <CardTitle className="text-sm leading-tight truncate">{item.name}</CardTitle>
                                    <span className={`inline-flex items-center gap-1 text-xs mt-0.5 px-1.5 py-0.5 rounded-full font-medium ${item.billingCycle === "annual" ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                                      {item.billingCycle === "annual" ? <><CalendarDays className="h-3 w-3" />Anual</> : <><RefreshCw className="h-3 w-3" />Mensal</>}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-violet-500" onClick={() => openEditSw(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => setDeleteTarget({ id: item.id, name: item.name, type: "software" })}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                <div><p className="font-medium text-foreground">{fmt(item.cost)}</p><p>{item.billingCycle === "annual" ? "Valor anual" : "Valor mensal"}</p></div>
                                {item.billingCycle === "annual" && <div><p className="font-medium text-foreground">{fmt(item.cost / 12)}</p><p>Equiv. mensal</p></div>}
                              </div>
                              <div className="pt-2 border-t border-border flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Custo mensal</span>
                                <span className="font-bold text-violet-500 text-sm">{fmt(item.monthlyCost)}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <div className="rounded-xl bg-violet-50/70 dark:bg-violet-900/10 border border-violet-200/50 dark:border-violet-800/30 p-4">
                        <div className="space-y-1.5">
                          {softwares.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b border-border/40 last:border-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                                <span className="font-medium truncate">{item.name}</span>
                                {item.billingCycle === "annual" && <span className="text-xs text-muted-foreground hidden md:block shrink-0">{fmt(item.cost)}/ano ÷ 12</span>}
                              </div>
                              <span className="font-semibold text-violet-500 shrink-0 ml-2">{fmt(item.monthlyCost)}/mês</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-violet-300/30 flex items-center justify-between">
                          <span className="font-bold text-sm">Total mensal de softwares</span>
                          <span className="font-bold text-violet-500 text-lg">{fmt(totalMonthlySoftware)}/mês</span>
                        </div>
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* ── Infraestrutura ── */}
              <AccordionItem value="infrastructure" className="border rounded-2xl overflow-hidden bg-card shadow-sm">
                <div className="flex items-center justify-between pr-4 bg-card group">
                  <AccordionTrigger className="flex-1 hover:no-underline px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 group-data-[state=open]:shadow-md transition-shadow">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-base leading-tight">Infraestrutura</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {infrastructures.length} {infrastructures.length === 1 ? "item" : "itens"} cadastrados
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <div className="flex items-center gap-3 mr-4">
                    {infrastructures.length > 0 && (
                      <div className="hidden sm:flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Total/mês</span>
                        <span className="font-bold text-rose-500 text-sm">{fmt(totalMonthlyInfra)}</span>
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs shrink-0"
                      onClick={(e) => { e.stopPropagation(); openCreateInfra(); }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Adicionar</span>
                    </Button>
                  </div>
                </div>

                <AccordionContent className="px-6 pb-6 pt-2">
                  {infrastructures.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-3 border-2 border-dashed border-rose-200 dark:border-rose-900/40 rounded-xl">
                      <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-rose-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Nenhum item de infraestrutura cadastrado</p>
                        <p className="text-muted-foreground text-xs mt-1 max-w-xs">Adicione custos como aluguel, energia, internet, impostos e outros.</p>
                      </div>
                      <Button size="sm" onClick={openCreateInfra} className="gap-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs">
                        <Plus className="h-3.5 w-3.5" /> Cadastrar primeiro item
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {infrastructures.map((item) => (
                          <Card key={item.id} className="group border hover:border-rose-500/50 hover:shadow-md transition-all duration-300">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                    <Zap className="h-4 w-4" />
                                  </div>
                                  <CardTitle className="text-sm leading-tight truncate">{item.name}</CardTitle>
                                </div>
                                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-rose-500" onClick={() => openEditInfra(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => setDeleteTarget({ id: item.id, name: item.name, type: "infrastructure" })}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center justify-between pt-2 border-t border-border">
                                <span className="text-xs text-muted-foreground">Custo mensal</span>
                                <span className="font-bold text-rose-500 text-sm">{fmt(item.monthlyCost)}/mês</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <div className="rounded-xl bg-rose-50/70 dark:bg-rose-900/10 border border-rose-200/50 dark:border-rose-800/30 p-4">
                        <div className="space-y-1.5">
                          {infrastructures.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b border-border/40 last:border-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                <span className="font-medium truncate">{item.name}</span>
                              </div>
                              <span className="font-semibold text-rose-500 shrink-0 ml-2">{fmt(item.monthlyCost)}/mês</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-rose-300/30 flex items-center justify-between">
                          <span className="font-bold text-sm">Total mensal de infraestrutura</span>
                          <span className="font-bold text-rose-500 text-lg">{fmt(totalMonthlyInfra)}/mês</span>
                        </div>
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </ScrollReveal>

          {/* ── Orçamentos Salvos ── */}
          <ScrollReveal delay={0.3}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-amber-500" />
                  <h2 className="text-lg font-bold">Orçamentos Gerados</h2>
                  {quotes.length > 0 && (
                    <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-semibold px-2 py-0.5 rounded-full">
                      {quotes.length}
                    </span>
                  )}
                </div>
                <Link href="/dashboard/calculadora-orcamento/novo-orcamento">
                  <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs">
                    <Plus className="h-3.5 w-3.5" />
                    Novo Orçamento
                  </Button>
                </Link>
              </div>

              {quotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3 border-2 border-dashed border-amber-200 dark:border-amber-900/40 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Nenhum orçamento gerado ainda</p>
                    <p className="text-muted-foreground text-xs mt-1 max-w-xs">
                      Crie seu primeiro orçamento para calcular o custo total de um evento com transporte, hospedagem e mais.
                    </p>
                  </div>
                  <Link href="/dashboard/calculadora-orcamento/novo-orcamento">
                    <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs">
                      <Plus className="h-3.5 w-3.5" /> Criar primeiro orçamento
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quotes.map((q) => (
                    <Card key={q.id} className="group border hover:border-amber-500/50 hover:shadow-md transition-all duration-300 h-full flex flex-col">
                      <CardHeader className="pb-2">
                        <div className="flex items-start gap-3">
                          <Link href={`/dashboard/calculadora-orcamento/orcamentos/${q.id}`} className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="text-sm leading-tight truncate group-hover:text-amber-500 transition-colors">{q.eventName}</CardTitle>
                              {q.eventDate && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {new Date(q.eventDate).toLocaleDateString("pt-BR")}
                                </p>
                              )}
                            </div>
                          </Link>
                          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/dashboard/calculadora-orcamento/novo-orcamento?editId=${q.id}`}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-amber-500"><Pencil className="h-3.5 w-3.5" /></Button>
                            </Link>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => setDeleteQuoteTarget({ id: q.id, name: q.eventName })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="mt-auto">
                        <Link href={`/dashboard/calculadora-orcamento/orcamentos/${q.id}`}>
                          <div className="flex items-center justify-between pt-2 border-t border-border">
                            <span className="text-xs text-muted-foreground">Total estimado</span>
                            <span className="font-bold text-amber-500 text-sm">{fmt(q.grandTotal)}</span>
                          </div>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollReveal>

        </div>
      </main>

      <Footer />

      {/* ── Equipment Dialog ── */}
      <Dialog open={equipDialogOpen} onOpenChange={setEquipDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEquip ? "Editar Equipamento" : "Novo Equipamento"}</DialogTitle>
            <DialogDescription>Preencha os dados para calcular o custo de depreciação por trabalho.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="equip-name">Nome do equipamento</Label>
              <Input id="equip-name" placeholder="ex: Câmera Sony A7 IV" value={equipForm.name}
                onChange={(e) => setEquipForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="equip-value">Valor (R$)</Label>
              <Input id="equip-value" type="number" min="0.01" step="0.01" placeholder="ex: 10000"
                value={equipForm.value} onChange={(e) => setEquipForm((f) => ({ ...f, value: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="equip-life">Vida útil (meses)</Label>
                <Input id="equip-life" type="number" min="1" step="1" placeholder="ex: 36"
                  value={equipForm.usefulLifeMonths} onChange={(e) => setEquipForm((f) => ({ ...f, usefulLifeMonths: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="equip-jobs">Jobs por mês</Label>
                <Input id="equip-jobs" type="number" min="1" step="1" placeholder="ex: 10"
                  value={equipForm.jobsPerMonth} onChange={(e) => setEquipForm((f) => ({ ...f, jobsPerMonth: e.target.value }))} />
              </div>
            </div>
            {equipPreview !== null && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Custo por trabalho</span>
                <span className="font-bold text-amber-500 text-lg">{fmt(equipPreview)}</span>
              </div>
            )}
            {equipError && <p className="text-sm text-destructive">{equipError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEquipDialogOpen(false)} disabled={equipSaving}>Cancelar</Button>
            <Button onClick={handleSaveEquip} disabled={equipSaving} className="bg-amber-500 hover:bg-amber-600 text-white">
              {equipSaving ? "Salvando..." : editingEquip ? "Salvar alterações" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Software Dialog ── */}
      <Dialog open={swDialogOpen} onOpenChange={setSwDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSw ? "Editar Software" : "Novo Software"}</DialogTitle>
            <DialogDescription>Informe o software e seu custo de licença ou assinatura.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sw-name">Nome do software</Label>
              <Input id="sw-name" placeholder="ex: Adobe Lightroom" value={swForm.name}
                onChange={(e) => setSwForm((f) => ({ ...f, name: e.target.value }))} />
            </div>

            {/* Billing cycle toggle */}
            <div className="space-y-1.5">
              <Label>Tipo de cobrança</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSwForm((f) => ({ ...f, billingCycle: "monthly" }))}
                  className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                    swForm.billingCycle === "monthly"
                      ? "border-violet-500 bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400"
                      : "border-border text-muted-foreground hover:border-violet-300"
                  }`}
                >
                  <RefreshCw className="h-4 w-4" />
                  Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setSwForm((f) => ({ ...f, billingCycle: "annual" }))}
                  className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                    swForm.billingCycle === "annual"
                      ? "border-violet-500 bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400"
                      : "border-border text-muted-foreground hover:border-violet-300"
                  }`}
                >
                  <CalendarDays className="h-4 w-4" />
                  Anual
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sw-cost">
                {swForm.billingCycle === "annual" ? "Valor anual (R$)" : "Valor mensal (R$)"}
              </Label>
              <Input id="sw-cost" type="number" min="0.01" step="0.01"
                placeholder={swForm.billingCycle === "annual" ? "ex: 1200" : "ex: 100"}
                value={swForm.cost} onChange={(e) => setSwForm((f) => ({ ...f, cost: e.target.value }))} />
            </div>

            {swPreview !== null && (
              <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Custo mensal</span>
                  <span className="font-bold text-violet-500 text-lg">{fmt(swPreview)}/mês</span>
                </div>
                {swForm.billingCycle === "annual" && (
                  <p className="text-xs text-muted-foreground">{fmt(Number(swForm.cost))} ÷ 12 meses</p>
                )}
              </div>
            )}
            {swError && <p className="text-sm text-destructive">{swError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSwDialogOpen(false)} disabled={swSaving}>Cancelar</Button>
            <Button onClick={handleSaveSw} disabled={swSaving} className="bg-violet-500 hover:bg-violet-600 text-white">
              {swSaving ? "Salvando..." : editingSw ? "Salvar alterações" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Infrastructure Dialog ── */}
      <Dialog open={infraDialogOpen} onOpenChange={setInfraDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingInfra ? "Editar Item" : "Novo Item de Infraestrutura"}</DialogTitle>
            <DialogDescription>Informe o nome e o custo mensal recorrente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="infra-name">Nome do item</Label>
              <Input id="infra-name" placeholder="ex: Aluguel do estúdio, Energia elétrica, Internet..."
                value={infraForm.name} onChange={(e) => setInfraForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="infra-cost">Custo mensal (R$)</Label>
              <Input id="infra-cost" type="number" min="0.01" step="0.01" placeholder="ex: 500"
                value={infraForm.monthlyCost} onChange={(e) => setInfraForm((f) => ({ ...f, monthlyCost: e.target.value }))} />
            </div>
            {infraForm.monthlyCost && Number(infraForm.monthlyCost) > 0 && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Custo mensal</span>
                <span className="font-bold text-rose-500 text-lg">{fmt(Number(infraForm.monthlyCost))}/mês</span>
              </div>
            )}
            {infraError && <p className="text-sm text-destructive">{infraError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInfraDialogOpen(false)} disabled={infraSaving}>Cancelar</Button>
            <Button onClick={handleSaveInfra} disabled={infraSaving} className="bg-rose-500 hover:bg-rose-600 text-white">
              {infraSaving ? "Salvando..." : editingInfra ? "Salvar alterações" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {deleteTarget?.type === "software" ? "software" : deleteTarget?.type === "infrastructure" ? "item de infraestrutura" : "equipamento"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete quote confirmation ── */}
      <AlertDialog open={!!deleteQuoteTarget} onOpenChange={(open) => !open && setDeleteQuoteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o orçamento <strong>{deleteQuoteTarget?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingQuote}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuote} disabled={deletingQuote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingQuote ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
