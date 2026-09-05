import {
    formatJobBudget,
    formatJobDate,
    formatJobDateRange,
    formatJobTime,
    formatJobTimeRange,
    isJobOpen,
    jobLocationLabel,
    jobStatusInfo,
    jobTypeLabel,
    positionsLabel,
    publishedAgo,
    toDateInputValue,
} from "../job-offer-display";

describe("job-offer-display", () => {
    it("formatJobDate não desloca o dia pelo fuso (meia-noite UTC → mesmo dia)", () => {
        // new Date("2026-09-10T00:00:00Z").toLocaleDateString() mostrava 09/09 no Brasil
        expect(formatJobDate("2026-09-10T00:00:00.000Z")).toBe("10/09/2026");
        expect(formatJobDate("2026-09-10")).toBe("10/09/2026");
        expect(formatJobDate(null)).toBe("");
    });

    it("formatJobDateRange colapsa datas iguais", () => {
        expect(formatJobDateRange("2026-09-10T00:00:00Z", "2026-09-10T00:00:00Z")).toBe("10/09/2026");
        expect(formatJobDateRange("2026-09-10T00:00:00Z", "2026-09-12T00:00:00Z")).toBe("10/09/2026 – 12/09/2026");
        expect(formatJobDateRange("2026-09-10T00:00:00Z", null)).toBe("10/09/2026");
        expect(formatJobDateRange(null, "2026-09-12T00:00:00Z")).toBeNull();
    });

    it("toDateInputValue devolve YYYY-MM-DD para o <input type=date>", () => {
        expect(toDateInputValue("2026-09-10T00:00:00.000Z")).toBe("2026-09-10");
        expect(toDateInputValue(undefined)).toBe("");
    });

    it("horários aceitam HH:MM:SS do Postgres", () => {
        expect(formatJobTime("19:00:00")).toBe("19:00");
        expect(formatJobTimeRange("19:00:00", "23:30")).toBe("19:00 – 23:30");
        expect(formatJobTimeRange("19:00", null)).toBe("a partir de 19:00");
        expect(formatJobTimeRange(null, "23:00")).toBe("até 23:00");
        expect(formatJobTimeRange(null, null)).toBeNull();
    });

    it("formatJobBudget cobre faixa, mínimo, máximo e ausência", () => {
        expect(formatJobBudget({ budgetMin: 1500, budgetMax: 2000 })).toMatch(/1\.500,00.*–.*2\.000,00/);
        expect(formatJobBudget({ budgetMin: 1500, budgetMax: 1500 })).toMatch(/^R\$\s?1\.500,00$/);
        expect(formatJobBudget({ budgetMin: 800 })).toMatch(/^A partir de/);
        expect(formatJobBudget({ budgetMax: 800 })).toMatch(/^Até/);
        expect(formatJobBudget({}, "A combinar")).toBe("A combinar");
    });

    it("jobLocationLabel combina local de execução com cidade/UF", () => {
        expect(jobLocationLabel({ locationType: "remote" })).toBe("Remoto");
        expect(jobLocationLabel({ locationType: "on_site", city: "São Paulo", state: "SP" })).toBe("São Paulo, SP");
        expect(jobLocationLabel({ locationType: "on_site", city: "São Paulo", state: "SP", venue: "Buffet Villa" })).toBe("Buffet Villa · São Paulo, SP");
        expect(jobLocationLabel({ locationType: "hybrid" })).toBe("Local a combinar");
    });

    it("jobStatusInfo normaliza status × isActive", () => {
        expect(jobStatusInfo({ status: "open", isActive: true }).label).toBe("Ativa");
        expect(jobStatusInfo({ status: "paused", isActive: false }).label).toBe("Pausada");
        expect(jobStatusInfo({ status: "closed", isActive: false }).label).toBe("Concluída");
        expect(jobStatusInfo({ status: "expired", isActive: false }).tone).toBe("destructive");
        // registro antigo sem status
        expect(jobStatusInfo({ isActive: false }).status).toBe("paused");
        expect(isJobOpen({ status: "open", isActive: true })).toBe(true);
        expect(isJobOpen({ status: "open", isActive: false })).toBe(false);
    });

    it("rótulos diversos", () => {
        expect(jobTypeLabel("full_time")).toBe("Tempo Integral");
        expect(jobTypeLabel("x")).toBe("x");
        expect(positionsLabel(1)).toBe("1 profissional");
        expect(positionsLabel(3)).toBe("3 profissionais");
        expect(positionsLabel(null)).toBe("1 profissional");
        const now = new Date("2026-09-04T12:00:00Z");
        expect(publishedAgo("2026-09-04T08:00:00Z", now)).toBe("Hoje");
        expect(publishedAgo("2026-09-03T08:00:00Z", now)).toBe("Há 1 dia");
        expect(publishedAgo("2026-08-30T08:00:00Z", now)).toBe("Há 5 dias");
    });
});
