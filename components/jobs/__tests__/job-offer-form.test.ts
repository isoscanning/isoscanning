import {
    EMPTY_JOB_OFFER_FORM,
    buildCreateJobOfferPayload,
    buildUpdateJobOfferPayload,
    jobOfferToFormValues,
    validateJobOfferForm,
    type JobOfferFormValues,
} from "../job-offer-form";
import type { JobOffer } from "@/lib/data-service";

const specialties = [
    { id: "s1", name: "Fotógrafo" },
    { id: "s2", name: "Videomaker" },
];

const valid: JobOfferFormValues = {
    ...EMPTY_JOB_OFFER_FORM,
    title: "Fotógrafo para casamento",
    description: "Cobertura completa da cerimônia e da festa, com edição.",
    specialtyId: "s1",
    startDate: "2099-01-10",
    endDate: "2099-01-11",
    budgetMin: "1500",
    budgetMax: "2000",
    positions: "2",
};

describe("validateJobOfferForm", () => {
    const today = "2026-09-04";

    it("aceita um formulário válido", () => {
        expect(validateJobOfferForm(valid, { rejectPastDates: true, today })).toBeNull();
    });

    it("exige título e descrição mínimos", () => {
        expect(validateJobOfferForm({ ...valid, title: "Foto" }, { rejectPastDates: true, today })).toMatch(/título/i);
        expect(validateJobOfferForm({ ...valid, description: "curta" }, { rejectPastDates: true, today })).toMatch(/descrição/i);
    });

    it("rejeita orçamento invertido e negativo, mas ignora com 'não informar'", () => {
        expect(validateJobOfferForm({ ...valid, budgetMin: "3000" }, { rejectPastDates: true, today })).toMatch(/mínimo/);
        expect(validateJobOfferForm({ ...valid, budgetMax: "-1" }, { rejectPastDates: true, today })).toMatch(/negativo/);
        expect(validateJobOfferForm({ ...valid, budgetMin: "3000", noBudget: true }, { rejectPastDates: true, today })).toBeNull();
    });

    it("valida ordem das datas e datas no passado só quando pedido", () => {
        expect(validateJobOfferForm({ ...valid, endDate: "2099-01-01" }, { rejectPastDates: true, today })).toMatch(/término/);
        expect(validateJobOfferForm({ ...valid, startDate: "", endDate: "2099-01-01" }, { rejectPastDates: true, today })).toMatch(/início/);
        const past = { ...valid, startDate: "2026-09-01", endDate: "2026-09-02" };
        expect(validateJobOfferForm(past, { rejectPastDates: true, today })).toMatch(/anterior à data atual/);
        expect(validateJobOfferForm(past, { rejectPastDates: false, today })).toBeNull();
        // hoje é permitido
        expect(validateJobOfferForm({ ...valid, startDate: today, endDate: today }, { rejectPastDates: true, today })).toBeNull();
    });

    it("valida quantidade de profissionais", () => {
        expect(validateJobOfferForm({ ...valid, positions: "0" }, { rejectPastDates: true, today })).toMatch(/profissionais/);
        expect(validateJobOfferForm({ ...valid, positions: "" }, { rejectPastDates: true, today })).toMatch(/profissionais/);
    });
});

describe("buildCreateJobOfferPayload", () => {
    it("resolve categoria pela especialidade e omite vazios (specialtyId '' não vai como string)", () => {
        const payload = buildCreateJobOfferPayload({ ...valid, specialtyId: "", venue: "  " }, specialties);
        expect(payload.category).toBe("Outros");
        expect(payload.specialtyId).toBeUndefined();
        expect(payload.venue).toBeUndefined();
        expect(payload.positions).toBe(2);
        expect(payload.budgetMin).toBe(1500);
        expect(payload.budgetMax).toBe(2000);
        expect(payload.startDate).toBe("2099-01-10T00:00:00.000Z");
        expect(payload.endDate).toBe("2099-01-11T00:00:00.000Z");
        expect(payload.isActive).toBe(true);
    });

    it("usa o nome da especialidade escolhida e limpa local em vaga remota", () => {
        const payload = buildCreateJobOfferPayload(
            { ...valid, locationType: "remote", city: "São Paulo", state: "SP", venue: "Estúdio" },
            specialties
        );
        expect(payload.category).toBe("Fotógrafo");
        expect(payload.city).toBeUndefined();
        expect(payload.state).toBeUndefined();
        expect(payload.venue).toBeUndefined();
    });

    it("'não informar valor' zera o orçamento", () => {
        const payload = buildCreateJobOfferPayload({ ...valid, noBudget: true }, specialties);
        expect(payload.budgetMin).toBeUndefined();
        expect(payload.budgetMax).toBeUndefined();
    });
});

describe("buildUpdateJobOfferPayload", () => {
    it("campo limpo vira null para o backend apagar o valor gravado", () => {
        const payload = buildUpdateJobOfferPayload(
            { ...valid, startDate: "", endDate: "", requirements: "", noBudget: true, isActive: false },
            specialties
        );
        expect(payload.startDate).toBeNull();
        expect(payload.endDate).toBeNull();
        expect(payload.requirements).toBeNull();
        expect(payload.budgetMin).toBeNull();
        expect(payload.budgetMax).toBeNull();
        expect(payload.isActive).toBe(false);
        expect(payload.category).toBe("Fotógrafo");
    });
});

describe("jobOfferToFormValues", () => {
    it("carrega a vaga gravada no formulário (datas no formato do input)", () => {
        const job: JobOffer = {
            id: "j1",
            employerId: "e1",
            employerName: "Studio",
            title: "Videomaker",
            description: "Captação e edição de vídeo institucional.",
            category: "Videomaker",
            jobType: "project",
            locationType: "on_site",
            city: "Campinas",
            state: "SP",
            budgetMin: null,
            budgetMax: 5000,
            isActive: false,
            status: "expired",
            createdAt: "2026-09-01T10:00:00Z",
            updatedAt: "2026-09-01T10:00:00Z",
            startDate: "2026-09-02T00:00:00.000Z",
            endDate: null,
            startTime: "08:00",
            endTime: "18:00",
            venue: "Sede",
            positions: 3,
            deliverables: "Vídeo de 2 min",
            deliveryDeadline: "10 dias",
            paymentTerms: "À vista",
            requiresInvoice: true,
            specialtyId: "s2",
        };
        const values = jobOfferToFormValues(job);
        expect(values.startDate).toBe("2026-09-02");
        expect(values.endDate).toBe("");
        expect(values.budgetMin).toBe("");
        expect(values.budgetMax).toBe("5000");
        expect(values.noBudget).toBe(false);
        expect(values.positions).toBe("3");
        expect(values.requiresInvoice).toBe(true);
        expect(values.isActive).toBe(false);
        expect(values.specialtyId).toBe("s2");
    });
});
