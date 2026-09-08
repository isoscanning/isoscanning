/**
 * @jest-environment node
 */
import {
  EMPTY_ITEM_FILTER,
  countItemTypes,
  filterSections,
  firstPendingItemId,
  isItemFilterActive,
  matchesItemFilter,
} from "../briefing-pro-filters";
import { effectiveCrewIds, myCrewIds } from "../briefing-pro-crew";
import type { ItemStatus, ItemType } from "../briefing-pro-types";

function item(
  id: string,
  overrides: Partial<{ item_type: ItemType; crew_ids: string[]; status: ItemStatus }> = {}
) {
  return {
    id,
    item_type: overrides.item_type ?? ("task" as ItemType),
    crew_ids: overrides.crew_ids ?? [],
    status: overrides.status ?? ("pending" as ItemStatus),
  };
}

// Equipe: ana (Foto), bia (Drone). A seção s2 é da ana; o item "e" não tem ninguém → herda.
const sections = [
  {
    id: "s1",
    crew_ids: [],
    items: [
      item("a", { item_type: "photo", crew_ids: ["ana"], status: "done" }),
      item("b", { item_type: "video", crew_ids: ["bia"] }),
      item("c", { item_type: "drone" }),
    ],
  },
  {
    id: "s2",
    crew_ids: ["ana"],
    items: [
      item("d", { item_type: "photo", crew_ids: ["bia"], status: "skipped" }),
      item("e", { item_type: "task" }),
    ],
  },
];

const noCtx = { sectionCrewIds: [] as string[], myCrewIds: [] as string[] };

describe("isItemFilterActive", () => {
  it("vazio não é ativo; qualquer critério ativa", () => {
    expect(isItemFilterActive(EMPTY_ITEM_FILTER)).toBe(false);
    expect(isItemFilterActive({ ...EMPTY_ITEM_FILTER, types: ["photo"] })).toBe(true);
    expect(isItemFilterActive({ ...EMPTY_ITEM_FILTER, person: "me" })).toBe(true);
    expect(isItemFilterActive({ ...EMPTY_ITEM_FILTER, onlyPending: true })).toBe(true);
  });
});

describe("effectiveCrewIds", () => {
  it("atribuição própria vence; sem ela herda a seção", () => {
    expect(effectiveCrewIds({ crew_ids: ["x"] }, { crew_ids: ["y"] })).toEqual({ ids: ["x"], inherited: false });
    expect(effectiveCrewIds({ crew_ids: [] }, { crew_ids: ["y"] })).toEqual({ ids: ["y"], inherited: true });
    expect(effectiveCrewIds({ crew_ids: [] }, { crew_ids: [] })).toEqual({ ids: [], inherited: false });
  });
});

describe("myCrewIds", () => {
  it("devolve as pessoas da equipe vinculadas ao usuário", () => {
    const crew = [
      { id: "ana", user_id: "u1" },
      { id: "bia", user_id: null },
      { id: "carla", user_id: "u1" },
    ];
    expect(myCrewIds(crew, "u1")).toEqual(["ana", "carla"]);
    expect(myCrewIds(crew, "u2")).toEqual([]);
    expect(myCrewIds(crew, null)).toEqual([]);
  });
});

