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
import type { ItemStatus, ItemType } from "../briefing-pro-types";

function item(
  id: string,
  overrides: Partial<{ item_type: ItemType; assigned_to: string | null; status: ItemStatus }> = {}
) {
  return {
    id,
    item_type: overrides.item_type ?? ("task" as ItemType),
    assigned_to: overrides.assigned_to ?? null,
    status: overrides.status ?? ("pending" as ItemStatus),
  };
}

const sections = [
  {
    id: "s1",
    items: [
      item("a", { item_type: "photo", assigned_to: "ana", status: "done" }),
      item("b", { item_type: "video", assigned_to: "bia" }),
      item("c", { item_type: "drone" }),
    ],
  },
  {
    id: "s2",
    items: [
      item("d", { item_type: "photo", assigned_to: "ana", status: "skipped" }),
      item("e", { item_type: "task", assigned_to: "ana" }),
    ],
  },
];

describe("isItemFilterActive", () => {
  it("vazio não é ativo; qualquer critério ativa", () => {
    expect(isItemFilterActive(EMPTY_ITEM_FILTER)).toBe(false);
    expect(isItemFilterActive({ ...EMPTY_ITEM_FILTER, types: ["photo"] })).toBe(true);
    expect(isItemFilterActive({ ...EMPTY_ITEM_FILTER, person: "me" })).toBe(true);
    expect(isItemFilterActive({ ...EMPTY_ITEM_FILTER, onlyPending: true })).toBe(true);
  });
});

describe("matchesItemFilter", () => {
  it("filtra por tipo (vários tipos = OU)", () => {
    const f = { ...EMPTY_ITEM_FILTER, types: ["photo", "drone"] as ItemType[] };
    expect(matchesItemFilter(item("x", { item_type: "photo" }), f)).toBe(true);
    expect(matchesItemFilter(item("x", { item_type: "drone" }), f)).toBe(true);
    expect(matchesItemFilter(item("x", { item_type: "video" }), f)).toBe(false);
  });

  it("filtra por pessoa: me / unassigned / id", () => {
    const me = item("x", { assigned_to: "ana" });
    const nobody = item("y");
    expect(matchesItemFilter(me, { ...EMPTY_ITEM_FILTER, person: "me" }, "ana")).toBe(true);
    expect(matchesItemFilter(me, { ...EMPTY_ITEM_FILTER, person: "me" }, "bia")).toBe(false);
    expect(matchesItemFilter(me, { ...EMPTY_ITEM_FILTER, person: "me" }, null)).toBe(false);
    expect(matchesItemFilter(nobody, { ...EMPTY_ITEM_FILTER, person: "unassigned" })).toBe(true);
    expect(matchesItemFilter(me, { ...EMPTY_ITEM_FILTER, person: "unassigned" })).toBe(false);
    expect(matchesItemFilter(me, { ...EMPTY_ITEM_FILTER, person: "ana" })).toBe(true);
    expect(matchesItemFilter(me, { ...EMPTY_ITEM_FILTER, person: "bia" })).toBe(false);
  });

  it("só pendentes esconde feitos e pulados, mantém em andamento", () => {
    const f = { ...EMPTY_ITEM_FILTER, onlyPending: true };
    expect(matchesItemFilter(item("x", { status: "done" }), f)).toBe(false);
    expect(matchesItemFilter(item("x", { status: "skipped" }), f)).toBe(false);
    expect(matchesItemFilter(item("x", { status: "in_progress" }), f)).toBe(true);
    expect(matchesItemFilter(item("x", { status: "pending" }), f)).toBe(true);
  });

  it("critérios se combinam com E", () => {
    const f = { ...EMPTY_ITEM_FILTER, types: ["photo"] as ItemType[], person: "ana", onlyPending: true };
    expect(matchesItemFilter(item("x", { item_type: "photo", assigned_to: "ana" }), f)).toBe(true);
    expect(matchesItemFilter(item("x", { item_type: "photo", assigned_to: "ana", status: "done" }), f)).toBe(false);
    expect(matchesItemFilter(item("x", { item_type: "video", assigned_to: "ana" }), f)).toBe(false);
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

  it("pessoa + só pendentes", () => {
    const out = filterSections(sections, { ...EMPTY_ITEM_FILTER, person: "ana", onlyPending: true });
    expect(out.map((s) => s.id)).toEqual(["s2"]);
    expect(out[0].items.map((i) => i.id)).toEqual(["e"]);
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
