import { describeWindows, formatWeeklyPattern } from "@/lib/availability";

describe("formatWeeklyPattern", () => {
  it("agrupa dias consecutivos com o mesmo horário", () => {
    expect(
      formatWeeklyPattern([
        { weekday: 1, windows: [{ start: "09:00", end: "18:00" }] },
        { weekday: 2, windows: [{ start: "09:00", end: "18:00" }] },
        { weekday: 3, windows: [{ start: "09:00", end: "18:00" }] },
        { weekday: 4, windows: [{ start: "09:00", end: "18:00" }] },
        { weekday: 5, windows: [{ start: "09:00", end: "18:00" }] },
        { weekday: 6, windows: [{ start: "09:00", end: "12:00" }] },
      ])
    ).toBe("Seg a Sex 09:00–18:00 · Sáb 09:00–12:00");
  });

  it("usa 'e' para dois dias e lista várias janelas", () => {
    expect(
      formatWeeklyPattern([
        { weekday: 2, windows: [{ start: "08:00", end: "12:00" }, { start: "14:00", end: "18:00" }] },
        { weekday: 3, windows: [{ start: "08:00", end: "12:00" }, { start: "14:00", end: "18:00" }] },
        { weekday: 0, windows: [{ start: "00:00", end: "24:00" }] },
      ])
    ).toBe("Dom dia inteiro · Ter e Qua 08:00–12:00 e 14:00–18:00");
  });

  it("não agrupa quando o horário muda, mesmo em dias consecutivos", () => {
    expect(
      formatWeeklyPattern([
        { weekday: 1, windows: [{ start: "09:00", end: "18:00" }] },
        { weekday: 2, windows: [{ start: "10:00", end: "18:00" }] },
      ])
    ).toBe("Seg 09:00–18:00 · Ter 10:00–18:00");
  });

  it("devolve vazio sem dias", () => {
    expect(formatWeeklyPattern([])).toBe("");
    expect(formatWeeklyPattern([{ weekday: 1, windows: [] }])).toBe("");
  });

  it("describeWindows normaliza fim de dia", () => {
    expect(describeWindows([{ start: "09:00", end: "24:00" }])).toBe("09:00–23:59");
    expect(describeWindows([{ start: "00:00", end: "23:59" }])).toBe("dia inteiro");
  });
});
