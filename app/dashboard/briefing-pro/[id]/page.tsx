"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext, DragEndEvent, KeyboardSensor, MouseSensor, TouchSensor,
  closestCenter, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { sanitizeSearchTerm } from "@/lib/utils";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Pencil, Users, Plus, Trash2, MoreVertical, Link2,
  Package, MapPin, Phone, PlayCircle, CheckCircle2, Clock,
  ShieldCheck, Loader2, Search, X, ExternalLink, HardDrive,
  MessageSquare, Send, Sparkles, Eye, Lock, CornerDownRight,
  GripVertical, Timer, Printer, Share2, Link2 as LinkIcon, RefreshCw, Copy,
  ArrowUp, ArrowDown, FilterX,
} from "lucide-react";
import { BriefingTimeShiftDialog } from "@/components/briefing-time-shift-dialog";
import { BriefingRecalcDialog } from "@/components/briefing-recalc-dialog";
import { BriefingIncidentsCard } from "@/components/briefing-incidents-card";
import { BriefingCompletedBy } from "@/components/briefing-completed-by";
import { BriefingItemFilters, useBriefingItemFilter } from "@/components/briefing-item-filters";
import { CrewAssignPopover, CrewCheckboxList } from "@/components/briefing-crew-assign";
import { useConfirmDialog } from "@/components/confirm-dialog";
import { CrewDraft, CrewEditor, newCrewDraft } from "@/components/briefing-crew-editor";
import { EMPTY_ITEM_FILTER, filterSections } from "@/lib/briefing-pro-filters";
import { jobRoleTone, myCrewIds } from "@/lib/briefing-pro-crew";
import { toast } from "sonner";
import { briefingProService } from "@/lib/briefing-pro-service";
import { tokenManager } from "@/lib/token-manager";
import { usePlan } from "@/lib/plans/use-plan";
import { PlanBadge } from "@/components/plan/plan-gate";
import { notifyPlanLimit } from "@/lib/plans/plan-events";
import {
  BriefingContact,
  BriefingCrew,
  BriefingDeliverable,
  BriefingDetail,
  BriefingItem,
  BriefingLocation,
  BriefingComment,
  BriefingSection,
  BriefingStatus,
  BriefingType,
  GeneratedSection,
  RefineMode,
  BRIEFING_STATUS_CONFIG,
  BRIEFING_TYPE_LABELS,
  DELIVERABLE_STATUS_CONFIG,
  ITEM_TYPE_LABELS,
  MEMBER_ROLE_LABELS,
  PRIORITY_CONFIG,
  ProfileSummary,
  STORAGE_TYPE_LABELS,
} from "@/lib/briefing-pro-types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function Avatar({ profile, size = 8 }: { profile?: ProfileSummary | null; size?: number }) {
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
      className="rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 flex items-center justify-center text-xs font-semibold shrink-0"
      style={{ width: px, height: px }}
    >
      {initial}
    </div>
  );
}

/**
 * Casca sortable genérica (dnd-kit): o children recebe as props do handle
 * para espalhar no botão de arrastar (GripVertical).
 */
