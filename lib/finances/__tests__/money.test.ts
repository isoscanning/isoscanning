import { addDaysIso, currencyToNumber, formatCurrencyDigits, isoToBR, todayLocalIso } from "../money";

describe("money (financeiro)", () => {
  it("máscara de centavos formata o que foi digitado", () => {
    expect(formatCurrencyDigits("150050")).toBe("1.500,50");
    expect(formatCurrencyDigits("5")).toBe("0,05");
    expect(formatCurrencyDigits("")).toBe("");
  });

  it("aceita os formatos que um brasileiro cola no campo", () => {
    expect(currencyToNumber("1.500,50")).toBe(1500.5);
    expect(currencyToNumber("R$ 1.500,00")).toBe(1500);
    expect(currencyToNumber("1500.50")).toBe(1500.5);
    expect(currencyToNumber("")).toBeNull();
  });

  it("data padrão usa o dia local, não o UTC (A3)", () => {
    // 22h30 de 04/09 em Brasília = 01h30 UTC de 05/09
    const late = new Date(2026, 8, 4, 22, 30);
    expect(todayLocalIso(late)).toBe("2026-09-04");
  });

  it("converte AAAA-MM-DD para dd/mm/aaaa sem fuso", () => {
    expect(isoToBR("2026-09-04")).toBe("04/09/2026");
    expect(isoToBR("2026-09-04T00:00:00.000Z")).toBe("04/09/2026");
    expect(isoToBR(null)).toBe("");
  });

  it("soma dias sem passar por fuso", () => {
    expect(addDaysIso("2026-01-30", 3)).toBe("2026-02-02");
  });
});
