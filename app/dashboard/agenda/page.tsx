"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, CalendarDays, CalendarRange, Eye, Link2, Settings2, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollReveal } from "@/components/scroll-reveal";
import { AvailabilityManager } from "../perfil/components/availability-manager";
import { WeeklyRulesEditor } from "./components/weekly-rules-editor";
import { AgendaSettingsCard } from "./components/agenda-settings-card";
import { CalendarSyncPanel } from "./components/calendar-sync-panel";
import { AgendaPreview } from "./components/agenda-preview";
import { PersonalCalendar } from "./components/personal-calendar";
import { AgendaSetupChecklist, type ConfigSection } from "./components/agenda-setup-checklist";
import { PlanBadge, PlanGate } from "@/components/plan/plan-gate";
import { usePlan } from "@/lib/plans/use-plan";
import {
  applyAgendaRules,
  createAvailability,
  syncCalendars,
  createCalendarEvent,
  deleteAvailabilities,
  deleteAvailability,
  deleteCalendarEvent,
  fetchAgendaOverview,
  fetchAvailability,
  fetchCalendarEvents,
  fetchMyAgenda,
  isFlowReservation,
  saveAgendaRules,
  saveAgendaSettings,
  updateCalendarEvent,
  type AgendaOverview,
  type AgendaRule,
  type AgendaSettings,
  type AgendaView,
  type AvailabilitySlot,
  type CalendarEvent,
  type CalendarEventDraft,
} from "@/lib/data-service";
import { addDaysToKey, todayKey } from "@/lib/availability";

// Minha Agenda — o modelo mental é "privado × público":
//
//   Minha agenda              → compromissos com detalhes (só o dono vê)
//   Visão pública             → o que um contratante vê no perfil: dias de
//                               atendimento + datas livres/fechadas, sem motivo
//   Configurar agenda pública → as ferramentas que alimentam a visão pública:
//                               dias de atendimento (semana padrão + preferências),
//                               exceções por data, calendários conectados
//
// URLs antigas (?tab=weekly|dates|sync|overview|calendar) continuam válidas.

type TabKey = "calendar" | "public" | "config";

const LEGACY_TABS: Record<string, { tab: TabKey; section?: ConfigSection }> = {
  calendar: { tab: "calendar" },
  overview: { tab: "public" },
  public: { tab: "public" },
  config: { tab: "config" },
  weekly: { tab: "config", section: "weekly" },
  dates: { tab: "config", section: "dates" },
  sync: { tab: "config", section: "calendars" },
};

/** Janela de compromissos carregada de uma vez (a grade navega dentro dela). */
const EVENTS_PAST_DAYS = 90;
const EVENTS_FUTURE_DAYS = 365;

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

function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  const message = data?.message;
  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string" && message) return message;
  return fallback;
}

function AgendaPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile, loading } = useAuth();
  // Agenda privada e sincronização são recursos Pro (decisão 2026-09-01);
  // semana padrão, exceções e visão pública continuam no Free.
  const plan = usePlan();
  const canPersonalAgenda = plan.can("personalAgenda");
  const canCalendarSync = plan.can("calendarSync");

  const initial = LEGACY_TABS[searchParams.get("tab") ?? ""] ?? { tab: "calendar" as TabKey };
  const [tab, setTab] = useState<TabKey>(initial.tab);
  const [section, setSection] = useState<ConfigSection>(
    (searchParams.get("section") as ConfigSection | null) ?? initial.section ?? "weekly"
  );

  const [overview, setOverview] = useState<AgendaOverview | null>(null);
  const [agenda, setAgenda] = useState<AgendaView | null>(null);
  const [loadingAgenda, setLoadingAgenda] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
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

  const goToConfig = useCallback((next: ConfigSection) => {
    setTab("config");
    setSection(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

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
    router.replace("/dashboard/agenda?tab=config&section=calendars", { scroll: false });
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
      // Um pouco de passado para a grade da agenda pessoal pintar o mês corrente inteiro
      const from = addDaysToKey(todayKey(), -45);
      setAgenda(await fetchMyAgenda({ from, to: addDaysToKey(from, 365) }));
    } finally {
      setLoadingAgenda(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const today = todayKey();
      setEvents(await fetchCalendarEvents({
        from: addDaysToKey(today, -EVENTS_PAST_DAYS),
        to: addDaysToKey(today, EVENTS_FUTURE_DAYS),
      }));
    } catch (err) {
      notify("error", apiErrorMessage(err, "Erro ao carregar seus compromissos. A migration 69 foi aplicada?"));
    } finally {
      setLoadingEvents(false);
    }
  }, [notify]);

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
    void loadEvents();
    void loadAvailability();
  }, [userProfile?.id, loadOverview, loadAgenda, loadEvents, loadAvailability]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadOverview(), loadAgenda()]);
  }, [loadOverview, loadAgenda]);

  // Espelha no Google na hora (fire-and-forget): o cron de 30 min é o plano B.
  const maybePushToGoogle = useCallback(() => {
    const hasPush = (overview?.connections ?? []).some(
      (c) => c.provider === "google" && c.status === "active" && c.pushEnabled
    );
    if (hasPush) void syncCalendars(undefined, { pushOnly: true }).catch(() => { });
  }, [overview]);

  // ── Compromissos pessoais ──
  const handleCreateEvent = async (draft: CalendarEventDraft) => {
    try {
      await createCalendarEvent(draft);
      await Promise.all([loadEvents(), loadAgenda()]);
      maybePushToGoogle();
      notify("success", draft.blocksAgenda ? "Compromisso criado — o horário já aparece fechado no seu perfil." : "Lembrete criado.");
    } catch (err) {
      throw new Error(apiErrorMessage(err, "Não foi possível salvar o compromisso."));
    }
  };

  const handleUpdateEvent = async (id: string, draft: CalendarEventDraft) => {
    try {
      await updateCalendarEvent(id, draft);
      await Promise.all([loadEvents(), loadAgenda()]);
      maybePushToGoogle();
      notify("success", "Compromisso atualizado.");
    } catch (err) {
      throw new Error(apiErrorMessage(err, "Não foi possível salvar o compromisso."));
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteCalendarEvent(id);
      await Promise.all([loadEvents(), loadAgenda()]);
      maybePushToGoogle();
      notify("success", "Compromisso excluído.");
    } catch (err) {
      throw new Error(apiErrorMessage(err, "Não foi possível excluir o compromisso."));
    }
  };

  // ── Semana padrão / preferências ──
  const handleSaveRules = async (rules: AgendaRule[]) => {
    try {
      setSavingRules(true);
      const saved = await saveAgendaRules(rules);
      setOverview((prev) => (prev ? { ...prev, rules: saved } : prev));
      await loadAgenda();
      notify("success", "Dias de atendimento salvos — seu perfil já reflete a mudança.");
    } catch {
      notify("error", "Erro ao salvar os dias de atendimento.");
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
      notify("error", apiErrorMessage(err, "Erro ao aplicar a semana padrão."));
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
          ? `${dates.length} data(s) fechada(s) no seu perfil.`
          : `${dates.length} data(s) com horário próprio adicionada(s).`
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
    // Reservas de contrato/acordo não são apagáveis à mão — ficam de fora da seleção
    const deletable = availabilitySlots.filter((slot) => !isFlowReservation(slot));
    if (selectedSlotsToDelete.length === deletable.length && deletable.length > 0) {
      setSelectedSlotsToDelete([]);
    } else {
      setSelectedSlotsToDelete(deletable.map((slot) => slot.id));
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
        <main className="flex-1 container max-w-6xl mx-auto py-8 px-4">
          <div className="mb-6 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-80" />
            </div>
          </div>
          <Skeleton className="h-10 w-full max-w-2xl rounded-lg" />
          <div className="mt-6 border rounded-xl p-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
              <Skeleton className="h-[480px] rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const connections = overview?.connections ?? [];
  const activeConnections = connections.filter((c) => c.syncEnabled && c.status === "active").length;
  const needsSetup = !!overview && overview.rules.length === 0;
  const profileUrl = `/profissionais/${userProfile.id}`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container max-w-6xl mx-auto py-8 px-4">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/dashboard" className="p-2 rounded-full hover:bg-accent transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Minha Agenda</h1>
            <p className="text-muted-foreground">
              Seus compromissos ficam só com você. Quem quer te contratar vê apenas quando você atende e
              quais datas já estão fechadas.
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
          <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-3">
            <TabsTrigger value="calendar" className="gap-2 py-2">
              <CalendarDays className="h-4 w-4" /> Minha agenda
              {!canPersonalAgenda && <PlanBadge />}
            </TabsTrigger>
            <TabsTrigger value="public" className="gap-2 py-2">
              <Eye className="h-4 w-4" /> Visão pública
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2 py-2">
              <SlidersHorizontal className="h-4 w-4" /> Configurar agenda pública
              {needsSetup && (
                <span className="ml-1 h-2 w-2 rounded-full bg-amber-500" aria-label="Configuração pendente" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Privado ── */}
          <TabsContent value="calendar" className="space-y-4">
            {needsSetup && (
              <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm md:flex-row md:items-center md:justify-between">
                <p className="text-amber-800 dark:text-amber-300">
                  Seu perfil ainda não mostra <strong>quando você atende</strong>. Defina seus dias de atendimento
                  para aparecer disponível para quem procura.
                </p>
                <Button type="button" size="sm" onClick={() => goToConfig("weekly")}>
                  <Settings2 className="mr-2 h-4 w-4" /> Definir dias de atendimento
                </Button>
              </div>
            )}
            <ScrollReveal>
              <PlanGate
                feature="personalAgenda"
                title="Agenda privada de compromissos"
                description="Marque seus compromissos aqui dentro e o sistema fecha as datas no seu perfil — sem revelar o motivo para quem visita."
                bullets={[
                  "Grade mensal com seus compromissos, só para você",
                  "Datas fechadas automaticamente no perfil público",
                  "Lembretes que não bloqueiam a agenda",
                  "Mão dupla com Google Agenda e iCloud",
                ]}
              >
                <PersonalCalendar
                  events={events}
                  agenda={agenda}
                  loading={loadingEvents || loadingAgenda}
                  onCreate={handleCreateEvent}
                  onUpdate={handleUpdateEvent}
                  onDelete={handleDeleteEvent}
                />
              </PlanGate>
            </ScrollReveal>
          </TabsContent>

          {/* ── Público ── */}
          <TabsContent value="public" className="space-y-6">
            <ScrollReveal>
              <AgendaSetupChecklist overview={overview} agenda={agenda} profileUrl={profileUrl} onGo={goToConfig} canSync={canCalendarSync} />
            </ScrollReveal>
            <ScrollReveal>
              <AgendaPreview agenda={agenda} loading={loadingAgenda} />
            </ScrollReveal>
          </TabsContent>

          {/* ── Configuração ── */}
          <TabsContent value="config" className="space-y-6">
            <Tabs value={section} onValueChange={(v) => setSection(v as ConfigSection)} className="space-y-6">
              <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-3">
                <TabsTrigger value="weekly" className="gap-2 py-2">
                  <Settings2 className="h-4 w-4" /> Dias de atendimento
                </TabsTrigger>
                <TabsTrigger value="dates" className="gap-2 py-2">
                  <CalendarRange className="h-4 w-4" /> Exceções por data
                </TabsTrigger>
                <TabsTrigger value="calendars" className="gap-2 py-2">
                  <Link2 className="h-4 w-4" /> Calendários conectados
                  {!canCalendarSync && <PlanBadge />}
                  {activeConnections > 0 && (
                    <span className="ml-1 rounded-full bg-emerald-500/15 px-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                      {activeConnections}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

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
                    title="Exceções por data"
                    description="Uma data com horário próprio substitui os dias de atendimento naquele dia; um bloqueio fecha a data no seu perfil (folga, viagem, evento externo)."
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

              <TabsContent value="calendars">
                <ScrollReveal>
                  <PlanGate
                    feature="calendarSync"
                    title="Calendários conectados"
                    description="Conecte Google Agenda, iCloud ou Outlook e o sistema fecha as datas do seu perfil sozinho, a cada 30 minutos."
                    bullets={[
                      "Google Agenda em mão dupla (seus compromissos aparecem lá também)",
                      "iCloud / Apple, Outlook e qualquer link .ics",
                      "Feed .ics para assinar a agenda do IsoScanning no seu calendário",
                      "Só horários são lidos — nunca o conteúdo dos eventos",
                    ]}
                  >
                    <CalendarSyncPanel
                      connections={connections}
                      feedUrl={overview?.feedUrl ?? null}
                      onChanged={refreshAll}
                      notify={notify}
                    />
                  </PlanGate>
                </ScrollReveal>
              </TabsContent>
            </Tabs>
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