function SortableShell({
  id, disabled, children,
}: {
  id: string;
  disabled?: boolean;
  children: (handleProps: Record<string, unknown>) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-60 relative z-10" : undefined}
    >
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

/**
 * Ações de um item. No desktop (lg+) são ícones revelados no hover da linha;
 * em telas menores um menu ⋮ sempre visível — no toque não existe hover, e o
 * Tailwind v4 nem aplica `hover:` nesses dispositivos. As setas ↑↓ são a
 * alternativa ao arrastar para reordenar.
 */
function ItemRowActions({
  canMoveUp, canMoveDown, onMoveUp, onMoveDown, onLink, onEdit, onDelete,
}: {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onLink: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <div className="hidden lg:flex gap-0.5 shrink-0 hover-reveal">
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          title="Mover para cima" disabled={!canMoveUp} onClick={onMoveUp}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          title="Mover para baixo" disabled={!canMoveDown} onClick={onMoveDown}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          title="Anexar link de material" onClick={onLink}
        >
          <Link2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar item" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon" className="h-7 w-7 text-destructive"
          title="Excluir item" onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 shrink-0 lg:hidden text-muted-foreground"
            aria-label="Ações do item"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={!canMoveUp} onClick={onMoveUp}>
            <ArrowUp className="h-4 w-4 mr-2" />Mover para cima
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canMoveDown} onClick={onMoveDown}>
            <ArrowDown className="h-4 w-4 mr-2" />Mover para baixo
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLink}>
            <Link2 className="h-4 w-4 mr-2" />Anexar link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" />Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

/** Badge de horário com edição inline (clica no horário e digita). */
function InlineTimeBadge({
  item, canEdit, onSaved,
}: {
  item: BriefingItem;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!item.scheduled_time && !canEdit) return null;

  async function save(value: string) {
    if (value === (item.scheduled_time ?? "")) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await briefingProService.updateItem(item.id, { scheduled_time: value });
      onSaved();
    } catch {
      toast.error("Erro ao salvar o horário");
    }
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        type="time"
        autoFocus
        defaultValue={item.scheduled_time ?? ""}
        disabled={saving}
        className="h-6 rounded-md border bg-background px-1 text-xs"
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => save(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  if (item.scheduled_time) {
    return (
      <Badge
        variant="outline"
        className={`text-xs gap-1 ${canEdit ? "cursor-pointer hover:border-blue-400" : ""}`}
        title={canEdit ? "Clique para editar o horário" : undefined}
        onClick={(e) => {
          if (!canEdit) return;
          e.stopPropagation();
          setEditing(true);
        }}
      >
        <Clock className="h-3 w-3" />{item.scheduled_time}
      </Badge>
    );
  }

  return (
    <button
      className="hover-reveal text-muted-foreground hover:text-foreground"
      title="Definir horário"
      onClick={() => setEditing(true)}
    >
      <Clock className="h-3.5 w-3.5" />
    </button>
  );
}

/** Botões de transição de status disponíveis para o papel do usuário. */
const STATUS_ACTIONS: Array<{
  from: BriefingStatus[];
  to: BriefingStatus;
  label: string;
  needsApprover?: boolean;
  ownerOnly?: boolean;
}> = [
  { from: ["draft"], to: "review", label: "Enviar para revisão" },
  { from: ["review"], to: "approved", label: "Aprovar briefing", needsApprover: true },
  { from: ["review"], to: "draft", label: "Voltar para rascunho" },
  { from: ["approved"], to: "in_execution", label: "Iniciar execução" },
  { from: ["in_execution"], to: "completed", label: "Concluir trabalho" },
  { from: ["completed"], to: "in_execution", label: "Reabrir execução" },
  { from: ["archived"], to: "draft", label: "Restaurar", ownerOnly: true },
];

// ─── Página ──────────────────────────────────────────────────────────────────

/** 403 de plano vindo do apiClient (o interceptor já abriu o modal de upgrade). */
function isPlanApiError(err: unknown): boolean {
  const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
  return code === "PLAN_LIMIT" || code === "PLAN_FEATURE";
}

export default function BriefingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const briefingId = params.id as string;
  const { userProfile, loading } = useAuth();

  const [detail, setDetail] = useState<BriefingDetail | null>(null);
  const [fetching, setFetching] = useState(true);
  const [comments, setComments] = useState<BriefingComment[]>([]);

  // Dialogs / sheets
  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [sectionDialog, setSectionDialog] = useState<{ section?: BriefingSection } | null>(null);
  const [refineDialog, setRefineDialog] = useState<{ section: BriefingSection } | null>(null);
  const [itemDialog, setItemDialog] = useState<{ sectionId: string; item?: BriefingItem } | null>(null);
  const [deliverableDialog, setDeliverableDialog] = useState<{ deliverable?: BriefingDeliverable } | null>(null);
  const [linkDialog, setLinkDialog] = useState<{ itemId?: string; deliverableId?: string } | null>(null);
  const [contactsDialog, setContactsDialog] = useState(false);
  const [locationsDialog, setLocationsDialog] = useState(false);
  const [timeShiftOpen, setTimeShiftOpen] = useState(false);
  const [recalcOpen, setRecalcOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [crewDialog, setCrewDialog] = useState(false);
  const [confirmingRead, setConfirmingRead] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<BriefingStatus | null>(null);
  // Modal de confirmação (excluir/remover) com trava anti-clique duplo
  const { confirm: askConfirm, dialog: confirmDialog } = useConfirmDialog();
  const [busy, setBusy] = useState(false);

  // Mouse: arrasta após 5px; toque: segura 200ms (não briga com a rolagem);
  // teclado: espaço + setas no handle. As setas ↑↓ nas ações cobrem o resto.
  const dndSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  const refresh = useCallback(async () => {
    try {
      const [data, commentList] = await Promise.all([
        briefingProService.getDetail(briefingId),
        briefingProService.listComments(briefingId),
      ]);
      setDetail(data);
      setComments(commentList);
    } catch (err) {
      console.error("briefing detail:", err);
      toast.error("Erro ao carregar o briefing");
      router.push("/dashboard/briefing-pro");
    } finally {
      setFetching(false);
    }
  }, [briefingId, router]);

  useEffect(() => {
    if (!userProfile) return;
    refresh();
  }, [userProfile, refresh]);

  const briefing = detail?.briefing;
  const isOwner = detail?.my_role === "owner";
  const plan = usePlan();
  const canEdit = detail?.my_role === "owner" || detail?.my_role === "editor";
  const isApprover = isOwner || briefing?.approver_id === userProfile?.id;

  const myReadConfirmed = useMemo(() => {
    if (!detail || !userProfile) return true;
    return detail.read_confirmations.some(
      (r) => r.user_id === userProfile.id && r.version === detail.briefing.version
    );
  }, [detail, userProfile]);

  const allPeople = useMemo(() => {
    if (!detail) return [] as Array<{ id: string; profile: ProfileSummary | null }>;
    const owner = detail.profiles[detail.briefing.owner_id] ?? null;
    return [
      { id: detail.briefing.owner_id, profile: owner },
      ...detail.members.map((m) => ({ id: m.user_id, profile: m.profile ?? null })),
    ];
  }, [detail]);

  // Filtro de itens (tipo / pessoa) — fica salvo por briefing no navegador
  const { filter: itemFilter, setFilter: setItemFilter, active: filterActive } =
    useBriefingItemFilter(briefingId);
  const allItems = useMemo(
    () => (detail ? detail.sections.flatMap((s) => s.items) : []),
    [detail]
  );
  const visibleSections = useMemo(
    () =>
      detail
        ? filterSections(detail.sections, itemFilter, myCrewIds(detail.crew, userProfile?.id))
        : [],
    [detail, itemFilter, userProfile?.id]
  );
  const visibleItemCount = visibleSections.reduce((acc, s) => acc + s.items.length, 0);

  async function handleStatusChange(status: BriefingStatus) {
    if (busy) return;
    setBusy(true);
    setPendingStatus(status);
    try {
      await briefingProService.changeStatus(briefingId, status);
      toast.success(`Status atualizado: ${BRIEFING_STATUS_CONFIG[status].label}`);
      refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Erro ao mudar o status");
    } finally {
      setBusy(false);
      setPendingStatus(null);
    }
  }

  async function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !detail) return;
    const oldIndex = detail.sections.findIndex((s) => s.id === active.id);
    const newIndex = detail.sections.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(detail.sections, oldIndex, newIndex);
    setDetail({ ...detail, sections: reordered });
    try {
      await briefingProService.reorderSections(briefingId, reordered.map((s) => s.id));
    } catch {
      toast.error("Erro ao reordenar as seções");
      refresh();
    }
  }

  /** Aplica uma nova ordem de itens na seção (otimista) e persiste. */
  async function applyItemOrder(sectionId: string, reordered: BriefingItem[]) {
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((s) =>
              s.id === sectionId ? { ...s, items: reordered } : s
            ),
          }
        : prev
    );
    try {
      await briefingProService.reorderItems(
        briefingId,
        reordered.map((item, index) => ({ id: item.id, section_id: sectionId, position: index }))
      );
    } catch {
      toast.error("Erro ao reordenar os itens");
      refresh();
    }
  }

  async function handleItemDragEnd(sectionId: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !detail) return;
    const section = detail.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const oldIndex = section.items.findIndex((i) => i.id === active.id);
    const newIndex = section.items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    await applyItemOrder(sectionId, arrayMove(section.items, oldIndex, newIndex));
  }

  /** Move um item uma posição para cima (-1) ou para baixo (+1) — alternativa ao arrastar. */
  async function moveItem(sectionId: string, itemId: string, direction: -1 | 1) {
    if (!detail) return;
    const section = detail.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const index = section.items.findIndex((i) => i.id === itemId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= section.items.length) return;
    await applyItemOrder(sectionId, arrayMove(section.items, index, target));
  }

  async function handleConfirmRead() {
    if (confirmingRead) return;
    setConfirmingRead(true);
    try {
      await briefingProService.confirmRead(briefingId);
      toast.success("Leitura confirmada!");
      await refresh();
    } catch {
      toast.error("Erro ao confirmar leitura");
    } finally {
      setConfirmingRead(false);
    }
  }

  async function toggleItem(item: BriefingItem) {
    const next = item.status === "done" ? "pending" : "done";
    // Atualização otimista
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((s) => ({
              ...s,
              items: s.items.map((i) => (i.id === item.id ? { ...i, status: next } : i)),
            })),
          }
        : prev
    );
    try {
      await briefingProService.updateItemStatus(item.id, next);
    } catch {
      toast.error("Erro ao atualizar o item");
      refresh();
    }
  }

  if (loading || fetching || !detail || !briefing) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl space-y-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </main>
        <Footer />
      </div>
    );
  }

  const statusCfg = BRIEFING_STATUS_CONFIG[briefing.status];
  const totalItems = detail.sections.reduce((acc, s) => acc + s.items.length, 0);
  const doneItems = detail.sections.reduce(
    (acc, s) => acc + s.items.filter((i) => i.status === "done" || i.status === "skipped").length,
    0
  );
  const availableActions = STATUS_ACTIONS.filter((a) => {
    if (!a.from.includes(briefing.status)) return false;
    if (a.ownerOnly && !isOwner) return false;
    if (a.needsApprover) return isApprover;
    return canEdit;
  });
  const currentReads = detail.read_confirmations.filter((r) => r.version === briefing.version);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 -ml-2"
            onClick={() => router.push("/dashboard/briefing-pro")}
          >
            <ArrowLeft className="h-4 w-4" />
            Briefings
          </Button>
          <div className="flex flex-wrap justify-end gap-2 min-w-0">
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                title="Compartilhar por link — consulta sem conta; participação com conta"
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Compartilhar</span>
                {briefing.share_token && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Link ativo" />
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              title={briefing.status === "completed"
                ? "Exportar relatório pós-execução em PDF"
                : "Exportar briefing em PDF"}
              onClick={() => window.open(`/dashboard/briefing-pro/${briefingId}/imprimir`, "_blank")}
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">
                {briefing.status === "completed" ? "Relatório PDF" : "Exportar PDF"}
              </span>
              <span className="sm:hidden">PDF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              title="Equipe do briefing"
              onClick={() => setTeamOpen(true)}
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Equipe </span>({detail.members.length + 1})
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => router.push(`/dashboard/briefing-pro/${briefingId}/execucao`)}
            >
              <PlayCircle className="h-4 w-4" />
              Dia de Execução
            </Button>
          </div>
        </div>

        {/* Banner de confirmação de leitura */}
        {!myReadConfirmed && (
          <Card className="mb-6 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10">
            <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-sm">
                  <span className="font-medium">Confirme a leitura desta versão (v{briefing.version}).</span>{" "}
                  Todos do briefing veem quem já leu e confirmou.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleConfirmRead}
                disabled={confirmingRead}
                className="gap-2 shrink-0"
              >
                {confirmingRead ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Li e confirmo
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Cabeçalho do briefing */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="secondary" className={statusCfg.className}>
                {statusCfg.label}
              </Badge>
              <Badge variant="outline">{BRIEFING_TYPE_LABELS[briefing.briefing_type]}</Badge>
              {briefing.ai_generated && (
                <Badge variant="outline" className="gap-1 text-rose-500 border-rose-200 dark:border-rose-800">
                  <Sparkles className="h-3 w-3" />
                  Criado com IA
                </Badge>
              )}
              <Badge variant="outline" className="text-muted-foreground">v{briefing.version}</Badge>
              <div className="ml-auto flex gap-1">
                {canEdit && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditInfoOpen(true)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <CardTitle className="text-2xl">{briefing.title}</CardTitle>
            <CardDescription className="flex flex-wrap gap-x-4 gap-y-1">
              {briefing.client_name && <span>Cliente: {briefing.client_name}</span>}
              {briefing.event_date && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDate(briefing.event_date)}
                  {briefing.event_time ? ` às ${briefing.event_time}` : ""}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {briefing.objective && (
              <p><span className="font-medium">Objetivo: </span>{briefing.objective}</p>
            )}
            {briefing.target_audience && (
              <p><span className="font-medium">Público-alvo: </span>{briefing.target_audience}</p>
            )}
            {briefing.tone && (
              <p><span className="font-medium">Tom / estilo: </span>{briefing.tone}</p>
            )}
            {briefing.restrictions && (
              <p className="text-red-600 dark:text-red-400">
                <span className="font-medium">Restrições: </span>{briefing.restrictions}
              </p>
            )}
            {briefing.notes && (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Observações: </span>{briefing.notes}
              </p>
            )}

            {totalItems > 0 && (
              <div className="pt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso geral</span>
                  <span>{doneItems}/{totalItems} itens</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all"
                    style={{ width: `${totalItems ? Math.round((doneItems / totalItems) * 100) : 0}%` }}
                  />
                </div>
              </div>
            )}

            {(availableActions.length > 0 || currentReads.length > 0) && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {availableActions.map((action) => (
                  <Button
                    key={action.to}
                    size="sm"
                    variant={action.to === "approved" ? "default" : "outline"}
                    disabled={busy}
                    onClick={() => handleStatusChange(action.to)}
                    className="gap-1"
                  >
                    {pendingStatus === action.to ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      action.to === "approved" && <ShieldCheck className="h-4 w-4" />
                    )}
                    {action.label}
                  </Button>
                ))}
                <div className="ml-auto flex items-center gap-1" title="Confirmaram a leitura desta versão">
                  {currentReads.slice(0, 6).map((r) => (
                    <Avatar key={r.id} profile={r.profile} size={6} />
                  ))}
                  {currentReads.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      {currentReads.length} {currentReads.length === 1 ? "leu" : "leram"} v{briefing.version}
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Coluna principal: seções e itens */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Estrutura do briefing</h2>
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-1" title="Ajustar horários" onClick={() => setTimeShiftOpen(true)}>
                    <Timer className="h-4 w-4" />
                    <span className="hidden sm:inline">Ajustar horários</span>
                    <span className="sm:hidden">Horários</span>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setRecalcOpen(true)}>
                    <Clock className="h-4 w-4" />
                    Recalcular
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setSectionDialog({})}>
                    <Plus className="h-4 w-4" />
                    Seção
                  </Button>
                </div>
              )}
            </div>

            {allItems.length > 0 && (
              <BriefingItemFilters
                filter={itemFilter}
                onChange={setItemFilter}
                items={allItems}
                crew={detail.crew}
                userId={userProfile?.id}
                visibleCount={visibleItemCount}
                totalCount={allItems.length}
              />
            )}

            {detail.sections.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma seção ainda. {canEdit ? "Crie a primeira seção para adicionar itens." : ""}
                </CardContent>
              </Card>
            )}

            {filterActive && visibleSections.length === 0 && detail.sections.length > 0 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-sm text-muted-foreground space-y-3">
                  <p>Nenhum item corresponde ao filtro.</p>
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

            <DndContext
              sensors={dndSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSectionDragEnd}
            >
            <SortableContext
              items={visibleSections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
            <div className="space-y-4">
            {visibleSections.map((section) => (
              <SortableShell key={section.id} id={section.id} disabled={!canEdit || filterActive}>
              {(sectionHandle) => (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-1 min-w-0">
                      {canEdit && !filterActive && (
                        <button
                          {...sectionHandle}
                          className="mt-0.5 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none shrink-0"
                          title="Arrastar para reordenar a seção"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                      )}
                      <div className="min-w-0">
                        <CardTitle className="text-base">{section.title}</CardTitle>
                        {section.description && (
                          <CardDescription className="mt-0.5">{section.description}</CardDescription>
                        )}
                        <div className="mt-1.5">
                          <CrewAssignPopover
                            crew={detail.crew}
                            selectedIds={section.crew_ids}
                            canEdit={canEdit}
                            title="Quem cuida desta seção"
                            addLabel="Quem cuida desta seção?"
                            onSave={async (ids) => {
                              await briefingProService.setSectionCrew(section.id, ids);
                              await refresh();
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setItemDialog({ sectionId: section.id })}>
                            <Plus className="h-4 w-4 mr-2" />Adicionar item
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSectionDialog({ section })}>
                            <Pencil className="h-4 w-4 mr-2" />Editar seção
                          </DropdownMenuItem>
                          {isOwner && (
                            <DropdownMenuItem onClick={() => setRefineDialog({ section })}>
                              <Sparkles className="h-4 w-4 mr-2 text-rose-500" />Refinar com IA
                              {!plan.can("briefingAiRefine") && <PlanBadge className="ml-2" />}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() =>
                              askConfirm({
                                title: `Excluir a seção "${section.title}"?`,
                                description: section.items.length
                                  ? `Os ${section.items.length} ${section.items.length === 1 ? "item" : "itens"} desta seção, com subitens e links, também serão excluídos. Essa ação não pode ser desfeita.`
                                  : "Essa ação não pode ser desfeita.",
                                confirmLabel: "Excluir seção",
                                destructive: true,
                                onConfirm: async () => {
                                  try {
                                    await briefingProService.deleteSection(section.id);
                                    toast.success("Seção excluída");
                                    await refresh();
                                  } catch {
                                    toast.error("Erro ao excluir a seção");
                                  }
                                },
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 mr-2" />Excluir seção
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  {section.items.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">Sem itens nesta seção.</p>
                  )}
                  <DndContext
                    sensors={dndSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleItemDragEnd(section.id, event)}
                  >
                  <SortableContext
                    items={section.items.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                  {section.items.map((item, itemIndex) => {
                    const itemLinks = detail.links.filter((l) => l.item_id === item.id);
                    const isDone = item.status === "done" || item.status === "skipped";
                    return (
                      <SortableShell key={item.id} id={item.id} disabled={!canEdit || filterActive}>
                      {(itemHandle) => (
                      <div className="flex items-start gap-1.5 sm:gap-2 rounded-lg px-1 sm:px-2 py-2 hover:bg-muted/50 hover-reveal-parent">
                        {canEdit && !filterActive && (
                          <button
                            {...itemHandle}
                            className="mt-0.5 -ml-0.5 p-0.5 rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted cursor-grab active:cursor-grabbing touch-none shrink-0"
                            title="Arrastar para reordenar (ou use as setas ↑↓ nas ações)"
                            aria-label={`Reordenar item ${item.title}`}
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>
                        )}
                        <Checkbox
                          checked={isDone}
                          onCheckedChange={() => toggleItem(item)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-sm font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}>
                              {item.title}
                            </span>
                            <InlineTimeBadge item={item} canEdit={canEdit} onSaved={refresh} />
                            {item.is_required && (
                              <Badge variant="secondary" className="text-xs gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                <Lock className="h-3 w-3" />
                                Obrigatório
                              </Badge>
                            )}
                            {item.priority === "high" && (
                              <Badge variant="secondary" className={`text-xs ${PRIORITY_CONFIG.high.className}`}>
                                Alta
                              </Badge>
                            )}
                            {item.item_type !== "task" && (
                              <Badge variant="outline" className="text-xs">
                                {ITEM_TYPE_LABELS[item.item_type]}
                              </Badge>
                            )}
                            <CrewAssignPopover
                              crew={detail.crew}
                              selectedIds={item.crew_ids}
                              inheritedIds={section.crew_ids}
                              canEdit={canEdit}
                              title="Quem faz este item"
                              onSave={async (ids) => {
                                await briefingProService.setItemCrew(item.id, ids);
                                await refresh();
                              }}
                            />
                            {isDone && (
                              <BriefingCompletedBy
                                item={item}
                                people={allPeople}
                                profiles={detail.profiles}
                                canEdit={canEdit}
                                onChanged={refresh}
                              />
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                          )}
                          <SubitemChecklist item={item} canEdit={canEdit} onChanged={refresh} />
                          {itemLinks.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {itemLinks.map((link) => (
                                <a
                                  key={link.id}
                                  href={link.url || undefined}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`inline-flex items-center gap-1 text-xs rounded-full border px-2 py-0.5 ${link.url ? "text-blue-600 dark:text-blue-400 hover:underline" : "text-muted-foreground cursor-default"}`}
                                  title={link.description || undefined}
                                  onClick={(e) => { if (!link.url) e.preventDefault(); }}
                                >
                                  {link.storage_type === "external_hd" ? (
                                    <HardDrive className="h-3 w-3" />
                                  ) : (
                                    <Link2 className="h-3 w-3" />
                                  )}
                                  {link.label}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        {canEdit && (
                          <ItemRowActions
                            canMoveUp={!filterActive && itemIndex > 0}
                            canMoveDown={!filterActive && itemIndex < section.items.length - 1}
                            onMoveUp={() => moveItem(section.id, item.id, -1)}
                            onMoveDown={() => moveItem(section.id, item.id, 1)}
                            onLink={() => setLinkDialog({ itemId: item.id })}
                            onEdit={() => setItemDialog({ sectionId: section.id, item })}
                            onDelete={() =>
                              askConfirm({
                                title: `Excluir o item "${item.title}"?`,
                                description: "Subitens, links e comentários ligados a ele também somem. Essa ação não pode ser desfeita.",
                                confirmLabel: "Excluir item",
                                destructive: true,
                                onConfirm: async () => {
                                  try {
                                    await briefingProService.deleteItem(item.id);
                                    await refresh();
                                  } catch {
                                    toast.error("Erro ao excluir o item");
                                  }
                                },
                              })
                            }
                          />
                        )}
                      </div>
                      )}
                      </SortableShell>
                    );
                  })}
                  </SortableContext>
                  </DndContext>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground mt-1"
                      onClick={() => setItemDialog({ sectionId: section.id })}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Item
                    </Button>
                  )}
                </CardContent>
              </Card>
              )}
              </SortableShell>
            ))}
            </div>
            </SortableContext>
            </DndContext>

            {/* Entregáveis */}
            <div className="flex items-center justify-between pt-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Entregáveis
              </h2>
              {canEdit && (
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setDeliverableDialog({})}>
                  <Plus className="h-4 w-4" />
                  Entregável
                </Button>
              )}
            </div>
            {detail.deliverables.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum entregável definido. O que precisa ser entregue, para quem, onde e quando?
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {detail.deliverables.map((del) => {
                  const delLinks = detail.links.filter((l) => l.deliverable_id === del.id);
                  const delCfg = DELIVERABLE_STATUS_CONFIG[del.status];
                  const assignee = del.assigned_to ? detail.profiles[del.assigned_to] : null;
                  return (
                    <Card key={del.id}>
                      <CardContent className="py-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-sm">
                                {del.quantity > 1 ? `${del.quantity}x ` : ""}{del.title}
                              </span>
                              <Badge variant="secondary" className={delCfg.className}>{delCfg.label}</Badge>
                            </div>
                            {del.specs && <p className="text-xs text-muted-foreground mt-1">{del.specs}</p>}
                            {del.description && <p className="text-xs text-muted-foreground mt-0.5">{del.description}</p>}
                            <p className="text-xs text-muted-foreground mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                              {del.due_date && <span>📅 Prazo: {formatDate(del.due_date)}</span>}
                              {del.deliver_to && <span>👤 Para: {del.deliver_to}</span>}
                              {del.delivery_method && <span>📦 Via: {del.delivery_method}</span>}
                              {assignee && <span>🎯 Responsável: {assignee.display_name}</span>}
                            </p>
                            {delLinks.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {delLinks.map((link) => (
                                  <a
                                    key={link.id}
                                    href={link.url || undefined}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`inline-flex items-center gap-1 text-xs rounded-full border px-2 py-0.5 ${link.url ? "text-blue-600 dark:text-blue-400 hover:underline" : "text-muted-foreground cursor-default"}`}
                                    title={link.description || undefined}
                                    onClick={(e) => { if (!link.url) e.preventDefault(); }}
                                  >
                                    {link.storage_type === "external_hd" ? <HardDrive className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                                    {link.label}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                          {canEdit && (
                            <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                              <Select
                                value={del.status}
                                onValueChange={async (v) => {
                                  try {
                                    await briefingProService.updateDeliverable(del.id, { status: v });
                                    refresh();
                                  } catch {
                                    toast.error("Erro ao atualizar o status");
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8 w-[140px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(Object.keys(DELIVERABLE_STATUS_CONFIG) as Array<keyof typeof DELIVERABLE_STATUS_CONFIG>).map((s) => (
                                    <SelectItem key={s} value={s}>
                                      {DELIVERABLE_STATUS_CONFIG[s].label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  title="Anexar link"
                                  onClick={() => setLinkDialog({ deliverableId: del.id })}
                                >
                                  <Link2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => setDeliverableDialog({ deliverable: del })}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                  title="Excluir entregável"
                                  onClick={() =>
                                    askConfirm({
                                      title: `Excluir o entregável "${del.title}"?`,
                                      description: "Os links anexados a ele também serão removidos. Essa ação não pode ser desfeita.",
                                      confirmLabel: "Excluir entregável",
                                      destructive: true,
                                      onConfirm: async () => {
                                        try {
                                          await briefingProService.deleteDeliverable(del.id);
                                          await refresh();
                                        } catch {
                                          toast.error("Erro ao excluir o entregável");
                                        }
                                      },
                                    })
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Comentários */}
            <CommentsCard
              comments={comments}
              onAdd={async (content) => {
                try {
                  const created = await briefingProService.addComment(briefingId, content);
                  setComments((prev) => [...prev, created]);
                } catch {
                  toast.error("Erro ao comentar");
                }
              }}
              onDelete={(id) =>
                askConfirm({
                  title: "Remover este comentário?",
                  description: "Ele some da conversa para todos do briefing.",
                  confirmLabel: "Remover",
                  destructive: true,
                  onConfirm: async () => {
                    try {
                      await briefingProService.deleteComment(id);
                      setComments((prev) => prev.filter((c) => c.id !== id));
                    } catch {
                      toast.error("Erro ao remover o comentário");
                    }
                  },
                })
              }
              userId={userProfile?.id}
              isOwner={isOwner}
            />
          </div>

          {/* Coluna lateral */}
          <div className="space-y-4">
            {/* Equipe do trabalho e funções */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Equipe e funções
                  </CardTitle>
                  {canEdit && (
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      title="Editar equipe e funções"
                      onClick={() => setCrewDialog(true)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <CardDescription className="text-xs">
                  Quem trabalha no dia e a função de cada um. Atribua quem faz o quê em cada seção e item.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {detail.crew.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma pessoa ainda.{canEdit ? " Cadastre a equipe para atribuir quem faz o quê." : ""}
                  </p>
                )}
                {detail.crew.map((member) => (
                  <div key={member.id} className="flex items-center gap-2 text-sm">
                    {member.profile ? (
                      <Avatar profile={member.profile} size={6} />
                    ) : (
                      <span className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="flex-1 min-w-0 truncate">
                      {member.name}
                      {member.profile?.username && (
                        <span className="text-xs text-muted-foreground"> @{member.profile.username}</span>
                      )}
                    </span>
                    {member.job_role && (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${jobRoleTone(member.job_role)}`}>
                        {member.job_role}
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Links gerais de materiais */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Materiais
                  </CardTitle>
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLinkDialog({})}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <CardDescription className="text-xs">
                  Onde os arquivos estão: Drive, WeTransfer, HD externo etiquetado...
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {detail.links.filter((l) => !l.item_id && !l.deliverable_id).length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum material registrado.</p>
                )}
                {detail.links
                  .filter((l) => !l.item_id && !l.deliverable_id)
                  .map((link) => (
                    <div key={link.id} className="flex items-start gap-2 hover-reveal-parent">
                      <span className="mt-0.5 text-muted-foreground">
                        {link.storage_type === "external_hd" ? (
                          <HardDrive className="h-4 w-4" />
                        ) : (
                          <ExternalLink className="h-4 w-4" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        {link.url ? (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline break-all"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <span className="text-sm font-medium">{link.label}</span>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {STORAGE_TYPE_LABELS[link.storage_type]}
                          {link.description ? ` — ${link.description}` : ""}
                        </p>
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost" size="icon"
                          className="h-6 w-6 hover-reveal text-destructive"
                          title="Remover material"
                          onClick={() =>
                            askConfirm({
                              title: `Remover o material "${link.label}"?`,
                              description: "O link sai do briefing para todos. O arquivo em si não é apagado.",
                              confirmLabel: "Remover",
                              destructive: true,
                              onConfirm: async () => {
                                try {
                                  await briefingProService.deleteLink(link.id);
                                  await refresh();
                                } catch {
                                  toast.error("Erro ao remover o link");
                                }
                              },
                            })
                          }
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
              </CardContent>
            </Card>

            {/* Contatos */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contatos-chave
                  </CardTitle>
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setContactsDialog(true)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {briefing.contacts.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum contato. Quem precisa ser acionado no dia?
                  </p>
                )}
                {briefing.contacts.map((c, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium">
                      {c.name}
                      {c.role && <span className="text-muted-foreground font-normal"> — {c.role}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[c.phone, c.email].filter(Boolean).join(" · ")}
                    </p>
                    {c.notes && <p className="text-xs text-muted-foreground italic">{c.notes}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Locações */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Locações
                  </CardTitle>
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLocationsDialog(true)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {briefing.locations.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma locação. Onde o trabalho acontece?
                  </p>
                )}
                {briefing.locations.map((l, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium">{l.name}</p>
                    {l.address && <p className="text-xs text-muted-foreground">{l.address}</p>}
                    {l.map_url && (
                      <a
                        href={l.map_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Ver no mapa
                      </a>
                    )}
                    {l.notes && <p className="text-xs text-muted-foreground italic">{l.notes}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Intercorrências */}
            <BriefingIncidentsCard
              briefingId={briefingId}
              incidents={detail.incidents}
              myRole={detail.my_role}
              userId={userProfile?.id}
              profiles={detail.profiles}
              onChanged={refresh}
            />

            {/* Confirmações de leitura */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Leitura confirmada (v{briefing.version})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {allPeople.map(({ id, profile }) => {
                  const confirmed = currentReads.find((r) => r.user_id === id);
                  return (
                    <div key={id} className="flex items-center gap-2 text-sm">
                      <Avatar profile={profile} size={6} />
                      <span className="flex-1 truncate">
                        {profile?.display_name ?? "Usuário"}
                        {id === briefing.owner_id && (
                          <span className="text-xs text-muted-foreground"> (dono)</span>
                        )}
                      </span>
                      {confirmed ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1" title={new Date(confirmed.confirmed_at).toLocaleString("pt-BR")}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {new Date(confirmed.confirmed_at).toLocaleDateString("pt-BR")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">pendente</span>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />

      {/* ─── Dialogs ───────────────────────────────────────────────────────── */}

      {editInfoOpen && (
        <EditInfoDialog
          briefing={briefing}
          members={detail.members}
          ownerProfile={detail.profiles[briefing.owner_id] ?? null}
          isOwner={isOwner}
          onClose={() => setEditInfoOpen(false)}
          onSaved={() => { setEditInfoOpen(false); refresh(); }}
        />
      )}

      {sectionDialog && (
        <SectionDialog
          briefingId={briefingId}
          section={sectionDialog.section}
          onClose={() => setSectionDialog(null)}
          onSaved={() => { setSectionDialog(null); refresh(); }}
        />
      )}

      {refineDialog && (
        <RefineSectionDialog
          briefing={briefing}
          section={refineDialog.section}
          onClose={() => setRefineDialog(null)}
          onApplied={() => { setRefineDialog(null); refresh(); }}
        />
      )}

      {itemDialog && (
        <ItemDialog
          briefingId={briefingId}
          sectionId={itemDialog.sectionId}
          item={itemDialog.item}
          people={allPeople}
          crew={detail.crew}
          sections={detail.sections.map((s) => ({ id: s.id, title: s.title }))}
          onClose={() => setItemDialog(null)}
          onSaved={() => { setItemDialog(null); refresh(); }}
        />
      )}

      {shareOpen && (
        <ShareBriefingDialog
          briefing={briefing}
          onClose={() => setShareOpen(false)}
          onChanged={refresh}
        />
      )}

      {crewDialog && (
        <CrewDialog
          detail={detail}
          people={allPeople}
          onClose={() => setCrewDialog(false)}
          onSaved={() => { setCrewDialog(false); refresh(); }}
        />
      )}

      {recalcOpen && (
        <BriefingRecalcDialog
          briefingId={briefing.id}
          onClose={() => setRecalcOpen(false)}
          onApplied={() => { setRecalcOpen(false); refresh(); }}
        />
      )}
      {timeShiftOpen && (
        <BriefingTimeShiftDialog
          briefingId={briefingId}
          sections={detail.sections.map((s) => ({ id: s.id, title: s.title }))}
          onClose={() => setTimeShiftOpen(false)}
          onApplied={() => { setTimeShiftOpen(false); refresh(); }}
        />
      )}

      {deliverableDialog && (
        <DeliverableDialog
          briefingId={briefingId}
          deliverable={deliverableDialog.deliverable}
          people={allPeople}
          onClose={() => setDeliverableDialog(null)}
          onSaved={() => { setDeliverableDialog(null); refresh(); }}
        />
      )}

      {linkDialog && (
        <LinkDialog
          briefingId={briefingId}
          itemId={linkDialog.itemId}
          deliverableId={linkDialog.deliverableId}
          onClose={() => setLinkDialog(null)}
          onSaved={() => { setLinkDialog(null); refresh(); }}
        />
      )}

      {contactsDialog && (
        <ContactsDialog
          briefingId={briefingId}
          contacts={briefing.contacts}
          onClose={() => setContactsDialog(false)}
          onSaved={() => { setContactsDialog(false); refresh(); }}
        />
      )}

      {locationsDialog && (
        <LocationsDialog
          briefingId={briefingId}
          locations={briefing.locations}
          onClose={() => setLocationsDialog(false)}
          onSaved={() => { setLocationsDialog(false); refresh(); }}
        />
      )}

      <TeamSheet
        open={teamOpen}
        onOpenChange={setTeamOpen}
        detail={detail}
        isOwner={isOwner}
        userId={userProfile?.id}
        onChanged={refresh}
      />
      {confirmDialog}
    </div>
  );
}

// ─── Checklist de subitens (dentro de cada item) ─────────────────────────────

function SubitemChecklist({
  item, canEdit, onChanged,
}: {
  item: BriefingItem;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  // Estado otimista local para o toggle não esperar o refresh completo
  const [optimistic, setOptimistic] = useState<Record<string, "pending" | "done">>({});

  if (item.subitems.length === 0 && !canEdit) return null;

  async function toggle(subitemId: string, current: "pending" | "done") {
    const next = current === "done" ? "pending" : "done";
    setOptimistic((prev) => ({ ...prev, [subitemId]: next }));
    try {
      await briefingProService.updateSubitemStatus(subitemId, next);
      onChanged();
    } catch {
      setOptimistic((prev) => ({ ...prev, [subitemId]: current }));
      toast.error("Erro ao atualizar o subitem");
    }
  }

  async function addSubitem() {
    const title = newTitle.trim();
    if (!title) return;
    setSaving(true);
    try {
      await briefingProService.createSubitem(item.id, title);
      setNewTitle("");
      onChanged();
    } catch {
      toast.error("Erro ao criar o subitem");
    } finally {
      setSaving(false);
    }
  }

  const done = item.subitems.filter(
    (s) => (optimistic[s.id] ?? s.status) === "done"
  ).length;

  return (
    <div className="mt-1.5 space-y-1">
      {item.subitems.length > 0 && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <CornerDownRight className="h-3 w-3" />
          {done}/{item.subitems.length} subitens
        </p>
      )}
      {item.subitems.map((sub) => {
        const status = optimistic[sub.id] ?? sub.status;
        return (
          <div key={sub.id} className="flex items-center gap-2 pl-4 hover-reveal-parent">
            <Checkbox
              checked={status === "done"}
              onCheckedChange={() => toggle(sub.id, status)}
              className="h-3.5 w-3.5"
            />
            <span
              className={`text-xs flex-1 ${status === "done" ? "line-through text-muted-foreground" : ""}`}
            >
              {sub.title}
            </span>
            {canEdit && (
              <Button
                variant="ghost" size="icon"
                className="h-6 w-6 hover-reveal text-destructive"
                title="Remover subitem"
                disabled={removing === sub.id}
                onClick={async () => {
                  if (removing) return;
                  setRemoving(sub.id);
                  try {
                    await briefingProService.deleteSubitem(sub.id);
                    await onChanged();
                  } catch {
                    toast.error("Erro ao remover o subitem");
                  } finally {
                    setRemoving(null);
                  }
                }}
              >
                {removing === sub.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        );
      })}
      {canEdit && (
        adding ? (
          <div className="flex items-center gap-2 pl-4">
            <Input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Descreva o subitem..."
              className="h-7 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSubitem();
                }
                if (e.key === "Escape") {
                  setAdding(false);
                  setNewTitle("");
                }
              }}
            />
            <Button size="sm" className="h-7 text-xs" onClick={addSubitem} disabled={saving || !newTitle.trim()}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Adicionar"}
            </Button>
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => { setAdding(false); setNewTitle(""); }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <button
            className="flex items-center gap-1 pl-4 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3 w-3" />
            Subitem
          </button>
        )
      )}
    </div>
  );
}

// ─── Comentários ─────────────────────────────────────────────────────────────

function CommentsCard({
  comments, onAdd, onDelete, userId, isOwner,
}: {
  comments: BriefingComment[];
  onAdd: (content: string) => Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  userId?: string;
  isOwner: boolean;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    await onAdd(content);
    setText("");
    setSending(false);
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Comentários ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 hover-reveal-parent">
              <Avatar profile={c.profile} size={7} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {c.profile?.display_name ?? "Usuário"}
                  </span>{" "}
                  · {new Date(c.created_at).toLocaleString("pt-BR")}
                </p>
                <p className="text-sm whitespace-pre-wrap break-words">{c.content}</p>
              </div>
              {(c.author_id === userId || isOwner) && (
                <Button
                  variant="ghost" size="icon"
                  className="h-6 w-6 hover-reveal text-destructive"
                  onClick={() => onDelete(c.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva um comentário para todos do briefing..."
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
            }}
          />
          <Button size="icon" onClick={submit} disabled={sending || !text.trim()} className="shrink-0 self-end">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Dialog: editar informações gerais ───────────────────────────────────────

function EditInfoDialog({
  briefing, members, ownerProfile, isOwner, onClose, onSaved,
}: {
  briefing: BriefingDetail["briefing"];
  members: BriefingDetail["members"];
  ownerProfile: ProfileSummary | null;
  isOwner: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: briefing.title,
    briefing_type: briefing.briefing_type as string,
    client_name: briefing.client_name ?? "",
    objective: briefing.objective ?? "",
    target_audience: briefing.target_audience ?? "",
    tone: briefing.tone ?? "",
    restrictions: briefing.restrictions ?? "",
    notes: briefing.notes ?? "",
    event_date: briefing.event_date ?? "",
    event_time: briefing.event_time ?? "",
    approver_id: briefing.approver_id ?? "owner",
  });
  const [saving, setSaving] = useState(false);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    if (form.title.trim().length < 2) {
      toast.error("O título é obrigatório");
      return;
    }
    setSaving(true);
    try {
      await briefingProService.update(briefing.id, {
        title: form.title.trim(),
        briefing_type: form.briefing_type,
        client_name: form.client_name,
        objective: form.objective,
        target_audience: form.target_audience,
        tone: form.tone,
        restrictions: form.restrictions,
        notes: form.notes,
        event_date: form.event_date,
        event_time: form.event_time,
        ...(isOwner && form.approver_id !== "owner" ? { approver_id: form.approver_id } : {}),
      });
      toast.success("Briefing atualizado");
      onSaved();
    } catch {
      toast.error("Erro ao salvar as alterações");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar briefing</DialogTitle>
          {(briefing.status === "approved" || briefing.status === "in_execution") && (
            <DialogDescription className="text-amber-600 dark:text-amber-400">
              O briefing já foi aprovado — salvar cria a versão v{briefing.version + 1} e todos
              precisarão confirmar a leitura novamente.
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.briefing_type} onValueChange={(v) => set("briefing_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(BRIEFING_TYPE_LABELS) as BriefingType[]).map((t) => (
                    <SelectItem key={t} value={t}>{BRIEFING_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input value={form.client_name} onChange={(e) => set("client_name", e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da execução</Label>
              <Input type="date" value={form.event_date} onChange={(e) => set("event_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Input type="time" value={form.event_time} onChange={(e) => set("event_time", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Objetivo</Label>
            <Textarea rows={2} value={form.objective} onChange={(e) => set("objective", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Público-alvo</Label>
              <Input value={form.target_audience} onChange={(e) => set("target_audience", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tom / estilo</Label>
              <Input value={form.tone} onChange={(e) => set("tone", e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Restrições (o que NÃO pode acontecer)</Label>
            <Textarea rows={2} value={form.restrictions} onChange={(e) => set("restrictions", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Observações gerais</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          {isOwner && (
            <div className="space-y-2">
              <Label>Quem aprova este briefing?</Label>
              <Select value={form.approver_id} onValueChange={(v) => set("approver_id", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">
                    {ownerProfile?.display_name ?? "Eu"} (dono)
                  </SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.profile?.display_name ?? "Usuário"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: seção ───────────────────────────────────────────────────────────

function SectionDialog({
  briefingId, section, onClose, onSaved,
}: {
  briefingId: string;
  section?: BriefingSection;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(section?.title ?? "");
  const [description, setDescription] = useState(section?.description ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (section) {
        await briefingProService.updateSection(section.id, { title: title.trim(), description });
      } else {
        await briefingProService.createSection(briefingId, { title: title.trim(), description });
      }
      onSaved();
    } catch {
      toast.error("Erro ao salvar a seção");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{section ? "Editar seção" : "Nova seção"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Cronograma do Dia, Shot List, Preparação..."
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Para que serve esta seção"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !title.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: compartilhar por link ───────────────────────────────────────────

function ShareBriefingDialog({
  briefing, onClose, onChanged,
}: {
  briefing: BriefingDetail["briefing"];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [role, setRole] = useState<string>(briefing.share_role ?? "viewer");
  const [token, setToken] = useState<string | null>(briefing.share_token);
  const [busy, setBusy] = useState(false);

  const shareUrl = token && typeof window !== "undefined"
    ? `${window.location.origin}/briefing/${token}`
    : null;

  async function enable(regenerate = false) {
    setBusy(true);
    try {
      const result = await briefingProService.enableShare(
        briefing.id,
        role as "viewer" | "editor",
        regenerate
      );
      setToken(result.share_token);
      toast.success(regenerate ? "Novo link gerado — o anterior foi invalidado" : "Link ativado!");
      onChanged();
    } catch {
      toast.error("Erro ao ativar o link");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      await briefingProService.disableShare(briefing.id);
      setToken(null);
      toast.success("Link desativado — quem tem o link perde o acesso");
      onChanged();
    } catch {
      toast.error("Erro ao desativar o link");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar — selecione e copie manualmente");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartilhar briefing
          </DialogTitle>
          <DialogDescription>
            Quem abrir o link <strong>consulta tudo sem precisar de conta</strong>. Para
            participar (marcar itens, comentar{role === "editor" ? ", editar" : ""}), a pessoa
            entra ou cria uma conta e vira membro automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Quem entrar pelo link vira</Label>
            <Select
              value={role}
              onValueChange={async (v) => {
                setRole(v);
                // Link já ativo: atualiza o papel na hora (mesmo token)
                if (token) {
                  try {
                    await briefingProService.enableShare(briefing.id, v as "viewer" | "editor");
                    toast.success("Papel do link atualizado");
                    onChanged();
                  } catch {
                    toast.error("Erro ao atualizar o papel");
                  }
                }
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">
                  Visualizador — vê tudo, comenta e marca itens na execução
                </SelectItem>
                <SelectItem value="editor">
                  Editor — pode alterar o conteúdo do briefing
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {token ? (
            <>
              <div className="space-y-2">
                <Label>Link de compartilhamento</Label>
                <div className="flex gap-2">
                  <Input readOnly value={shareUrl ?? ""} className="text-xs" onFocus={(e) => e.target.select()} />
                  <Button size="icon" variant="outline" onClick={copyLink} title="Copiar link" className="shrink-0">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  disabled={busy}
                  onClick={() => enable(true)}
                  title="Gera um novo link e invalida o atual"
                >
                  <RefreshCw className="h-4 w-4" />
                  Gerar novo link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2 text-destructive hover:text-destructive"
                  disabled={busy}
                  onClick={disable}
                >
                  <X className="h-4 w-4" />
                  Desativar link
                </Button>
              </div>
            </>
          ) : (
            <Button className="w-full gap-2" disabled={busy} onClick={() => enable()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
              Ativar link de compartilhamento
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: refinar seção com IA ────────────────────────────────────────────

const REFINE_MODES: Array<{ mode: RefineMode; label: string; description: string }> = [
  {
    mode: "detail",
    label: "Mais detalhes",
    description: "Destrincha os itens, adiciona subitens e especificidade de quem já executou muitos trabalhos.",
  },
  {
    mode: "concise",
    label: "Mais enxuto",
    description: "Enxuga para o essencial: funde redundâncias e corta o que não muda a execução.",
  },
  {
    mode: "custom",
    label: "Personalizado",
    description: "Você explica o que quer e a IA refina apenas esta seção seguindo sua instrução.",
  },
];

function RefineSectionDialog({
  briefing, section, onClose, onApplied,
}: {
  briefing: BriefingDetail["briefing"];
  section: BriefingSection;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [mode, setMode] = useState<RefineMode>("detail");
  const [instruction, setInstruction] = useState("");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<GeneratedSection | null>(null);
  const [applying, setApplying] = useState(false);

  async function generate() {
    if (mode === "custom" && instruction.trim().length < 5) {
      toast.error("Explique o que a IA deve fazer com esta seção");
      return;
    }
    setGenerating(true);
    try {
      // fetch direto (em vez do service) para ler o corpo do 403 de plano
      const res = await fetch("/api/briefing-pro/refine-section", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenManager.authHeader() },
        body: JSON.stringify({
        mode,
        instruction: mode === "custom" ? instruction.trim() : undefined,
        briefing: {
          title: briefing.title,
          briefing_type: briefing.briefing_type,
          objective: briefing.objective,
          tone: briefing.tone,
          restrictions: briefing.restrictions,
          event_date: briefing.event_date,
          event_time: briefing.event_time,
        },
        section: {
          title: section.title,
          description: section.description,
          items: section.items.map((i) => ({
            title: i.title,
            description: i.description,
            item_type: i.item_type,
            priority: i.priority,
            scheduled_time: i.scheduled_time,
            is_required: i.is_required,
            subitems: i.subitems.map((s) => ({ title: s.title })),
          })),
        },
        }),
      });
      const data = await res.json().catch(() => ({}));
      // Recurso Pro (refinar com IA) ou créditos de IA esgotados → modal de upgrade
      if (res.status === 403 && notifyPlanLimit(data)) return;
      if (!res.ok) throw new Error(data?.error || "Erro ao refinar a seção com IA");
      setPreview(data.section as GeneratedSection);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao refinar a seção");
    } finally {
      setGenerating(false);
    }
  }

  async function apply() {
    if (!preview) return;
    setApplying(true);
    try {
      await briefingProService.replaceSectionContent(section.id, {
        title: preview.title,
        description: preview.description,
        items: preview.items,
      });
      toast.success("Seção refinada e aplicada!");
      onApplied();
    } catch {
      toast.error("Erro ao aplicar o refino");
      setApplying(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !applying && !generating && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-rose-500" />
            Refinar &quot;{section.title}&quot; com IA
          </DialogTitle>
          <DialogDescription>
            A IA refina apenas esta seção — o resto do briefing não é alterado.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <div className="grid gap-2">
              {REFINE_MODES.map((option) => (
                <button
                  key={option.mode}
                  onClick={() => setMode(option.mode)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    mode === option.mode
                      ? "border-rose-500 bg-rose-50 dark:bg-rose-900/10"
                      : "hover:border-muted-foreground/40"
                  }`}
                >
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </button>
              ))}
            </div>
            {mode === "custom" && (
              <div className="space-y-2">
                <Label>O que você quer que a IA faça com esta seção?</Label>
                <Textarea
                  autoFocus
                  rows={4}
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder='Ex: "Adicione itens de iluminação para ambiente noturno e transforme cada foto de família em um subitem com os nomes", "Reorganize por horário e deixe tudo mais direto"...'
                />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={generating || applying}>
                Cancelar
              </Button>
              <Button onClick={generate} disabled={generating} className="gap-2">
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Refinando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Refinar seção
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{preview.title}</CardTitle>
                {preview.description && (
                  <CardDescription>{preview.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {preview.items.map((item, i) => (
                    <li key={i} className="text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                        <span className="font-medium">{item.title}</span>
                        {item.scheduled_time && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Clock className="h-3 w-3" />{item.scheduled_time}
                          </Badge>
                        )}
                        {item.is_required && (
                          <Badge variant="secondary" className="text-xs gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            <Lock className="h-3 w-3" />Obrigatório
                          </Badge>
                        )}
                        {item.priority === "high" && (
                          <Badge variant="secondary" className={`text-xs ${PRIORITY_CONFIG.high.className}`}>
                            Alta
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 pl-6">{item.description}</p>
                      )}
                      {(item.subitems?.length ?? 0) > 0 && (
                        <ul className="mt-1 space-y-0.5 pl-6">
                          {item.subitems!.map((sub, si) => (
                            <li key={si} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <CornerDownRight className="h-3 w-3 shrink-0" />
                              {sub.title}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Aplicar substitui todos os itens atuais desta seção — marcações de checklist,
              responsáveis e links anexados a esses itens serão resetados.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setPreview(null)} disabled={applying}>
                Voltar e ajustar
              </Button>
              <Button variant="outline" onClick={generate} disabled={generating || applying} className="gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Gerar novamente
              </Button>
              <Button onClick={apply} disabled={applying || generating} className="gap-2">
                {applying && <Loader2 className="h-4 w-4 animate-spin" />}
                Aplicar refino
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: item ────────────────────────────────────────────────────────────

function ItemDialog({
  briefingId, sectionId, item, people, crew, sections, onClose, onSaved,
}: {
  briefingId: string;
  sectionId: string;
  item?: BriefingItem;
  /** Usuários com acesso (para "Executado por"). */
  people: Array<{ id: string; profile: ProfileSummary | null }>;
  /** Equipe do trabalho (para "Quem faz"). */
  crew: BriefingCrew[];
  sections: Array<{ id: string; title: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: item?.title ?? "",
    description: item?.description ?? "",
    item_type: item?.item_type ?? "task",
    priority: item?.priority ?? "medium",
    scheduled_time: item?.scheduled_time ?? "",
    duration_minutes: item?.duration_minutes ? String(item.duration_minutes) : "",
    completed_by: item?.completed_by ?? "none",
    section_id: item?.section_id ?? sectionId,
  });
  const [crewIds, setCrewIds] = useState<string[]>(item?.crew_ids ?? []);
  const crewChanged =
    crewIds.length !== (item?.crew_ids.length ?? 0) ||
    crewIds.some((id) => !item?.crew_ids.includes(id));
  const [isRequired, setIsRequired] = useState(item?.is_required ?? false);
  const [saving, setSaving] = useState(false);
  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  // Item já fechado: dono/editores podem corrigir quem executou
  const itemClosed = !!item && (item.status === "done" || item.status === "skipped");
  const executorOutsideTeam =
    itemClosed && !!item?.completed_by && !people.some((p) => p.id === item.completed_by);

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description || undefined,
      item_type: form.item_type,
      priority: form.priority,
      is_required: isRequired,
      scheduled_time: form.scheduled_time || undefined,
      duration_minutes: form.duration_minutes
        ? parseInt(form.duration_minutes, 10)
        : (item ? null : undefined),
      ...(itemClosed
        ? { completed_by: form.completed_by === "none" ? null : form.completed_by }
        : {}),
    };
    try {
      if (item) {
        await briefingProService.updateItem(item.id, {
          ...payload,
          ...(form.section_id !== item.section_id ? { section_id: form.section_id } : {}),
        });
        if (crewChanged) await briefingProService.setItemCrew(item.id, crewIds);
      } else {
        const created = await briefingProService.createItem(briefingId, {
          ...payload,
          section_id: form.section_id,
        });
        if (crewIds.length > 0) await briefingProService.setItemCrew(created.id, crewIds);
      }
      onSaved();
    } catch {
      toast.error("Erro ao salvar o item");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Editar item" : "Novo item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ex: Foto do primeiro olhar, Conferir baterias..."
            />
          </div>
          {sections.length > 1 && (
            <div className="space-y-2">
              <Label>Seção</Label>
              <Select value={form.section_id} onValueChange={(v) => set("section_id", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Detalhes</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.item_type} onValueChange={(v) => set("item_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ITEM_TYPE_LABELS) as Array<keyof typeof ITEM_TYPE_LABELS>).map((t) => (
                    <SelectItem key={t} value={t}>{ITEM_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Horário (cronograma)</Label>
              <Input
                type="time"
                value={form.scheduled_time}
                onChange={(e) => set("scheduled_time", e.target.value)}
              />
              <Label className="block pt-1">Duração (min)</Label>
              <Input
                type="number"
                min={1}
                max={1440}
                placeholder="ex.: 30"
                value={form.duration_minutes}
                onChange={(e) => set("duration_minutes", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Quem faz</Label>
              <div className="rounded-md border p-2">
                <CrewCheckboxList
                  crew={crew}
                  selected={crewIds}
                  onToggle={(id) =>
                    setCrewIds((prev) =>
                      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                    )
                  }
                  emptyHint="Cadastre a equipe no card “Equipe e funções” para atribuir."
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Sem ninguém marcado, o item fica com quem cuida da seção.
              </p>
            </div>
          </div>
          {itemClosed && (
            <div className="space-y-2">
              <Label>Executado por</Label>
              <Select value={form.completed_by} onValueChange={(v) => set("completed_by", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informado</SelectItem>
                  {executorOutsideTeam && item?.completed_by && (
                    <SelectItem value={item.completed_by}>Membro que saiu da equipe</SelectItem>
                  )}
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.profile?.display_name ?? "Usuário"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Quem de fato executou este item — é o nome que vai para o relatório pós-execução.
              </p>
            </div>
          )}
          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
            <Checkbox
              checked={isRequired}
              onCheckedChange={(v) => setIsRequired(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm">
              <span className="font-medium flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-purple-500" />
                Obrigatório para toda a equipe
              </span>
              <span className="text-muted-foreground text-xs">
                Não pode ser pulado no dia da execução e o briefing não pode ser concluído
                enquanto ele estiver pendente.
              </span>
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.title.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: equipe do trabalho e funções ────────────────────────────────────

function CrewDialog({
  detail, people, onClose, onSaved,
}: {
  detail: BriefingDetail;
  /** Dono + membros com acesso — sugestões de vínculo. */
  people: Array<{ id: string; profile: ProfileSummary | null }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [drafts, setDrafts] = useState<CrewDraft[]>(() =>
    detail.crew.map((c) =>
      newCrewDraft({
        id: c.id,
        name: c.name,
        job_role: c.job_role,
        user_id: c.user_id,
        profile: c.profile ?? null,
        phone: c.phone ?? "",
      })
    )
  );
  const [saving, setSaving] = useState(false);
  const quickProfiles = people
    .map((p) => p.profile)
    .filter((p): p is ProfileSummary => Boolean(p));
  const linkedIds = new Set(drafts.map((d) => d.user_id).filter(Boolean));
  const notInCrew = quickProfiles.filter((p) => !linkedIds.has(p.id));

  async function save() {
    setSaving(true);
    try {
      const originalById = new Map(detail.crew.map((c) => [c.id, c]));
      const keptIds = new Set(drafts.map((d) => d.id).filter(Boolean));
      for (const original of detail.crew) {
        if (!keptIds.has(original.id)) await briefingProService.deleteCrewMember(original.id);
      }
      let position = 0;
      for (const draft of drafts) {
        const name = draft.name.trim();
        if (!name) continue;
        const jobRole = draft.job_role.trim();
        const phone = draft.phone.trim();
        const original = draft.id ? originalById.get(draft.id) : undefined;
        if (draft.id && original) {
          const patch: Parameters<typeof briefingProService.updateCrewMember>[1] = {};
          if (name !== original.name) patch.name = name;
          if (jobRole !== original.job_role) patch.job_role = jobRole;
          if ((draft.user_id ?? null) !== original.user_id) patch.user_id = draft.user_id ?? null;
          if (phone !== (original.phone ?? "")) patch.phone = phone;
          if (position !== original.position) patch.position = position;
          if (Object.keys(patch).length > 0) {
            await briefingProService.updateCrewMember(draft.id, patch);
          }
        } else {
          await briefingProService.addCrewMember(detail.briefing.id, {
            name,
            job_role: jobRole || undefined,
            user_id: draft.user_id ?? undefined,
            phone: phone || undefined,
          });
        }
        position += 1;
      }
      toast.success("Equipe atualizada");
      onSaved();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Erro ao salvar a equipe");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Equipe e funções
          </DialogTitle>
          <DialogDescription>
            Quem trabalha no dia e a função de cada um (Foto, Drone, Coordenação, Auxiliar...).
            Vincular a um usuário cadastrado liga notificações e o filtro “Meus itens”.
            Remover alguém apaga as atribuições dessa pessoa.
          </DialogDescription>
        </DialogHeader>
        {notInCrew.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Adicionar da equipe de acesso:</span>
            {notInCrew.map((p) => (
              <button
                key={p.id}
                type="button"
                className="rounded-full border px-2 py-0.5 hover:bg-muted"
                onClick={() =>
                  setDrafts((prev) => [
                    ...prev,
                    newCrewDraft({ name: p.display_name, user_id: p.id, profile: p }),
                  ])
                }
              >
                + {p.display_name}
              </button>
            ))}
          </div>
        )}
        <CrewEditor value={drafts} onChange={setDrafts} quickProfiles={quickProfiles} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar equipe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: entregável ──────────────────────────────────────────────────────

function DeliverableDialog({
  briefingId, deliverable, people, onClose, onSaved,
}: {
  briefingId: string;
  deliverable?: BriefingDeliverable;
  people: Array<{ id: string; profile: ProfileSummary | null }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: deliverable?.title ?? "",
    description: deliverable?.description ?? "",
    specs: deliverable?.specs ?? "",
    quantity: String(deliverable?.quantity ?? 1),
    due_date: deliverable?.due_date ?? "",
    deliver_to: deliverable?.deliver_to ?? "",
    delivery_method: deliverable?.delivery_method ?? "",
    assigned_to: deliverable?.assigned_to ?? "none",
  });
  const [saving, setSaving] = useState(false);
  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description || undefined,
      specs: form.specs || undefined,
      quantity: Math.max(1, parseInt(form.quantity, 10) || 1),
      due_date: form.due_date || (deliverable ? null : undefined),
      deliver_to: form.deliver_to || undefined,
      delivery_method: form.delivery_method || undefined,
      assigned_to: form.assigned_to === "none" ? (deliverable ? null : undefined) : form.assigned_to,
    };
    try {
      if (deliverable) {
        await briefingProService.updateDeliverable(deliverable.id, payload);
      } else {
        await briefingProService.createDeliverable(briefingId, payload);
      }
      onSaved();
    } catch {
      toast.error("Erro ao salvar o entregável");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{deliverable ? "Editar entregável" : "Novo entregável"}</DialogTitle>
          <DialogDescription>
            O que será entregue, com specs, prazo, destinatário e canal de entrega.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_90px] gap-4">
            <div className="space-y-2">
              <Label>Entregável *</Label>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Ex: Fotos editadas em alta resolução"
              />
            </div>
            <div className="space-y-2">
              <Label>Qtd.</Label>
              <Input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Specs técnicas</Label>
            <Input
              value={form.specs}
              onChange={(e) => set("specs", e.target.value)}
              placeholder="Ex: JPG 300dpi, 4K MP4 H.264, 9:16 para Reels..."
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prazo</Label>
              <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={form.assigned_to} onValueChange={(v) => set("assigned_to", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguém</SelectItem>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.profile?.display_name ?? "Usuário"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Entregar para</Label>
              <Input
                value={form.deliver_to}
                onChange={(e) => set("deliver_to", e.target.value)}
                placeholder="Nome / e-mail do destinatário"
              />
            </div>
            <div className="space-y-2">
              <Label>Onde / como entregar</Label>
              <Input
                value={form.delivery_method}
                onChange={(e) => set("delivery_method", e.target.value)}
                placeholder="Link do Drive, WeTransfer, pendrive..."
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.title.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: link de material ────────────────────────────────────────────────

function LinkDialog({
  briefingId, itemId, deliverableId, onClose, onSaved,
}: {
  briefingId: string;
  itemId?: string;
  deliverableId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    label: "",
    url: "",
    storage_type: "drive",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const isPhysical = form.storage_type === "external_hd";

  async function save() {
    if (!form.label.trim()) return;
    setSaving(true);
    try {
      await briefingProService.createLink(briefingId, {
        label: form.label.trim(),
        url: form.url.trim() || undefined,
        storage_type: form.storage_type,
        description: form.description || undefined,
        item_id: itemId,
        deliverable_id: deliverableId,
      });
      onSaved();
    } catch {
      toast.error("Erro ao salvar o link");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar material</DialogTitle>
          <DialogDescription>
            O arquivo não é armazenado aqui — registre com precisão onde ele está.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do material *</Label>
            <Input
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder="Ex: Fotos RAW do making of"
            />
          </div>
          <div className="space-y-2">
            <Label>Onde está salvo</Label>
            <Select value={form.storage_type} onValueChange={(v) => set("storage_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STORAGE_TYPE_LABELS) as Array<keyof typeof STORAGE_TYPE_LABELS>).map((t) => (
                  <SelectItem key={t} value={t}>{STORAGE_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!isPhysical && (
            <div className="space-y-2">
              <Label>Link</Label>
              <Input
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://drive.google.com/..."
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>{isPhysical ? "Localização exata *" : "Detalhes"}</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={
                isPhysical
                  ? 'Ex: HD Samsung 2TB etiqueta AZUL, pasta /2026/casamento-ana-pedro'
                  : "O que tem nesse link, pasta específica, senha de acesso..."
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.label.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: contatos ────────────────────────────────────────────────────────

function ContactsDialog({
  briefingId, contacts, onClose, onSaved,
}: {
  briefingId: string;
  contacts: BriefingContact[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [list, setList] = useState<BriefingContact[]>(
    contacts.length ? contacts.map((c) => ({ ...c })) : [{ name: "" }]
  );
  const [saving, setSaving] = useState(false);

  const update = (index: number, key: keyof BriefingContact, value: string) =>
    setList((prev) => prev.map((c, i) => (i === index ? { ...c, [key]: value } : c)));

  async function save() {
    setSaving(true);
    try {
      await briefingProService.update(briefingId, {
        contacts: list.filter((c) => c.name.trim()),
      });
      onSaved();
    } catch {
      toast.error("Erro ao salvar os contatos");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contatos-chave</DialogTitle>
          <DialogDescription>
            Quem pode precisar ser acionado antes ou durante o trabalho.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {list.map((c, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2 relative">
              <Button
                variant="ghost" size="icon"
                className="h-6 w-6 absolute top-2 right-2 text-destructive"
                onClick={() => setList((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <X className="h-3 w-3" />
              </Button>
              <div className="grid sm:grid-cols-2 gap-2">
                <Input
                  value={c.name}
                  onChange={(e) => update(i, "name", e.target.value)}
                  placeholder="Nome *"
                />
                <Input
                  value={c.role ?? ""}
                  onChange={(e) => update(i, "role", e.target.value)}
                  placeholder="Papel (cerimonialista, diretor...)"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <Input
                  value={c.phone ?? ""}
                  onChange={(e) => update(i, "phone", e.target.value)}
                  placeholder="Telefone / WhatsApp"
                />
                <Input
                  value={c.email ?? ""}
                  onChange={(e) => update(i, "email", e.target.value)}
                  placeholder="E-mail"
                />
              </div>
              <Input
                value={c.notes ?? ""}
                onChange={(e) => update(i, "notes", e.target.value)}
                placeholder="Observações"
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setList((prev) => [...prev, { name: "" }])}
          >
            <Plus className="h-4 w-4" />
            Adicionar contato
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: locações ────────────────────────────────────────────────────────

function LocationsDialog({
  briefingId, locations, onClose, onSaved,
}: {
  briefingId: string;
  locations: BriefingLocation[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [list, setList] = useState<BriefingLocation[]>(
    locations.length ? locations.map((l) => ({ ...l })) : [{ name: "" }]
  );
  const [saving, setSaving] = useState(false);

  const update = (index: number, key: keyof BriefingLocation, value: string) =>
    setList((prev) => prev.map((l, i) => (i === index ? { ...l, [key]: value } : l)));

  async function save() {
    setSaving(true);
    try {
      await briefingProService.update(briefingId, {
        locations: list.filter((l) => l.name.trim()),
      });
      onSaved();
    } catch {
      toast.error("Erro ao salvar as locações");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Locações</DialogTitle>
          <DialogDescription>
            Endereços do trabalho com observações de acesso, estacionamento e energia.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {list.map((l, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-2 relative">
              <Button
                variant="ghost" size="icon"
                className="h-6 w-6 absolute top-2 right-2 text-destructive"
                onClick={() => setList((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <X className="h-3 w-3" />
              </Button>
              <Input
                value={l.name}
                onChange={(e) => update(i, "name", e.target.value)}
                placeholder="Nome do local * (Ex: Espaço Jardim — cerimônia)"
              />
              <Input
                value={l.address ?? ""}
                onChange={(e) => update(i, "address", e.target.value)}
                placeholder="Endereço completo"
              />
              <div className="grid sm:grid-cols-2 gap-2">
                <Input
                  value={l.map_url ?? ""}
                  onChange={(e) => update(i, "map_url", e.target.value)}
                  placeholder="Link do Google Maps"
                />
                <Input
                  value={l.notes ?? ""}
                  onChange={(e) => update(i, "notes", e.target.value)}
                  placeholder="Estacionamento, acesso, energia..."
                />
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setList((prev) => [...prev, { name: "" }])}
          >
            <Plus className="h-4 w-4" />
            Adicionar locação
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sheet: equipe ───────────────────────────────────────────────────────────

function TeamSheet({
  open, onOpenChange, detail, isOwner, userId, onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: BriefingDetail;
  isOwner: boolean;
  userId?: string;
  onChanged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [newRole, setNewRole] = useState<string>("viewer");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { confirm: askConfirm, dialog: confirmDialog } = useConfirmDialog();

  const ownerProfile = detail.profiles[detail.briefing.owner_id] ?? null;
  // Limite de membros por briefing (plano do dono — só o dono adiciona)
  const plan = usePlan();
  const memberLimit = plan.limitOf("briefingMembers");
  const memberIds = new Set([
    detail.briefing.owner_id,
    ...detail.members.map((m) => m.user_id),
  ]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // [F17] o valor entra na string de filtro do PostgREST — allowlist
    const q = sanitizeSearchTerm(query);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, username, email")
          .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
          .eq("is_active", true)
          .limit(8);
        setResults(
          ((data ?? []) as ProfileSummary[]).filter((p) => !memberIds.has(p.id))
        );
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  async function addMember(profile: ProfileSummary) {
    try {
      await briefingProService.addMember(detail.briefing.id, profile.id, newRole);
      toast.success(`${profile.display_name} adicionado ao briefing`);
      setQuery("");
      setResults([]);
      onChanged();
    } catch (err) {
      // 403 de plano (limite de membros): o apiClient já abriu o modal de upgrade
      if (isPlanApiError(err)) return;
      toast.error("Erro ao adicionar o membro");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Equipe do briefing
          </SheetTitle>
          <SheetDescription>
            Todos aqui veem o briefing e acompanham a execução em tempo real.
            {isOwner && memberLimit !== null && (
              <> · {detail.members.length} de {memberLimit} membros</>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isOwner && (
            <div className="space-y-3">
              <Label>Adicionar pessoa cadastrada</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nome ou usuário..."
                    className="pl-9"
                  />
                </div>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {searching && <p className="text-xs text-muted-foreground">Buscando...</p>}
              {results.length > 0 && (
                <div className="rounded-lg border divide-y">
                  {results.map((p) => (
                    <button
                      key={p.id}
                      className="w-full flex items-center gap-3 p-2.5 hover:bg-muted/50 text-left"
                      onClick={() => addMember(p)}
                    >
                      <Avatar profile={p} size={8} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.display_name}</p>
                        {p.username && (
                          <p className="text-xs text-muted-foreground">@{p.username}</p>
                        )}
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Editor</span> altera o conteúdo;{" "}
                <span className="font-medium">Visualizador</span> vê tudo, comenta e marca itens no
                dia da execução.
              </p>
              <Separator />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar profile={ownerProfile} size={9} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {ownerProfile?.display_name ?? "Dono"}
                </p>
                <p className="text-xs text-muted-foreground">Dono do briefing</p>
              </div>
              <Badge variant="secondary">Dono</Badge>
            </div>

            {detail.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar profile={m.profile} size={9} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.profile?.display_name ?? "Usuário"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {MEMBER_ROLE_LABELS[m.role]}
                    {detail.briefing.approver_id === m.user_id && " · Aprovador"}
                  </p>
                </div>
                {isOwner ? (
                  <div className="flex items-center gap-1">
                    <Select
                      value={m.role}
                      onValueChange={async (v) => {
                        try {
                          await briefingProService.updateMemberRole(m.id, v);
                          onChanged();
                        } catch {
                          toast.error("Erro ao mudar o papel");
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-[120px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      title="Remover do briefing"
                      onClick={() =>
                        askConfirm({
                          title: `Remover ${m.profile?.display_name ?? "este membro"} do briefing?`,
                          description: "A pessoa perde o acesso e deixa de receber as notificações deste briefing.",
                          confirmLabel: "Remover",
                          destructive: true,
                          onConfirm: async () => {
                            try {
                              await briefingProService.removeMember(m.id);
                              toast.success("Membro removido");
                              await onChanged();
                            } catch {
                              toast.error("Erro ao remover");
                            }
                          },
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : m.user_id === userId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      askConfirm({
                        title: "Sair deste briefing?",
                        description: "Você perde o acesso; o dono pode te adicionar de novo depois.",
                        confirmLabel: "Sair do briefing",
                        destructive: true,
                        onConfirm: async () => {
                          try {
                            await briefingProService.removeMember(m.id);
                            toast.success("Você saiu do briefing");
                            window.location.href = "/dashboard/briefing-pro";
                          } catch {
                            toast.error("Erro ao sair");
                          }
                        },
                      })
                    }
                  >
                    Sair
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
      {confirmDialog}
    </Sheet>
  );
}
