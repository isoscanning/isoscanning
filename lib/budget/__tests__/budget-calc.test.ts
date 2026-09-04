import fs from "fs";
import path from "path";
import {
  applyBRLMask,
  computeClientLineItems,
  computeCostBreakdown,
  computeFinalPrice,
  formatDateOnly,
  parseBRL,
  quoteDisplayStatus,
  toBRLMask,
  type CalculatorInput,
} from "../budget-calc";

const base: CalculatorInput = {
  coverageHours: 8,
  hourlyRate: 100,
  jobsPerMonth: 4,
  accommodation: { enabled: false },
  food: { enabled: false },
  additionalStaff: { enabled: false, members: [] },
  transport: { type: "none" },
  extraCosts: [],
  equipmentCostPerJob: 50,
  softwareMonthlyCost: 200,
  infrastructureMonthlyCost: 400,
};

/**
 * O cálculo é espelhado do backend. Este teste falha quando a regra de um
 * lado muda sem o outro (compara as funções-chave por texto). Pula se o
 * repositório do backend não estiver ao lado.
 */
const BACKEND_CALC = path.resolve(
  __dirname,
  "../../../../isoscanning-backend/src/modules/budget-quote/domain/budget-quote.calculator.ts"
);

/** Corpo da função sem comentários de linha e com espaços normalizados. */
function extractFn(src: string, name: string): string | null {
  const start = src.indexOf(`export function ${name}(`);
  if (start === -1) return null;
  const end = src.indexOf("\n}\n", start);
  return src
    .slice(start, end)
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

describe("budget-calc (espelho do backend)", () => {
  it("as funções de cálculo são idênticas às do backend", () => {
    if (!fs.existsSync(BACKEND_CALC)) {
      console.warn("backend não encontrado ao lado — comparação pulada");
      return;
    }
    const backend = fs.readFileSync(BACKEND_CALC, "utf-8");
    const front = fs.readFileSync(path.resolve(__dirname, "../budget-calc.ts"), "utf-8");
    for (const fn of ["computeCostBreakdown", "computeFinalPrice", "computeProfit", "computeClientLineItems", "legCost"]) {
      const b = extractFn(backend, fn);
      const f = extractFn(front, fn);
      // legCost é interna no backend (function legCost) — compara só quando exportada dos dois lados
      if (b === null || f === null) continue;
      expect(f).toBe(b);
    }
  });

  it("calcula mão de obra + rateio mensal", () => {
    const b = computeCostBreakdown(base);
    expect(b.labor).toBe(800);
    expect(b.software).toBe(50);
    expect(b.infrastructure).toBe(100);
    expect(b.total).toBe(1000);
  });

  it("ida e volta só dobra veículo próprio", () => {
    expect(computeCostBreakdown({ ...base, transport: { type: "own_vehicle", fuelCost: 100, tollCost: 20, roundTrip: true } }).transport).toBe(240);
    expect(computeCostBreakdown({ ...base, transport: { type: "air", cost: 900, roundTrip: true } }).transport).toBe(900);
  });

  it("equipe: hospedagem individual ignora membro removido", () => {
    const b = computeCostBreakdown({
      ...base,
      additionalStaff: {
        enabled: true,
        members: [{ id: "a", hourlyRate: 50, coverageHours: 8 }],
        teamAccommodation: { enabled: true, mode: "individual", individual: [{ memberId: "a", dailyRate: 100, days: 2 }, { memberId: "x", dailyRate: 999, days: 9 }] },
        teamFood: { enabled: true, mode: "same", same: { costPerMeal: 30, meals: 2 } },
      },
    });
    expect(b.staffLabor).toBe(400);
    expect(b.staffAccommodation).toBe(200);
    expect(b.staffFood).toBe(60);
  });

  it("preço = custo × (1 + margem) − desconto, nunca negativo; itens do cliente fecham no preço", () => {
    expect(computeFinalPrice(1000, 30, 100)).toBe(1200);
    expect(computeFinalPrice(100, 0, 500)).toBe(0);
    const b = computeCostBreakdown({ ...base, extraCosts: [{ name: "x", value: 33.33 }] });
    const price = computeFinalPrice(b.total, 25, 0);
    const items = computeClientLineItems(b, price);
    expect(Math.round(items.reduce((s, i) => s + i.amount, 0) * 100) / 100).toBe(price);
  });

  it("máscara e parse de moeda são inversos", () => {
    expect(applyBRLMask("123456")).toBe("1.234,56");
    expect(parseBRL("1.234,56")).toBe(1234.56);
    expect(parseBRL("1234.56")).toBe(1234.56);
    expect(toBRLMask(1234.56)).toBe("1.234,56");
    expect(toBRLMask(0)).toBe("");
  });

  it("data só-dia não sofre fuso", () => {
    expect(formatDateOnly("2026-09-10")).toBe("10/09/2026");
    expect(formatDateOnly("2026-09-10T00:00:00.000Z")).toBe("10/09/2026");
  });

  it("status de tela deriva expirada/visualizada/contratada", () => {
    expect(quoteDisplayStatus({ status: "sent", isExpired: false, viewCount: 0, contract: null })).toBe("sent");
    expect(quoteDisplayStatus({ status: "sent", isExpired: false, viewCount: 2, contract: null })).toBe("viewed");
    expect(quoteDisplayStatus({ status: "sent", isExpired: true, viewCount: 2, contract: null })).toBe("expired");
    expect(quoteDisplayStatus({ status: "approved", isExpired: false, viewCount: 1, contract: { id: "c", status: "sent" } })).toBe("contracted");
    expect(quoteDisplayStatus({ status: "approved", isExpired: false, viewCount: 1, contract: { id: "c", status: "cancelled" } })).toBe("approved");
  });
});
