"use client";

// Modo Dia de Execução: checklist colaborativo em tempo real (polling) com
// cronograma, progresso, contatos rápidos e feed de comentários do grupo.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Clock, MapPin, Phone, Send,
  MessageSquare, X, SkipForward, RotateCcw, PartyPopper, Link2, HardDrive, Lock,
  Timer, ChevronRight, ChevronsDown, FilterX,
} from "lucide-react";
import { BriefingTimeShiftDialog } from "@/components/briefing-time-shift-dialog";
import { BriefingIncidentsCard } from "@/components/briefing-incidents-card";
import { BriefingCompletedBy } from "@/components/briefing-completed-by";
import { BriefingItemFilters, useBriefingItemFilter } from "@/components/briefing-item-filters";
import { CrewAssignPopover } from "@/components/briefing-crew-assign";
import {
  EMPTY_ITEM_FILTER, filterSections, firstPendingItemId,
} from "@/lib/briefing-pro-filters";
import { myCrewIds } from "@/lib/briefing-pro-crew";
import { toast } from "sonner";
import { briefingProService } from "@/lib/briefing-pro-service";
import {
  BriefingComment,
  BriefingDetail,
  BriefingItem,
  ITEM_TYPE_LABELS,
  PRIORITY_CONFIG,
  ProfileSummary,
} from "@/lib/briefing-pro-types";

const POLL_MS = 10000;

