"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, CalendarDays, CalendarRange, RefreshCw, Settings2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollReveal } from "@/components/scroll-reveal";
import { AvailabilityManager } from "../perfil/components/availability-manager";
import { WeeklyRulesEditor } from "./components/weekly-rules-editor";
import { AgendaSettingsCard } from "./components/agenda-settings-card";
import { CalendarSyncPanel } from "./components/calendar-sync-panel";
import { AgendaPreview } from "./components/agenda-preview";
import {
  applyAgendaRules,
  createAvailability,
  deleteAvailabilities,
  deleteAvailability,
  fetchAgendaOverview,
  fetchAvailability,
  fetchMyAgenda,
  saveAgendaRules,
  saveAgendaSettings,
  type AgendaOverview,
  type AgendaRule,
  type AgendaSettings,
  type AgendaView,
  type AvailabilitySlot,
} from "@/lib/data-service";
import { addDaysToKey } from "@/lib/availability";
import { todayKey } from "@/lib/availability";

// Minha Agenda — quatro abas:
//   Visão geral      → prévia da agenda efetiva (o que o perfil mostra)
//   Semana padrão    → recorrência + preferências
//   Datas específicas → exceções: janelas próprias e bloqueios manuais
//   Sincronização    → Google / .ics (importar) e feed .ics (exportar)

type TabKey = "overview" | "weekly" | "dates" | "sync";
const TABS: TabKey[] = ["overview", "weekly", "dates", "sync"];

/** Mensagens do retorno do OAuth do Google (?cal=…&reason=…). */
const CAL_ERRORS: Record<string, string> = {
  denied: "Você cancelou a autorização no Google.",
  scope: "Você não permitiu o acesso à disponibilidade da agenda. Tente de novo e mantenha a opção marcada.",
  no_refresh: "O Google não devolveu a credencial de renovação. Remova o IsoScanning em myaccount.google.com/permissions e conecte de novo.",
  config: "Integração com o Google não configurada no servidor.",
  encryption: "Chave de criptografia ausente no servidor (ENCRYPTION_KEY).",
  service_role: "Service role do Supabase ausente no servidor.",
  migration: "Banco desatualizado: aplique a migration 68-agenda-avancada.sql no Supabase.",
  state: "Sessão de autorização expirada. Tente de novo.",
};

function AgendaPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile, loading } = useAuth();

  const initialTab = (searchParams.get("tab") as TabKey | null) ?? "overview";
  const [tab, setTab] = useState<TabKey>(TABS.includes(initialTab) ? initialTab : "overview");

  const [overview, setOverview] = useState<AgendaOverview | null>(null);
  const [agenda, setAgenda] = useState<AgendaView | null>(null);
  const [loadingAgenda, setLoadingAgenda] = useState(true);
  const [savingRules, setSavingRules] = useState(false);
  const [applyingRules, setApplyingRules] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [fetchingAvailability, setFetchingAvailability] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [lastClickedDate, setLastClickedDate] = useState<Date | null>(null);
  const [selectedSlotsToDelete, setSelectedSlotsToDelete] = useState<string[]>([]);
  const [isAllDay, setIsAllDay] = useState(false);
  const [slotType, setSlotType] = useState<"available" | "blocked">("available");
  const [newSlot, setNewSlot] = useState({ startTime: "09:00", endTime: "18:00" });
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  const notify = useCallback((kind: "success" | "error", message: string) => {
    if (kind === "success") {
      setErrorMsg("");
      setSuccessMsg(message);
    } else {
      setSuccessMsg("");
      setErrorMsg(message);
    }
  }, []);

  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => setSuccessMsg(""), 6000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  // Retorno do OAuth do Google
  useEffect(() => {
    const cal = searchParams.get("cal");
    if (!cal) return;
    if (cal === "connected") {
      const label = searchParams.get("label");
      notify("success", `Google Agenda conectado${label ? ` (${label})` : ""}. As datas ocupadas já foram importadas.`);
    } else if (cal === "error") {
      const reason = searchParams.get("reason") ?? "";
      const detail = searchParams.get("detail");
      notify("error", `${CAL_ERRORS[reason] ?? "Não foi possível conectar o Google Agenda."}${detail ? ` (${detail})` : ""}`);
    }
    // Limpa a query para a mensagem não voltar num refresh
    router.replace("/dashboard/agenda?tab=sync", { scroll: false });
  }, [searchParams, notify, router]);

  const loadOverview = useCallback(async () => {
    try {
      setOverview(await fetchAgendaOverview());
    } catch {
      notify("error", "Erro ao carregar a configuração da agenda. A migration 68 foi aplicada?");
    }
  }, [notify]);

  const loadAgenda = useCallback(async () => {
    setLoadingAgenda(true);
    try {
      const from = todayKey();
      setAgenda(await fetchMyAgenda({ from, to: addDaysToKey(from, 180) }));
    } finally {
      setLoadingAgenda(false);
    }
  }, []);

  const loadAvailability = useCallback(async () => {
    if (!userProfile?.id) return;
    setFetchingAvailability(true);
    try {
      setAvailabilitySlots(await fetchAvailability(userProfile.id, { from: todayKey() }));
    } catch {
      notify("error", "Erro ao carregar disponibilidade.");
    } finally {
      setFetchingAvailability(false);
    }
  }, [userProfile?.id, notify]);

  useEffect(() => {
    if (!userProfile?.id) return;
    void loadOverview();
    void loadAgenda();
    void loadAvailability();
  }, [userProfile?.id, loadOverview, loadAgenda, loadAvailability]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadOverview(), loadAgenda()]);
  }, [loadOverview, loadAgenda]);

  // ── Semana padrão / preferências ──
  const handleSaveRules = async (rules: AgendaRule[]) => {
    try {
      setSavingRules(true);
      const saved = await saveAgendaRules(rules);
      setOverview((prev) => (prev ? { ...prev, rules: saved } : prev));
      await loadAgenda();
      notify("success", "Semana padrão salva.");
    } catch {
      notify("error", "Erro ao salvar a semana padrão.");
    } finally {
      setSavingRules(false);
    }
  };

  const handleApplyRules = async (weeks: number) => {
    try {
      setApplyingRules(true);
      const { created } = await applyAgendaRules(weeks);
      await Promise.all([loadAvailability(), loadAgenda()]);
      notify("success", `${created} data(s) criada(s) a partir da semana padrão.`);
    } catch (err) {
      notify("error", (err as Error).message || "Erro ao aplicar a semana padrão.");
    } finally {
      setApplyingRules(false);
    }
  };

  const handleSaveSettings = async (patch: Partial<AgendaSettings>) => {
    try {
      setSavingSettings(true);
      const saved = await saveAgendaSettings(patch);
      setOverview((prev) => (prev ? { ...prev, settings: saved } : prev));
      await loadAgenda();
      notify("success", "Preferências salvas.");
    } catch {
      notify("error", "Erro ao salvar as preferências.");
    } finally {
      setSavingSettings(false);
    }
  };

  // ── Datas específicas ──
  const handleAddAvailability = async () => {
    if (!userProfile?.id || selectedDates.length === 0) {
      notify("error", "Selecione pelo menos uma data.");
      return;
    }
    try {
      setLoadingAvailability(true);
      const dates = selectedDates.map((date) => format(date, "yyyy-MM-dd"));
      await createAvailability({
        dates,
        startTime: isAllDay ? undefined : newSlot.startTime,
        endTime: isAllDay ? undefined : newSlot.endTime,
        isAllDay,
        type: slotType,
        professionalId: userProfile.id,
      });
      await Promise.all([loadAvailability(), loadAgenda()]);
      setSelectedDates([]);
      setLastClickedDate(null);
      notify(
        "success",
        slotType === "blocked"
          ? `${dates.length} data(s) bloqueada(s).`
          : `${dates.length} disponibilidade(s) adicionada(s)!`
      );
    } catch {
      notify("error", "Erro ao salvar as datas.");
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleDateSelect = (dates: Date[] | undefined) => {
    if (!dates) {
      setSelectedDates([]);
      setLastClickedDate(null);
      return;
    }
    setSelectedDates(dates);
  };

  const handleDayClick = (day: Date, modifiers: any, e: React.MouseEvent) => {
    if (modifiers.disabled) return;
    if (e.shiftKey && lastClickedDate) {
      const start = lastClickedDate < day ? lastClickedDate : day;
      const end = lastClickedDate < day ? day : lastClickedDate;
      const range: Date[] = [];
      const current = new Date(start);
      while (current <= end) {
        range.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      const next = [...selectedDates];
      for (const date of range) {
        if (!next.some((s) => s.toDateString() === date.toDateString())) next.push(date);
      }
      setSelectedDates(next);
    } else {
      const already = selectedDates.some((s) => s.toDateString() === day.toDateString());
      setSelectedDates(already
        ? selectedDates.filter((s) => s.toDateString() !== day.toDateString())
        : [...selectedDates, day]);
    }
    setLastClickedDate(day);
  };

  const handleDeleteAvailability = async (id: string) => {
    try {
      setLoadingAvailability(true);
      await deleteAvailability(id);
      await Promise.all([loadAvailability(), loadAgenda()]);
      setSelectedSlotsToDelete((prev) => prev.filter((slotId) => slotId !== id));
    } catch {
      notify("error", "Erro ao excluir.");
    } finally {
      setLoadingAvailability(false);
    }
  };

  const toggleSlotSelection = (slotId: string) => {
    setSelectedSlotsToDelete((prev) =>
      prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSlotsToDelete.length === availabilitySlots.length && availabilitySlots.length > 0) {
      setSelectedSlotsToDelete([]);
    } else {
      setSelectedSlotsToDelete(availabilitySlots.map((slot) => slot.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSlotsToDelete.length === 0) return;
    try {
      setDeletingBulk(true);
      setLoadingAvailability(true);
      await deleteAvailabilities(selectedSlotsToDelete);
      await Promise.all([loadAvailability(), loadAgenda()]);
      notify("success", `${selectedSlotsToDelete.length} registro(s) excluído(s).`);
      setSelectedSlotsToDelete([]);
    } catch {
      notify("error", "Erro ao excluir.");
    } finally {
      setDeletingBulk(false);
      setLoadingAvailability(false);
    }
  };

  if (loading || !userProfile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container max-w-5xl mx-auto py-8 px-4">
          <div className="mb-6 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-80" />
            </div>
          </div>
          <Skeleton className="h-10 w-full max-w-md rounded-lg" />
          <div className="mt-6 border rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Skeleton className="h-72 rounded-xl" />
              <div className="space-y-3">
                <Skeleton className="h-6 w-40" />
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const connections = overview?.connections ?? [];
  const activeConnections = connections.filter((c) => c.syncEnabled && c.status === "active").length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container max-w-5xl mx-auto py-8 px-4">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/dashboard" className="p-2 rounded-full hover:bg-accent transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Minha Agenda</h1>
            <p className="text-muted-foreground">
              Defina sua semana padrão, marque exceções e deixe seus calendários fecharem as datas sozinhos.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-4 bg-green-500/10 text-green-600 rounded-lg border border-green-500/20">
            {successMsg}
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-4">
            <TabsTrigger value="overview" className="gap-2 py-2">
              <CalendarDays className="h-4 w-4" /> Visão geral
            </TabsTrigger>
            <TabsTrigger value="weekly" className="gap-2 py-2">
              <Settings2 className="h-4 w-4" /> Semana padrão
            </TabsTrigger>
            <TabsTrigger value="dates" className="gap-2 py-2">
              <CalendarRange className="h-4 w-4" /> Datas específicas
            </TabsTrigger>
            <TabsTrigger value="sync" className="gap-2 py-2">
              <RefreshCw className="h-4 w-4" /> Sincronização
              {activeConnections > 0 && (
                <span className="ml-1 rounded-full bg-emerald-500/15 px-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {activeConnections}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ScrollReveal>
              <AgendaPreview agenda={agenda} loading={loadingAgenda} />
            </ScrollReveal>
          </TabsContent>

          <TabsContent value="weekly" className="space-y-6">
            <ScrollReveal>
              {overview ? (
                <WeeklyRulesEditor
                  rules={overview.rules}
                  saving={savingRules}
                  onSave={handleSaveRules}
                  onApply={handleApplyRules}
                  applying={applyingRules}
                />
              ) : (
                <Skeleton className="h-96 w-full rounded-xl" />
              )}
            </ScrollReveal>
            <ScrollReveal>
              {overview ? (
                <AgendaSettingsCard settings={overview.settings} saving={savingSettings} onSave={handleSaveSettings} />
              ) : (
                <Skeleton className="h-64 w-full rounded-xl" />
              )}
            </ScrollReveal>
          </TabsContent>

          <TabsContent value="dates">
            <ScrollReveal>
              <AvailabilityManager
                title="Datas específicas"
                description="Exceções à semana padrão: uma data com horário próprio substitui a recorrência daquele dia; um bloqueio fecha o período no seu perfil."
                selectedDates={selectedDates}
                handleDateSelect={handleDateSelect}
                handleDayClick={handleDayClick}
                availabilitySlots={availabilitySlots}
                isAllDay={isAllDay}
                setIsAllDay={setIsAllDay}
                newSlot={newSlot}
                setNewSlot={setNewSlot}
                handleAddAvailability={handleAddAvailability}
                loadingAvailability={loadingAvailability}
                fetchingAvailability={fetchingAvailability}
                handleSelectAll={handleSelectAll}
                selectedSlotsToDelete={selectedSlotsToDelete}
                toggleSlotSelection={toggleSlotSelection}
                showBulkDeleteConfirm={showBulkDeleteConfirm}
                setShowBulkDeleteConfirm={setShowBulkDeleteConfirm}
                deletingBulk={deletingBulk}
                handleBulkDelete={handleBulkDelete}
                handleDeleteAvailability={handleDeleteAvailability}
                slotType={slotType}
                setSlotType={setSlotType}
              />
            </ScrollReveal>
          </TabsContent>

          <TabsContent value="sync">
            <ScrollReveal>
              <CalendarSyncPanel
                connections={connections}
                feedUrl={overview?.feedUrl ?? null}
                onChanged={refreshAll}
                notify={notify}
              />
            </ScrollReveal>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}

export default function AgendaPage() {
  // useSearchParams exige Suspense no App Router
  return (
    <Suspense fallback={null}>
      <AgendaPageInner />
    </Suspense>
  );
}