describe("matchesItemFilter", () => {
  it("filtra por tipo (vários tipos = OU)", () => {
    const f = { ...EMPTY_ITEM_FILTER, types: ["photo", "drone"] as ItemType[] };
    expect(matchesItemFilter(item("x", { item_type: "photo" }), f, noCtx)).toBe(true);
    expect(matchesItemFilter(item("x", { item_type: "drone" }), f, noCtx)).toBe(true);
    expect(matchesItemFilter(item("x", { item_type: "video" }), f, noCtx)).toBe(false);
  });

  it("filtra por pessoa da equipe, inclusive herdada da seção", () => {
    const own = item("x", { crew_ids: ["ana"] });
    const inherits = item("y");
    const ctx = { sectionCrewIds: ["bia"], myCrewIds: [] };
    expect(matchesItemFilter(own, { ...EMPTY_ITEM_FILTER, person: "ana" }, ctx)).toBe(true);
    expect(matchesItemFilter(own, { ...EMPTY_ITEM_FILTER, person: "bia" }, ctx)).toBe(false);
    expect(matchesItemFilter(inherits, { ...EMPTY_ITEM_FILTER, person: "bia" }, ctx)).toBe(true);
  });

  it("me = qualquer pessoa da equipe vinculada a mim; unassigned = ninguém nem herdado", () => {
    const own = item("x", { crew_ids: ["ana"] });
    const nobody = item("y");
    expect(matchesItemFilter(own, { ...EMPTY_ITEM_FILTER, person: "me" }, { sectionCrewIds: [], myCrewIds: ["ana"] })).toBe(true);
    expect(matchesItemFilter(own, { ...EMPTY_ITEM_FILTER, person: "me" }, { sectionCrewIds: [], myCrewIds: ["bia"] })).toBe(false);
    expect(matchesItemFilter(nobody, { ...EMPTY_ITEM_FILTER, person: "me" }, { sectionCrewIds: ["ana"], myCrewIds: ["ana"] })).toBe(true);
    expect(matchesItemFilter(nobody, { ...EMPTY_ITEM_FILTER, person: "unassigned" }, noCtx)).toBe(true);
    expect(matchesItemFilter(nobody, { ...EMPTY_ITEM_FILTER, person: "unassigned" }, { sectionCrewIds: ["ana"], myCrewIds: [] })).toBe(false);
    expect(matchesItemFilter(own, { ...EMPTY_ITEM_FILTER, person: "unassigned" }, noCtx)).toBe(false);
  });

  it("só pendentes esconde feitos e pulados, mantém em andamento", () => {
    const f = { ...EMPTY_ITEM_FILTER, onlyPending: true };
    expect(matchesItemFilter(item("x", { status: "done" }), f, noCtx)).toBe(false);
    expect(matchesItemFilter(item("x", { status: "skipped" }), f, noCtx)).toBe(false);
    expect(matchesItemFilter(item("x", { status: "in_progress" }), f, noCtx)).toBe(true);
    expect(matchesItemFilter(item("x", { status: "pending" }), f, noCtx)).toBe(true);
  });

  it("critérios se combinam com E", () => {
    const f = { ...EMPTY_ITEM_FILTER, types: ["photo"] as ItemType[], person: "ana", onlyPending: true };
    expect(matchesItemFilter(item("x", { item_type: "photo", crew_ids: ["ana"] }), f, noCtx)).toBe(true);
    expect(matchesItemFilter(item("x", { item_type: "photo", crew_ids: ["ana"], status: "done" }), f, noCtx)).toBe(false);
    expect(matchesItemFilter(item("x", { item_type: "video", crew_ids: ["ana"] }), f, noCtx)).toBe(false);
  });
});

describe("filterSections", () => {
  it("sem filtro devolve a mesma referência", () => {
    expect(filterSections(sections, EMPTY_ITEM_FILTER)).toBe(sections);
  });

  it("remove seções que ficaram vazias", () => {
    const out = filterSections(sections, { ...EMPTY_ITEM_FILTER, types: ["drone"] });
    expect(out.map((s) => s.id)).toEqual(["s1"]);
    expect(out[0].items.map((i) => i.id)).toEqual(["c"]);
  });

  it("pessoa + só pendentes, com herança da seção", () => {
    // ana: item "a" (feito) e "e" (herdado da seção s2, pendente)
    const out = filterSections(sections, { ...EMPTY_ITEM_FILTER, person: "ana", onlyPending: true });
    expect(out.map((s) => s.id)).toEqual(["s2"]);
    expect(out[0].items.map((i) => i.id)).toEqual(["e"]);
  });

  it("meus itens usa os ids vinculados ao usuário", () => {
    const out = filterSections(sections, { ...EMPTY_ITEM_FILTER, person: "me" }, ["bia"]);
    expect(out.flatMap((s) => s.items.map((i) => i.id))).toEqual(["b", "d"]);
  });
});

describe("firstPendingItemId", () => {
  it("acha o primeiro não feito na ordem das seções", () => {
    expect(firstPendingItemId(sections)).toBe("b");
  });

  it("ignora feitos e pulados; null quando tudo está concluído", () => {
    const allDone = [{ items: [item("a", { status: "done" }), item("b", { status: "skipped" })] }];
    expect(firstPendingItemId(allDone)).toBeNull();
    expect(firstPendingItemId([])).toBeNull();
  });
});

describe("countItemTypes", () => {
  it("lista só os tipos presentes, na ordem canônica, com contagem", () => {
    const all = sections.flatMap((s) => s.items);
    expect(countItemTypes(all)).toEqual([
      { type: "photo", count: 2 },
      { type: "video", count: 1 },
      { type: "drone", count: 1 },
      { type: "task", count: 1 },
    ]);
  });
});
