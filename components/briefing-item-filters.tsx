"use client";

// Barra de filtros dos itens do Briefing Pro: chips por tipo (foto, vídeo,
// drone...), seletor de pessoa e "só pendentes". Usada na edição do briefing
// e no Dia de Execução; o filtro fica salvo por briefing no navegador.

import { useCallback, useEffect, useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Camera, Coffee, Filter, ListChecks, Package, Plane, StickyNote, Video, X,
} from "lucide-react";
import {
  BriefingItemFilter,
  EMPTY_ITEM_FILTER,
  countItemTypes,
  isItemFilterActive,
  readStoredItemFilter,
  writeStoredItemFilter,
} from "@/lib/briefing-pro-filters";
import { ITEM_TYPE_LABELS, ItemType, ProfileSummary } from "@/lib/briefing-pro-types";

const TYPE_ICONS: Record<ItemType, ComponentType<{ className?: string }>> = {
  photo: Camera,
  video: Video,
  drone: Plane,
  task: ListChecks,
  material: Package,
  note: StickyNote,
  break: Coffee,
};

/** Estado do filtro persistido por briefing (carrega após montar — evita hidratação divergente). */
export function useBriefingItemFilter(briefingId: string) {
  const [filter, setFilterState] = useState<BriefingItemFilter>(EMPTY_ITEM_FILTER);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setFilterState(readStoredItemFilter(briefingId) ?? EMPTY_ITEM_FILTER);
    setReady(true);
  }, [briefingId]);

  const setFilter = useCallback(
    (next: BriefingItemFilter) => {
      setFilterState(next);
      writeStoredItemFilter(briefingId, next);
    },
    [briefingId]
  );

  return { filter, setFilter, ready, active: isItemFilterActive(filter) };
}

function Chip({
  active, onClick, children, title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 h-7 rounded-full border px-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function BriefingItemFilters({
  filter, onChange, items, people, userId, showPendingToggle = false,
  visibleCount, totalCount, className,
}: {
  filter: BriefingItemFilter;
  onChange: (next: BriefingItemFilter) => void;
  /** Todos os itens do briefing (sem filtro) — define quais chips aparecem. */
  items: Array<{ id: string; item_type: ItemType; assigned_to: string | null; status: "pending" | "in_progress" | "done" | "skipped" }>;
  people: Array<{ id: string; profile: ProfileSummary | null }>;
  userId?: string | null;
  showPendingToggle?: boolean;
  visibleCount: number;
  totalCount: number;
  className?: string;
}) {
  const typeCounts = countItemTypes(items);
  const showTypes = typeCounts.length > 1;
  const showPeople = people.length > 1 || items.some((i) => i.assigned_to);
  const active = isItemFilterActive(filter);

  if (!showTypes && !showPeople && !showPendingToggle) return null;

  const toggleType = (type: ItemType) => {
    const types = filter.types.includes(type)
      ? filter.types.filter((t) => t !== type)
      : [...filter.types, type];
    onChange({ ...filter, types });
  };

  return (
    <div className={`rounded-lg border bg-muted/30 px-3 py-2 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground mr-1">
          <Filter className="h-3.5 w-3.5" />
          Filtrar
        </span>

        {showTypes &&
          typeCounts.map(({ type, count }) => {
            const Icon = TYPE_ICONS[type];
            return (
              <Chip
                key={type}
                active={filter.types.includes(type)}
                onClick={() => toggleType(type)}
                title={`Só itens do tipo ${ITEM_TYPE_LABELS[type]}`}
              >
                <Icon className="h-3 w-3" />
                {ITEM_TYPE_LABELS[type]}
                <span className="opacity-70">{count}</span>
              </Chip>
            );
          })}

        {showPendingToggle && (
          <Chip
            active={filter.onlyPending}
            onClick={() => onChange({ ...filter, onlyPending: !filter.onlyPending })}
            title="Esconder itens já concluídos ou pulados"
          >
            Só pendentes
          </Chip>
        )}

        {showPeople && (
          <Select
            value={filter.person}
            onValueChange={(v) => onChange({ ...filter, person: v })}
          >
            <SelectTrigger
              className={`h-7 w-auto min-w-0 max-w-[180px] rounded-full text-xs px-2.5 gap-1 ${
                filter.person !== "all" ? "border-primary text-foreground" : "text-muted-foreground"
              }`}
              aria-label="Filtrar por pessoa"
            >
              <SelectValue placeholder="Pessoa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as pessoas</SelectItem>
              {userId && <SelectItem value="me">Meus itens</SelectItem>}
              <SelectItem value="unassigned">Sem responsável</SelectItem>
              {people
                .filter((p) => p.id !== userId)
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.profile?.display_name ?? "Usuário"}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}

        {active && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-muted-foreground"
            onClick={() => onChange(EMPTY_ITEM_FILTER)}
          >
            <X className="h-3 w-3" />
            Limpar
          </Button>
        )}
      </div>
      {active && (
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Mostrando {visibleCount} de {totalCount} {totalCount === 1 ? "item" : "itens"}
          {visibleCount === 0 ? " — nenhum item corresponde ao filtro." : "."}
        </p>
      )}
    </div>
  );
}
