/**
 * Rótulos e formatações compartilhadas das vagas (listagem pública, detalhe,
 * painel do contratante, candidaturas). Antes cada página tinha a própria
 * cópia de getJobTypeLabel e formatava data com `new Date(x).toLocaleDateString()`,
 * que exibia o dia anterior no Brasil (as datas são gravadas à meia-noite UTC).
 */
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type JobOfferStatus = "open" | "paused" | "closed" | "expired";

export const JOB_TYPE_OPTIONS = [
    { value: "freelance", label: "Freelance" },
    { value: "full_time", label: "Tempo Integral" },
    { value: "part_time", label: "Meio Período" },
    { value: "project", label: "Por Projeto" },
] as const;

export const LOCATION_TYPE_OPTIONS = [
    { value: "on_site", label: "Presencial" },
    { value: "remote", label: "Remoto" },
    { value: "hybrid", label: "Híbrido" },
] as const;

export function jobTypeLabel(type: string | null | undefined): string {
    return JOB_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? (type ?? "");
}

export function locationTypeLabel(type: string | null | undefined): string {
    return LOCATION_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? (type ?? "");
}

/** Cor de fundo do selo de tipo de trabalho (Tailwind). */
export function jobTypeColor(type: string | null | undefined): string {
    switch (type) {
        case "freelance": return "bg-blue-500";
        case "full_time": return "bg-green-500";
        case "part_time": return "bg-orange-500";
        case "project": return "bg-purple-500";
        default: return "bg-gray-500";
    }
}

/** "2026-09-10T00:00:00.000Z" | "2026-09-10" → "10/09/2026", sem deslocar o dia pelo fuso. */
export function formatJobDate(value: string | Date | null | undefined, pattern = "dd/MM/yyyy"): string {
    if (!value) return "";
    const iso = value instanceof Date ? value.toISOString() : String(value);
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return iso;
    return format(new Date(y, m - 1, d), pattern, { locale: ptBR });
}

/** "10/09/2026" ou "10/09/2026 – 12/09/2026"; null sem data de início. */
export function formatJobDateRange(
    start: string | Date | null | undefined,
    end: string | Date | null | undefined,
    pattern = "dd/MM/yyyy"
): string | null {
    if (!start) return null;
    const a = formatJobDate(start, pattern);
    const b = end ? formatJobDate(end, pattern) : "";
    return b && b !== a ? `${a} – ${b}` : a;
}

/** Data para <input type="date">: "YYYY-MM-DD" (ou ""). */
export function toDateInputValue(value: string | Date | null | undefined): string {
    if (!value) return "";
    const iso = value instanceof Date ? value.toISOString() : String(value);
    return /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : "";
}

/** "19:00:00" | "19:00" → "19:00" (ou ""). */
export function formatJobTime(value: string | null | undefined): string {
    if (!value) return "";
    const match = /^(\d{2}):(\d{2})/.exec(value);
    return match ? `${match[1]}:${match[2]}` : "";
}

/** "19:00 – 23:00" | "a partir de 19:00" | "até 23:00"; null sem horário. */
export function formatJobTimeRange(start: string | null | undefined, end: string | null | undefined): string | null {
    const a = formatJobTime(start);
    const b = formatJobTime(end);
    if (a && b) return `${a} – ${b}`;
    if (a) return `a partir de ${a}`;
    if (b) return `até ${b}`;
    return null;
}

export function formatBRL(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

export function hasJobBudget(job: { budgetMin?: number | null; budgetMax?: number | null }): boolean {
    return (job.budgetMin !== null && job.budgetMin !== undefined) ||
        (job.budgetMax !== null && job.budgetMax !== undefined);
}

/** "R$ 1.500,00 – R$ 2.000,00" | "A partir de R$ …" | "Até R$ …" | fallback. */
export function formatJobBudget(
    job: { budgetMin?: number | null; budgetMax?: number | null },
    fallback = "Valor não informado"
): string {
    const min = job.budgetMin ?? null;
    const max = job.budgetMax ?? null;
    if (min !== null && max !== null) return min === max ? formatBRL(min) : `${formatBRL(min)} – ${formatBRL(max)}`;
    if (min !== null) return `A partir de ${formatBRL(min)}`;
    if (max !== null) return `Até ${formatBRL(max)}`;
    return fallback;
}

/** "Remoto" | "Buffet Villa Real · São Paulo, SP" | "São Paulo, SP" | fallback. */
export function jobLocationLabel(
    job: { locationType: string; city?: string | null; state?: string | null; venue?: string | null },
    fallback = "Local a combinar"
): string {
    if (job.locationType === "remote") return job.venue ? `Remoto · ${job.venue}` : "Remoto";
    const cityState = [job.city, job.state].filter(Boolean).join(", ");
    if (job.venue && cityState) return `${job.venue} · ${cityState}`;
    return job.venue || cityState || fallback;
}

/** Cidade/UF no formato usado pelo painel ("São Paulo/SP"). */
export function jobCityState(job: { city?: string | null; state?: string | null }): string {
    return `${job.city || "Cidade"}/${job.state || "UF"}`;
}

export interface JobStatusInfo {
    status: JobOfferStatus;
    label: string;
    /** Tom visual: success (aberta), warning (pausada), muted (concluída), destructive (expirada). */
    tone: "success" | "warning" | "muted" | "destructive";
    /** Explicação curta para o contratante. */
    hint: string;
}

/** Normaliza status × isActive (registros antigos podem ter só is_active). */
export function jobStatusInfo(job: { status?: string | null; isActive?: boolean | null }): JobStatusInfo {
    const status = (job.status as JobOfferStatus | null | undefined)
        ?? (job.isActive === false ? "paused" : "open");
    switch (status) {
        case "paused":
            return { status, label: "Pausada", tone: "warning", hint: "Fora do ar. Não recebe novas candidaturas." };
        case "closed":
            return { status, label: "Concluída", tone: "muted", hint: "Encerrada por você. Pode ser reaberta." };
        case "expired":
            return { status, label: "Expirada", tone: "destructive", hint: "A data do trabalho passou. Edite as datas para reabrir." };
        default:
            return job.isActive === false
                ? { status: "paused", label: "Pausada", tone: "warning", hint: "Fora do ar. Não recebe novas candidaturas." }
                : { status: "open", label: "Ativa", tone: "success", hint: "Visível e recebendo candidaturas." };
    }
}

/** Vaga aberta ao público (recebe candidaturas). */
export function isJobOpen(job: { status?: string | null; isActive?: boolean | null }): boolean {
    return jobStatusInfo(job).status === "open";
}

/** "Hoje" | "Há 1 dia" | "Há N dias" a partir de um timestamp. */
export function publishedAgo(iso: string | Date, now: Date = new Date()): string {
    const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
    if (days <= 0) return "Hoje";
    if (days === 1) return "Há 1 dia";
    return `Há ${days} dias`;
}

/** "1 profissional" | "3 profissionais". */
export function positionsLabel(positions: number | null | undefined): string {
    const n = positions && positions > 0 ? positions : 1;
    return n === 1 ? "1 profissional" : `${n} profissionais`;
}
