// Filtros de itens do Briefing Pro (edição e Dia de Execução): por tipo
// (foto, vídeo, drone...), por pessoa da equipe (quem faz) e "só pendentes".
// Funções puras — a persistência (localStorage) e a UI ficam em
// components/briefing-item-filters.tsx.

import { effectiveCrewIds } from "./briefing-pro-crew";
import { ItemStatus, ItemType } from "./briefing-pro-types";

/**
 * "all" = todos; "me" = itens de pessoas da equipe vinculadas a mim;
 * "unassigned" = sem ninguém (nem herdado da seção); senão = id da pessoa da equipe.
 */
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
  status: ItemStatus;
  crew_ids: string[];
};

type FilterableSection<I extends FilterableItem> = {
  crew_ids: string[];
  items: I[];
};

export interface PersonFilterContext {
  /** Quem cuida da seção do item (herança quando o item não tem ninguém). */
  sectionCrewIds: string[];
  /** Ids da equipe vinculados ao usuário logado. */
  myCrewIds: string[];
}

export function isItemFilterActive(filter: BriefingItemFilter): boolean {
  return filter.types.length > 0 || filter.person !== "all" || filter.onlyPending;
}

export function isPendingStatus(status: ItemStatus): boolean {
  return status === "pending" || status === "in_progress";
}

export function matchesItemFilter(
  item: FilterableItem,
  filter: BriefingItemFilter,
  ctx: PersonFilterContext
): boolean {
  if (filter.types.length > 0 && !filter.types.includes(item.item_type)) return false;
  if (filter.onlyPending && !isPendingStatus(item.status)) return false;
  if (filter.person === "all") return true;
  const { ids } = effectiveCrewIds(item, { crew_ids: ctx.sectionCrewIds });
  switch (filter.person) {
    case "unassigned":
      return ids.length === 0;
    case "me":
      return ctx.myCrewIds.some((id) => ids.includes(id));
    default:
      return ids.includes(filter.person);
  }
}

/**
 * Aplica o filtro às seções. Com filtro ativo, seções sem itens
 * correspondentes somem; sem filtro, devolve as seções como estão.
 */
export function filterSections<I extends FilterableItem, S extends FilterableSection<I>>(
  sections: S[],
  filter: BriefingItemFilter,
  myCrewIds: string[] = []
): S[] {
  if (!isItemFilterActive(filter)) return sections;
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        matchesItemFilter(item, filter, { sectionCrewIds: section.crew_ids, myCrewIds })
      ),
    }))
    .filter((section) => section.items.length > 0);
}

/** Primeiro item ainda não feito (nem pulado), na ordem das seções e posições. */
export function firstPendingItemId<I extends { id: string; status: ItemStatus }>(
  sections: Array<{ items: I[] }>
): string | null {
  for (const section of sections) {
    const item = section.items.find((i) => isPendingStatus(i.status));
    if (item) return item.id;
  }
  return null;
}

/** Tipos presentes entre os itens, na ordem canônica, com contagem. */
export function countItemTypes<I extends { item_type: ItemType }>(
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