function Avatar({ profile, size = 7 }: { profile?: ProfileSummary | null; size?: number }) {
  const initial = profile?.display_name?.charAt(0)?.toUpperCase() ?? "?";
  const px = `${size * 4}px`;
  if (profile?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt={profile.display_name}
        className="rounded-full object-cover shrink-0"
        style={{ width: px, height: px }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center text-xs font-semibold shrink-0"
      style={{ width: px, height: px }}
    >
      {initial}
    </div>
  );
}

export default function ExecutionModePage() {
  const router = useRouter();
  const params = useParams();
  const briefingId = params.id as string;
  const { userProfile, loading } = useAuth();

  const [detail, setDetail] = useState<BriefingDetail | null>(null);
  const [comments, setComments] = useState<BriefingComment[]>([]);
  const [fetching, setFetching] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [commentItem, setCommentItem] = useState<BriefingItem | null>(null);
  const [sending, setSending] = useState(false);
  const [timeShiftOpen, setTimeShiftOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const feedRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef(false);
  const scrolledToCurrentRef = useRef(false);
  const [flashId, setFlashId] = useState<string | null>(null);

  // Filtro (tipo / pessoa / só pendentes) — salvo por briefing no navegador
  const {
    filter: itemFilter, setFilter: setItemFilter, ready: filterReady, active: filterActive,
  } = useBriefingItemFilter(briefingId);

  // Relógio para o marcador "Agora / A seguir"
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  const load = useCallback(async (silent = false) => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      const [data, commentList] = await Promise.all([
        briefingProService.getDetail(briefingId),
        briefingProService.listComments(briefingId),
      ]);
      setDetail(data);
      setComments(commentList);
    } catch (err) {
      if (!silent) {
        console.error("execucao load:", err);
        toast.error("Erro ao carregar o briefing");
        router.push("/dashboard/briefing-pro");
      }
    } finally {
      pollingRef.current = false;
      setFetching(false);
    }
  }, [briefingId, router]);

  useEffect(() => {
    if (!userProfile) return;
    load();
    const interval = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(interval);
  }, [userProfile, load]);

  const allItems = useMemo(() => {
    if (!detail) return [];
    return detail.sections.flatMap((s) =>
      s.items.map((i) => ({ ...i, sectionTitle: s.title }))
    );
  }, [detail]);

  const doneCount = allItems.filter((i) => i.status === "done" || i.status === "skipped").length;
  const progress = allItems.length ? Math.round((doneCount / allItems.length) * 100) : 0;

  const visibleSections = useMemo(
    () =>
      detail
        ? filterSections(detail.sections, itemFilter, myCrewIds(detail.crew, userProfile?.id))
        : [],
    [detail, itemFilter, userProfile?.id]
  );
  const visibleItemCount = visibleSections.reduce((acc, s) => acc + s.items.length, 0);
  const people = useMemo(() => {
    if (!detail) return [] as Array<{ id: string; profile: ProfileSummary | null }>;
    return [
      { id: detail.briefing.owner_id, profile: detail.profiles[detail.briefing.owner_id] ?? null },
      ...detail.members.map((m) => ({ id: m.user_id, profile: m.profile ?? null })),
    ];
  }, [detail]);
  // Primeira tarefa ainda não feita (respeitando o filtro): alvo do foco inicial
  const firstPendingId = useMemo(() => firstPendingItemId(visibleSections), [visibleSections]);

  // "Agora": último item com horário <= agora ainda não concluído.
  // "A seguir": primeiro item com horário > agora. Só durante a execução.
  const { currentItemId, nextItemId } = useMemo(() => {
    if (detail?.briefing.status !== "in_execution") {
      return { currentItemId: null as string | null, nextItemId: null as string | null };
    }
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const timed = allItems
      .filter((i) => i.scheduled_time)
      .map((i) => {
        const [h, m] = (i.scheduled_time as string).split(":").map(Number);
        return { id: i.id, minutes: h * 60 + (m || 0), status: i.status };
      })
      .sort((a, b) => a.minutes - b.minutes);
    const current = [...timed]
      .reverse()
      .find((t) => t.minutes <= nowMinutes && t.status !== "done" && t.status !== "skipped");
    const next = timed.find((t) => t.minutes > nowMinutes);
    return { currentItemId: current?.id ?? null, nextItemId: next?.id ?? null };
  }, [detail?.briefing.status, allItems, now]);

  const scrollToItem = useCallback((itemId: string) => {
    document
      .getElementById(`exec-item-${itemId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashId(itemId);
    setTimeout(() => setFlashId((current) => (current === itemId ? null : current)), 1800);
  }, []);

  // Ao abrir a tela, vai direto à primeira tarefa ainda não feita (ou, se não
  // houver, ao item "Agora") — evita rolar a lista inteira para achar onde parou.
  useEffect(() => {
    if (!detail || !filterReady || scrolledToCurrentRef.current) return;
    const target = firstPendingId ?? currentItemId;
    if (!target) return;
    scrolledToCurrentRef.current = true;
    setTimeout(() => scrollToItem(target), 300);
  }, [detail, filterReady, firstPendingId, currentItemId, scrollToItem]);

  async function setItemStatus(item: BriefingItem, status: string) {
    // Otimista
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((s) => ({
              ...s,
              items: s.items.map((i) =>
                i.id === item.id
                  ? { ...i, status: status as BriefingItem["status"], completed_by: userProfile?.id ?? null }
                  : i
              ),
            })),
          }
        : prev
    );
    // Com "Só pendentes" ativo o item some da lista na hora — dá para desfazer
    if (itemFilter.onlyPending && (status === "done" || status === "skipped")) {
      toast(status === "done" ? "Item concluído" : "Item pulado", {
        description: "Ele saiu da lista porque o filtro \"Só pendentes\" está ativo.",
        action: { label: "Desfazer", onClick: () => setItemStatus(item, "pending") },
      });
    }
    try {
      await briefingProService.updateItemStatus(item.id, status);
    } catch {
      toast.error("Erro ao atualizar o item");
      load(true);
    }
  }

  async function toggleSubitem(subitemId: string, current: "pending" | "done") {
    const next = current === "done" ? "pending" : "done";
    // Otimista
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((s) => ({
              ...s,
              items: s.items.map((i) => ({
                ...i,
                subitems: i.subitems.map((sub) =>
                  sub.id === subitemId
                    ? { ...sub, status: next, completed_by: userProfile?.id ?? null }
                    : sub
                ),
              })),
            })),
          }
        : prev
    );
    try {
      await briefingProService.updateSubitemStatus(subitemId, next);
    } catch {
      toast.error("Erro ao atualizar o subitem");
      load(true);
    }
  }

  async function sendComment() {
    const content = commentText.trim();
    if (!content) return;
    setSending(true);
    try {
      const created = await briefingProService.addComment(
        briefingId,
        content,
        commentItem?.id
      );
      setComments((prev) => [...prev, created]);
      setCommentText("");
      setCommentItem(null);
      setTimeout(() => {
        feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    } catch {
      toast.error("Erro ao enviar o comentário");
    } finally {
      setSending(false);
    }
  }

  if (loading || fetching || !detail) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl space-y-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </main>
      </div>
    );
  }

  const { briefing } = detail;
  const itemById = new Map(allItems.map((i) => [i.id, i]));
  const canEdit = detail.my_role === "owner" || detail.my_role === "editor";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-3xl pb-40">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 -ml-2"
            onClick={() => router.push(`/dashboard/briefing-pro/${briefingId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Briefing
          </Button>
          <div className="flex flex-wrap items-center justify-end gap-2 min-w-0">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                title="O evento atrasou? Empurre todos os horários de uma vez"
                onClick={() => setTimeShiftOpen(true)}
              >
                <Timer className="h-4 w-4" />
                <span className="hidden sm:inline">Ajustar horários</span>
                <span className="sm:hidden">Horários</span>
              </Button>
            )}
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 gap-1"
              title={`Atualiza a cada ${POLL_MS / 1000}s`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              Ao vivo
              <span className="hidden sm:inline"> · atualiza a cada {POLL_MS / 1000}s</span>
            </Badge>
          </div>
        </div>

        {/* Painel de progresso */}
        <Card className="mb-4 border-blue-200 dark:border-blue-900">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="min-w-0">
                <h1 className="font-bold text-lg leading-tight">{briefing.title}</h1>
                <p className="text-xs text-muted-foreground">
                  {briefing.event_date &&
                    `${briefing.event_date.split("-").reverse().join("/")}` +
                    (briefing.event_time ? ` · início ${briefing.event_time}` : "")}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{progress}%</p>
                <p className="text-xs text-muted-foreground">{doneCount}/{allItems.length} itens</p>
              </div>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {progress === 100 && allItems.length > 0 && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mt-2 flex items-center gap-2">
                <PartyPopper className="h-4 w-4" />
                Tudo concluído! Excelente trabalho, equipe.
              </p>
            )}
            {firstPendingId && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1 w-full sm:w-auto"
                title="Rola até a primeira tarefa ainda não feita"
                onClick={() => scrollToItem(firstPendingId)}
              >
                <ChevronsDown className="h-4 w-4" />
                Ir para a próxima pendente
              </Button>
            )}

            {/* Acesso rápido: locações e contatos */}
            {(briefing.locations.length > 0 || briefing.contacts.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {briefing.locations.map((l, i) => (
                  <a
                    key={`loc-${i}`}
                    href={l.map_url || undefined}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => { if (!l.map_url) e.preventDefault(); }}
                    className={`inline-flex items-center gap-1 text-xs rounded-full border px-2.5 py-1 ${l.map_url ? "hover:bg-muted" : "cursor-default"}`}
                    title={l.address || undefined}
                  >
                    <MapPin className="h-3 w-3" />
                    {l.name}
                  </a>
                ))}
                {briefing.contacts.map((c, i) => (
                  <a
                    key={`con-${i}`}
                    href={c.phone ? `tel:${c.phone.replace(/\D/g, "")}` : undefined}
                    onClick={(e) => { if (!c.phone) e.preventDefault(); }}
                    className={`inline-flex items-center gap-1 text-xs rounded-full border px-2.5 py-1 ${c.phone ? "hover:bg-muted" : "cursor-default"}`}
                    title={c.role || undefined}
                  >
                    <Phone className="h-3 w-3" />
                    {c.name}
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {briefing.restrictions && (
          <Card className="mb-4 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10">
            <CardContent className="py-3 text-sm text-red-700 dark:text-red-400">
              <span className="font-semibold">⚠ Restrições: </span>
              {briefing.restrictions}
            </CardContent>
          </Card>
        )}

        {allItems.length > 0 && (
          <BriefingItemFilters
            className="mb-4"
            filter={itemFilter}
            onChange={setItemFilter}
            items={allItems}
            crew={detail.crew}
            userId={userProfile?.id}
            showPendingToggle
            visibleCount={visibleItemCount}
            totalCount={allItems.length}
          />
        )}

        {/* Checklist por seção */}
        <div className="space-y-4">
          {filterActive && visibleSections.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-sm text-muted-foreground space-y-3">
                <p>
                  {itemFilter.onlyPending && progress === 100
                    ? "Nenhuma tarefa pendente — tudo feito!"
                    : "Nenhum item corresponde ao filtro."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setItemFilter(EMPTY_ITEM_FILTER)}
                >
                  <FilterX className="h-4 w-4" />
                  Limpar filtros
                </Button>
              </CardContent>
            </Card>
          )}
          {visibleSections.map((section) => {
            const sectionDone = section.items.filter(
              (i) => i.status === "done" || i.status === "skipped"
            ).length;
            return (
              <Card key={section.id}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{section.title}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {sectionDone}/{section.items.length}
                    </span>
                  </CardTitle>
                  {section.crew_ids.length > 0 && (
                    <div className="mt-1">
                      <CrewAssignPopover
                        crew={detail.crew}
                        selectedIds={section.crew_ids}
                        canEdit={false}
                        title="Quem cuida desta seção"
                        onSave={async () => undefined}
                      />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-1 pt-0">
                  {section.items.length === 0 && (
                    <p className="text-xs text-muted-foreground pb-2">Sem itens.</p>
                  )}
                  {section.items.map((item) => {
                    const isDone = item.status === "done";
                    const isSkipped = item.status === "skipped";
                    const isCurrent = item.id === currentItemId;
                    const isNext = item.id === nextItemId;
                    const itemLinks = detail.links.filter((l) => l.item_id === item.id);
                    const itemComments = comments.filter((c) => c.item_id === item.id);
                    return (
                      <div
                        key={item.id}
                        id={`exec-item-${item.id}`}
                        className={`rounded-lg px-2 py-2 transition-shadow ${isDone || isSkipped ? "opacity-60" : ""} hover:bg-muted/50 ${isCurrent ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/10" : ""} ${flashId === item.id ? "ring-2 ring-amber-400" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isDone || isSkipped}
                            onCheckedChange={() =>
                              setItemStatus(item, isDone || isSkipped ? "pending" : "done")
                            }
                            className="mt-0.5 h-5 w-5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-sm font-medium ${isDone || isSkipped ? "line-through text-muted-foreground" : ""}`}
                              >
                                {item.title}
                              </span>
                              {isSkipped && (
                                <Badge variant="outline" className="text-xs">Pulado</Badge>
                              )}
                              {isCurrent && (
                                <Badge className="text-xs gap-1 bg-blue-600 text-white hover:bg-blue-600">
                                  <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                                  </span>
                                  Agora
                                </Badge>
                              )}
                              {isNext && !isCurrent && (
                                <Badge variant="outline" className="text-xs gap-1 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700">
                                  <ChevronRight className="h-3 w-3" />
                                  A seguir
                                </Badge>
                              )}
                              {item.scheduled_time && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Clock className="h-3 w-3" />
                                  {item.scheduled_time}
                                </Badge>
                              )}
                              {item.is_required && (
                                <Badge variant="secondary" className="text-xs gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                  <Lock className="h-3 w-3" />
                                  Obrigatório
                                </Badge>
                              )}
                              {item.priority === "high" && !isDone && (
                                <Badge variant="secondary" className={`text-xs ${PRIORITY_CONFIG.high.className}`}>
                                  Alta
                                </Badge>
                              )}
                              {item.item_type !== "task" && (
                                <Badge variant="outline" className="text-xs">
                                  {ITEM_TYPE_LABELS[item.item_type]}
                                </Badge>
                              )}
                            </div>
                            {item.description && !isDone && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.description}
                              </p>
                            )}
                            {item.subitems.length > 0 && (
                              <div className="mt-1.5 space-y-1">
                                {item.subitems.map((sub) => (
                                  <label
                                    key={sub.id}
                                    className="flex items-center gap-2 pl-1 cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={sub.status === "done"}
                                      onCheckedChange={() => toggleSubitem(sub.id, sub.status)}
                                      className="h-3.5 w-3.5"
                                    />
                                    <span
                                      className={`text-xs ${sub.status === "done" ? "line-through text-muted-foreground" : ""}`}
                                    >
                                      {sub.title}
                                    </span>
                                    {sub.status === "done" && sub.completed_by && detail.profiles[sub.completed_by] && (
                                      <span className="text-[10px] text-muted-foreground">
                                        · {detail.profiles[sub.completed_by].display_name}
                                      </span>
                                    )}
                                  </label>
                                ))}
                                <p className="text-[10px] text-muted-foreground pl-1">
                                  {item.subitems.filter((s) => s.status === "done").length}/
                                  {item.subitems.length} subitens
                                </p>
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {!isDone && !isSkipped && (
                                <CrewAssignPopover
                                  crew={detail.crew}
                                  selectedIds={item.crew_ids}
                                  inheritedIds={section.crew_ids}
                                  canEdit={canEdit}
                                  title="Quem faz este item"
                                  onSave={async (ids) => {
                                    await briefingProService.setItemCrew(item.id, ids);
                                    await load(true);
                                  }}
                                />
                              )}
                              {(isDone || isSkipped) && (
                                <BriefingCompletedBy
                                  item={item}
                                  people={people}
                                  profiles={detail.profiles}
                                  canEdit={canEdit}
                                  onChanged={() => load(true)}
                                />
                              )}
                              {itemLinks.map((link) => (
                                <a
                                  key={link.id}
                                  href={link.url || undefined}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => { if (!link.url) e.preventDefault(); }}
                                  title={link.description || undefined}
                                  className={`inline-flex items-center gap-1 text-xs ${link.url ? "text-blue-600 dark:text-blue-400 hover:underline" : "text-muted-foreground"}`}
                                >
                                  {link.storage_type === "external_hd" ? (
                                    <HardDrive className="h-3 w-3" />
                                  ) : (
                                    <Link2 className="h-3 w-3" />
                                  )}
                                  {link.label}
                                </a>
                              ))}
                              {itemComments.length > 0 && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  {itemComments.length}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Comentar este item"
                              onClick={() => {
                                setCommentItem(item);
                                document.getElementById("execution-composer")?.focus();
                              }}
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </Button>
                            {!isDone && !isSkipped ? (
                              item.is_required ? null : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Pular item"
                                  onClick={() => setItemStatus(item, "skipped")}
                                >
                                  <SkipForward className="h-3.5 w-3.5" />
                                </Button>
                              )
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Reabrir item"
                                onClick={() => setItemStatus(item, "pending")}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Intercorrências */}
        <div className="mt-4">
          <BriefingIncidentsCard
            briefingId={briefingId}
            incidents={detail.incidents}
            myRole={detail.my_role}
            userId={userProfile?.id}
            profiles={detail.profiles}
            onChanged={() => load(true)}
          />
        </div>

        {/* Feed de comentários */}
        <Card className="mt-4">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversa da equipe ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={feedRef} className="space-y-3 max-h-80 overflow-y-auto">
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma mensagem ainda. Tudo que for escrito aqui fica visível para todos do
                  briefing.
                </p>
              )}
              {comments.map((c) => {
                const relatedItem = c.item_id ? itemById.get(c.item_id) : null;
                const isMine = c.author_id === userProfile?.id;
                return (
                  <div key={c.id} className={`flex items-start gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
                    <Avatar profile={c.profile} size={7} />
                    <div
                      className={`rounded-2xl px-3 py-2 max-w-[80%] ${
                        isMine
                          ? "bg-blue-600 text-white rounded-tr-sm"
                          : "bg-muted rounded-tl-sm"
                      }`}
                    >
                      <p className={`text-[11px] ${isMine ? "text-blue-100" : "text-muted-foreground"}`}>
                        {c.profile?.display_name ?? "Usuário"} ·{" "}
                        {new Date(c.created_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {relatedItem && (
                        <p className={`text-[11px] font-medium ${isMine ? "text-blue-100" : "text-blue-600 dark:text-blue-400"}`}>
                          ↳ {relatedItem.title}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{c.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>

      {timeShiftOpen && (
        <BriefingTimeShiftDialog
          briefingId={briefingId}
          sections={detail.sections.map((s) => ({ id: s.id, title: s.title }))}
          onClose={() => setTimeShiftOpen(false)}
          onApplied={() => {
            setTimeShiftOpen(false);
            load(true);
          }}
        />
      )}

      {/* Composer fixo */}
      <div className="fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur p-3">
        <div className="container mx-auto max-w-3xl">
          {commentItem && (
            <div className="flex items-center gap-2 mb-2 text-xs">
              <Badge variant="secondary" className="gap-1">
                <MessageSquare className="h-3 w-3" />
                Comentando: {commentItem.title}
                <button onClick={() => setCommentItem(null)} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              id="execution-composer"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Mensagem para todos do briefing..."
              rows={1}
              className="resize-none min-h-[44px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendComment();
                }
              }}
            />
            <Button
              size="icon"
              className="h-11 w-11 shrink-0 bg-blue-600 hover:bg-blue-700"
              onClick={sendComment}
              disabled={sending || !commentText.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
