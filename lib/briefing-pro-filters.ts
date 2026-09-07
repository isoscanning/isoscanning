// Filtros de itens do Briefing Pro (edição e Dia de Execução): por tipo
// (foto, vídeo, drone...), por pessoa responsável e "só pendentes".
// Funções puras — a persistência (localStorage) e a UI ficam em
// components/briefing-item-filters.tsx.

import { ItemStatus, ItemType } from "./briefing-pro-types";

/** "all" = todos; "me" = meus itens; "unassigned" = sem responsável; senão = id do usuário. */
export type PersonFilter = "all" | "me" | "unassigned" | (string & {});

export interface BriefingItemFilter {
  /** Vazio = todos os tipos. */
  types: ItemType[];
  person: PersonFilter;
  /** Esconde itens concluídos e pulados. */
  onlyPending: boolean;
}

export const EMPTY_ITEM_FILTER: BriefingItemFilter = {
  types: [],
  person: "all",
  onlyPending: false,
};

/** Ordem canônica dos tipos nos chips de filtro. */
export const ITEM_TYPE_ORDER: ItemType[] = [
  "photo", "video", "drone", "task", "material", "note", "break",
];

type FilterableItem = {
  id: string;
  item_type: ItemType;
  assigned_to: string | null;
  status: ItemStatus;
};

export function isItemFilterActive(filter: BriefingItemFilter): boolean {
  return filter.types.length > 0 || filter.person !== "all" || filter.onlyPending;
}

export function isPendingStatus(status: ItemStatus): boolean {
  return status === "pending" || status === "in_progress";
}

export function matchesItemFilter(
  item: FilterableItem,
  filter: BriefingItemFilter,
  userId?: string | null
): boolean {
  if (filter.types.length > 0 && !filter.types.includes(item.item_type)) return false;
  if (filter.onlyPending && !isPendingStatus(item.status)) return false;
  switch (filter.person) {
    case "all":
      return true;
    case "unassigned":
      return !item.assigned_to;
    case "me":
      return Boolean(userId) && item.assigned_to === userId;
    default:
      return item.assigned_to === filter.person;
  }
}

/**
 * Aplica o filtro às seções. Com filtro ativo, seções sem itens
 * correspondentes somem; sem filtro, devolve as seções como estão.
 */
export function filterSections<I extends FilterableItem, S extends { items: I[] }>(
  sections: S[],
  filter: BriefingItemFilter,
  userId?: string | null
): S[] {
  if (!isItemFilterActive(filter)) return sections;
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => matchesItemFilter(item, filter, userId)),
    }))
    .filter((section) => section.items.length > 0);
}

/** Primeiro item ainda não feito (nem pulado), na ordem das seções e posições. */
export function firstPendingItemId<I extends FilterableItem>(
  sections: Array<{ items: I[] }>
): string | null {
  for (const section of sections) {
    const item = section.items.find((i) => isPendingStatus(i.status));
    if (item) return item.id;
  }
  return null;
}

/** Tipos presentes entre os itens, na ordem canônica, com contagem. */
export function countItemTypes<I extends FilterableItem>(
  items: I[]
): Array<{ type: ItemType; count: number }> {
  const counts = new Map<ItemType, number>();
  for (const item of items) counts.set(item.item_type, (counts.get(item.item_type) ?? 0) + 1);
  return ITEM_TYPE_ORDER.filter((t) => counts.has(t)).map((t) => ({
    type: t,
    count: counts.get(t) ?? 0,
  }));
}

// ─── Persistência por briefing (localStorage) ────────────────────────────────

const STORAGE_PREFIX = "briefing-pro:item-filter:";

export function readStoredItemFilter(briefingId: string): BriefingItemFilter | null {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_PREFIX + briefingId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BriefingItemFilter>;
    return {
      types: Array.isArray(parsed.types) ? (parsed.types as ItemType[]) : [],
      person: typeof parsed.person === "string" && parsed.person ? parsed.person : "all",
      onlyPending: parsed.onlyPending === true,
    };
  } catch {
    return null;
  }
}

export function writeStoredItemFilter(briefingId: string, filter: BriefingItemFilter): void {
  try {
    const key = STORAGE_PREFIX + briefingId;
    if (!isItemFilterActive(filter)) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, JSON.stringify(filter));
  } catch {
    // storage indisponível (modo privado, cota) — filtro só em memória
  }
}
