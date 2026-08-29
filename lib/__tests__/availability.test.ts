import {
  availableDateKeys,
  describeSlot,
  formatSlotTime,
  isAllDaySlot,
  parseDateKey,
  slotsForDate,
  toDateKey,
} from "../availability";
import type { AvailabilitySlot } from "../data-service";

function slot(partial: Partial<AvailabilitySlot>): AvailabilitySlot {
  return {
    id: partial.id ?? "id-1",
    professionalId: "prof-1",
    date: partial.date ?? "2026-09-15",
    startTime: partial.startTime ?? "09:00:00",
    endTime: partial.endTime ?? "18:00:00",
    createdAt: new Date(),
    ...partial,
  } as AvailabilitySlot;
}

describe("formatSlotTime", () => {
  // O Postgres devolve `time without time zone` como "HH:MM:SS".
  it("corta os segundos que o banco devolve", () => {
    expect(formatSlotTime("09:00:00")).toBe("09:00");
    expect(formatSlotTime("23:59:00")).toBe("23:59");
  });

  it("aceita o formato curto sem alterar", () => {
    expect(formatSlotTime("09:00")).toBe("09:00");
  });

  it("normaliza hora com um dígito", () => {
    expect(formatSlotTime("9:05")).toBe("09:05");
  });

  it("devolve string vazia para valor ausente", () => {
    expect(formatSlotTime(null)).toBe("");
    expect(formatSlotTime(undefined)).toBe("");
  });
});

describe("isAllDaySlot", () => {
  it("reconhece dia inteiro no formato do banco", () => {
    expect(isAllDaySlot({ startTime: "00:00:00", endTime: "23:59:00" })).toBe(true);
  });

  it("reconhece dia inteiro no formato curto", () => {
    expect(isAllDaySlot({ startTime: "00:00", endTime: "23:59" })).toBe(true);
  });

  it("não confunde janela normal com dia inteiro", () => {
    expect(isAllDaySlot({ startTime: "09:00:00", endTime: "18:00:00" })).toBe(false);
  });
});

describe("describeSlot", () => {
  it("descreve dia inteiro", () => {
    expect(describeSlot({ startTime: "00:00:00", endTime: "23:59:00" })).toBe("Dia inteiro");
  });

  it("descreve janela sem os segundos", () => {
    expect(describeSlot({ startTime: "09:00:00", endTime: "18:00:00" })).toBe("09:00 - 18:00");
  });
});

describe("toDateKey / parseDateKey", () => {
  // Regressão: new Date("2026-09-15") é meia-noite UTC e, em UTC-3, volta
  // para 14/09. O par toDateKey/parseDateKey tem que ser estável.
  it("faz ida e volta sem trocar o dia", () => {
    expect(toDateKey(parseDateKey("2026-09-15"))).toBe("2026-09-15");
    expect(toDateKey(parseDateKey("2026-01-01"))).toBe("2026-01-01");
    expect(toDateKey(parseDateKey("2026-12-31"))).toBe("2026-12-31");
  });

  it("aceita ISO completo vindo do backend", () => {
    expect(toDateKey(parseDateKey("2026-09-15T00:00:00.000Z"))).toBe("2026-09-15");
  });

  it("usa os componentes locais da data", () => {
    const d = new Date(2026, 8, 15, 23, 30);
    expect(toDateKey(d)).toBe("2026-09-15");
  });
});

describe("slotsForDate", () => {
  const slots = [
    slot({ id: "a", date: "2026-09-15", startTime: "14:00:00", endTime: "18:00:00" }),
    slot({ id: "b", date: "2026-09-15", startTime: "09:00:00", endTime: "12:00:00" }),
    slot({ id: "c", date: "2026-09-16" }),
  ];

  it("devolve todos os slots do dia, ordenados", () => {
    const found = slotsForDate(slots, "2026-09-15");
    expect(found.map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("aceita Date sem escorregar de fuso", () => {
    const found = slotsForDate(slots, new Date(2026, 8, 15, 23, 0));
    expect(found).toHaveLength(2);
  });

  it("devolve vazio para dia sem slot", () => {
    expect(slotsForDate(slots, "2026-09-20")).toEqual([]);
  });
});

describe("availableDateKeys", () => {
  it("agrupa as datas distintas", () => {
    const keys = availableDateKeys([
      slot({ id: "a", date: "2026-09-15" }),
      slot({ id: "b", date: "2026-09-15" }),
      slot({ id: "c", date: "2026-09-16T00:00:00.000Z" }),
    ]);
    expect([...keys].sort()).toEqual(["2026-09-15", "2026-09-16"]);
  });
});
