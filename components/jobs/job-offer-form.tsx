"use client";

/**
 * Formulário de vaga compartilhado por /dashboard/vagas/nova e /editar/[id].
 * Antes eram duas cópias que divergiram: a edição carregava a vaga pela
 * listagem pública (não achava vagas pausadas), não validava datas nem
 * orçamento e perdia "Exige NF"/país.
 *
 * O componente é controlado: a página guarda `values`, valida com
 * `validateJobOfferForm` e monta o payload com `buildCreate/UpdatePayload`.
 */
import type React from "react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationSelector } from "@/components/location-selector";
import {
    Briefcase,
    Calendar,
    ClipboardList,
    DollarSign,
    FileText,
    Loader2,
    MapPin,
    Pencil,
    Save,
    Users,
} from "lucide-react";
import type { CreateJobOfferData, JobOffer, Specialty, UpdateJobOfferData } from "@/lib/data-service";
import { JOB_TYPE_OPTIONS, LOCATION_TYPE_OPTIONS, toDateInputValue } from "@/lib/jobs/job-offer-display";

export interface JobOfferFormValues {
    title: string;
    specialtyId: string;
    /** Nome da categoria já gravado (edição) — usado se a especialidade não for reselecionada. */
    category: string;
    jobType: string;
    locationType: string;
    country: string;
    state: string;
    city: string;
    venue: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    budgetMin: string;
    budgetMax: string;
    noBudget: boolean;
    paymentTerms: string;
    requiresInvoice: boolean;
    positions: string;
    description: string;
    requirements: string;
    deliverables: string;
    deliveryDeadline: string;
    isActive: boolean;
}

export const EMPTY_JOB_OFFER_FORM: JobOfferFormValues = {
    title: "",
    specialtyId: "",
    category: "",
    jobType: "freelance",
    locationType: "on_site",
    country: "",
    state: "",
    city: "",
    venue: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    budgetMin: "",
    budgetMax: "",
    noBudget: false,
    paymentTerms: "",
    requiresInvoice: false,
    positions: "1",
    description: "",
    requirements: "",
    deliverables: "",
    deliveryDeadline: "",
    isActive: true,
};

export const POSITIONS_MAX = 500;

/** Vaga gravada → valores do formulário (edição). */
export function jobOfferToFormValues(job: JobOffer): JobOfferFormValues {
    return {
        title: job.title,
        specialtyId: job.specialtyId || "",
        category: job.category,
        jobType: job.jobType,
        locationType: job.locationType,
        country: job.country || "",
        state: job.state || "",
        city: job.city || "",
        venue: job.venue || "",
        startDate: toDateInputValue(job.startDate),
        endDate: toDateInputValue(job.endDate),
        startTime: job.startTime || "",
        endTime: job.endTime || "",
        budgetMin: job.budgetMin != null ? String(job.budgetMin) : "",
        budgetMax: job.budgetMax != null ? String(job.budgetMax) : "",
        noBudget: job.budgetMin == null && job.budgetMax == null,
        paymentTerms: job.paymentTerms || "",
        requiresInvoice: !!job.requiresInvoice,
        positions: String(job.positions && job.positions > 0 ? job.positions : 1),
        description: job.description,
        requirements: job.requirements || "",
        deliverables: job.deliverables || "",
        deliveryDeadline: job.deliveryDeadline || "",
        isActive: job.status === "open" && job.isActive,
    };
}

/** "YYYY-MM-DD" de hoje no fuso do navegador. */
export function todayInputValue(now: Date = new Date()): string {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

const parseMoney = (raw: string): number | null => {
    if (!raw.trim()) return null;
    const n = Number.parseFloat(raw.replace(",", "."));
    return Number.isFinite(n) ? n : null;
};

/**
 * Mesmas regras do backend, com mensagem antes de ir à rede.
 * `rejectPastDates`: na criação sempre; na edição só se as datas mudaram
 * (editar o título de uma vaga em andamento não pode falhar).
 */
export function validateJobOfferForm(
    values: JobOfferFormValues,
    options: { rejectPastDates: boolean; today?: string }
): string | null {
    if (values.title.trim().length < 5) return "O título precisa ter pelo menos 5 caracteres.";
    if (values.description.trim().length < 20) return "A descrição precisa ter pelo menos 20 caracteres.";

    const min = values.noBudget ? null : parseMoney(values.budgetMin);
    const max = values.noBudget ? null : parseMoney(values.budgetMax);
    if (!values.noBudget && values.budgetMin.trim() && min === null) return "Orçamento mínimo inválido.";
    if (!values.noBudget && values.budgetMax.trim() && max === null) return "Orçamento máximo inválido.";
    if (min !== null && min < 0) return "O orçamento mínimo não pode ser negativo.";
    if (max !== null && max < 0) return "O orçamento máximo não pode ser negativo.";
    if (min !== null && max !== null && min > max) return "O orçamento mínimo não pode ser maior que o máximo.";

    const today = options.today ?? todayInputValue();
    if (values.endDate && !values.startDate) return "Informe a data de início para definir a data de término.";
    if (values.startDate && values.endDate && values.endDate < values.startDate) {
        return "A data de término não pode ser anterior à data de início.";
    }
    if (options.rejectPastDates && values.startDate && values.startDate < today) {
        return "A data de início não pode ser anterior à data atual.";
    }
    if (options.rejectPastDates && values.endDate && values.endDate < today) {
        return "A data de término não pode ser anterior à data atual.";
    }

    const positions = Number.parseInt(values.positions, 10);
    if (!Number.isInteger(positions) || positions < 1 || positions > POSITIONS_MAX) {
        return `A quantidade de profissionais deve ser um número entre 1 e ${POSITIONS_MAX}.`;
    }

    return null;
}

const text = (v: string) => (v.trim() ? v.trim() : undefined);
/** "YYYY-MM-DD" → ISO à meia-noite UTC (convenção das colunas start_date/end_date). */
const isoDate = (v: string) => (v ? new Date(v).toISOString() : undefined);

function resolveCategory(values: JobOfferFormValues, specialties: Specialty[]): string {
    const selected = specialties.find((s) => s.id === values.specialtyId);
    return selected?.name || values.category || "Outros";
}

export function buildCreateJobOfferPayload(values: JobOfferFormValues, specialties: Specialty[]): CreateJobOfferData {
    const remote = values.locationType === "remote";
    return {
        title: values.title.trim(),
        description: values.description.trim(),
        category: resolveCategory(values, specialties),
        specialtyId: values.specialtyId || undefined,
        jobType: values.jobType as CreateJobOfferData["jobType"],
        locationType: values.locationType as CreateJobOfferData["locationType"],
        country: remote ? undefined : text(values.country),
        state: remote ? undefined : text(values.state),
        city: remote ? undefined : text(values.city),
        venue: remote ? undefined : text(values.venue),
        budgetMin: values.noBudget ? undefined : parseMoney(values.budgetMin) ?? undefined,
        budgetMax: values.noBudget ? undefined : parseMoney(values.budgetMax) ?? undefined,
        startDate: isoDate(values.startDate),
        endDate: isoDate(values.endDate),
        startTime: text(values.startTime),
        endTime: text(values.endTime),
        positions: Number.parseInt(values.positions, 10) || 1,
        requirements: text(values.requirements),
        deliverables: text(values.deliverables),
        deliveryDeadline: text(values.deliveryDeadline),
        paymentTerms: text(values.paymentTerms),
        requiresInvoice: values.requiresInvoice,
        isActive: true,
    };
}

/** Edição: campo limpo vai como `null` para o backend apagar o valor gravado. */
export function buildUpdateJobOfferPayload(values: JobOfferFormValues, specialties: Specialty[]): UpdateJobOfferData {
    const remote = values.locationType === "remote";
    const orNull = <T,>(v: T | undefined): T | null => (v === undefined ? null : v);
    return {
        title: values.title.trim(),
        description: values.description.trim(),
        category: resolveCategory(values, specialties),
        specialtyId: values.specialtyId || null,
        jobType: values.jobType as CreateJobOfferData["jobType"],
        locationType: values.locationType as CreateJobOfferData["locationType"],
        country: remote ? null : orNull(text(values.country)),
        state: remote ? null : orNull(text(values.state)),
        city: remote ? null : orNull(text(values.city)),
        venue: remote ? null : orNull(text(values.venue)),
        budgetMin: values.noBudget ? null : parseMoney(values.budgetMin),
        budgetMax: values.noBudget ? null : parseMoney(values.budgetMax),
        startDate: orNull(isoDate(values.startDate)),
        endDate: orNull(isoDate(values.endDate)),
        startTime: orNull(text(values.startTime)),
        endTime: orNull(text(values.endTime)),
        positions: Number.parseInt(values.positions, 10) || 1,
        requirements: orNull(text(values.requirements)),
        deliverables: orNull(text(values.deliverables)),
        deliveryDeadline: orNull(text(values.deliveryDeadline)),
        paymentTerms: orNull(text(values.paymentTerms)),
        requiresInvoice: values.requiresInvoice,
        isActive: values.isActive,
    };
}

/** Só dígitos e ponto/vírgula; sem sinal e sem zeros à esquerda. */
const sanitizeMoney = (raw: string) => {
    let val = raw.replace(/[^\d.,]/g, "");
    if (val.startsWith("0") && val.length > 1 && !/^0[.,]/.test(val)) val = val.replace(/^0+/, "");
    return val;
};

interface JobOfferFormProps {
    mode: "create" | "edit";
    values: JobOfferFormValues;
    onChange: (values: JobOfferFormValues) => void;
    specialties: Specialty[];
    submitting: boolean;
    /** Desabilita o envio (ex.: já publicado com sucesso). */
    disabled?: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    /** Aviso acima do formulário (ex.: vaga expirada). */
    banner?: React.ReactNode;
}

function SectionTitle({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 pb-2 border-b">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{children}</h3>
        </div>
    );
}

export function JobOfferForm({
    mode,
    values,
    onChange,
    specialties,
    submitting,
    disabled = false,
    onSubmit,
    onCancel,
    banner,
}: JobOfferFormProps) {
    const set = (patch: Partial<JobOfferFormValues>) => onChange({ ...values, ...patch });
    const [locationIds, setLocationIds] = useState({ countryId: 0, stateId: 0, cityId: 0 });
    const isRemote = values.locationType === "remote";
    const today = todayInputValue();
    const isEdit = mode === "edit";

    return (
        <form onSubmit={onSubmit} noValidate={false}>
            <Card className="border-t-4 border-t-primary shadow-lg">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            {isEdit ? <Pencil className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
                        </div>
                        <CardTitle>{isEdit ? "Informações da Vaga" : "Detalhes da Oportunidade"}</CardTitle>
                    </div>
                    <CardDescription>
                        {isEdit
                            ? "Edite os detalhes da oportunidade. Quanto mais completa, menos dúvidas na execução."
                            : "Quanto mais detalhes sobre data, local, entrega e pagamento, melhores as candidaturas."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    {banner}

                    {/* 1. Básico */}
                    <div className="grid gap-6 p-4 rounded-xl bg-muted/30">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-base font-medium">Título da Vaga *</Label>
                            <Input
                                id="title"
                                value={values.title}
                                onChange={(e) => set({ title: e.target.value })}
                                placeholder="Ex: Fotógrafo para Casamento em São Paulo"
                                required
                                minLength={5}
                                maxLength={150}
                                className="text-lg py-6"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="specialtyId">Especialidade *</Label>
                                <Select value={values.specialtyId} onValueChange={(v) => set({ specialtyId: v })} required>
                                    <SelectTrigger id="specialtyId" className="h-12">
                                        <SelectValue placeholder="Selecione a área" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {specialties.map((spec) => (
                                            <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="jobType">Tipo de Trabalho *</Label>
                                <Select value={values.jobType} onValueChange={(v) => set({ jobType: v })}>
                                    <SelectTrigger id="jobType" className="h-12">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {JOB_TYPE_OPTIONS.map((tipo) => (
                                            <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* 2. Localização */}
                    <div className="grid gap-6">
                        <SectionTitle icon={MapPin}>Localização e Modalidade</SectionTitle>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="locationType">Modalidade *</Label>
                                <Select value={values.locationType} onValueChange={(v) => set({ locationType: v })}>
                                    <SelectTrigger id="locationType">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LOCATION_TYPE_OPTIONS.map((mod) => (
                                            <SelectItem key={mod.value} value={mod.value}>{mod.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <LocationSelector
                                className="grid-cols-1 md:col-span-3 md:grid-cols-3"
                                isDisabled={isRemote}
                                selectedCountryId={locationIds.countryId}
                                selectedStateId={locationIds.stateId}
                                selectedCityId={locationIds.cityId}
                                initialCountryName={values.country}
                                initialStateUf={values.state}
                                initialCityName={values.city}
                                onCountryChange={(id, name) => {
                                    setLocationIds((prev) => ({ ...prev, countryId: id, stateId: 0, cityId: 0 }));
                                    onChange({ ...values, country: name, state: "", city: "" });
                                }}
                                onStateChange={(id, _name, uf) => {
                                    setLocationIds((prev) => ({ ...prev, stateId: id, cityId: 0 }));
                                    onChange({ ...values, state: uf, city: "" });
                                }}
                                onCityChange={(id, name) => {
                                    setLocationIds((prev) => ({ ...prev, cityId: id }));
                                    onChange({ ...values, city: name });
                                }}
                            />
                        </div>

                        {!isRemote && (
                            <div className="space-y-2">
                                <Label htmlFor="venue">Local de execução</Label>
                                <Input
                                    id="venue"
                                    value={values.venue}
                                    onChange={(e) => set({ venue: e.target.value })}
                                    placeholder="Ex: Buffet Villa Real, Rua das Flores 120 — Moema"
                                    maxLength={300}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Nome do espaço, bairro ou endereço. Fica visível na vaga e entra no acordo e no contrato.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* 3. Datas e horário */}
                    <div className="grid gap-6">
                        <SectionTitle icon={Calendar}>Data e Horário do Trabalho</SectionTitle>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Início</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    min={isEdit ? undefined : today}
                                    value={values.startDate}
                                    onChange={(e) => set({ startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endDate">Término</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    min={values.startDate || (isEdit ? undefined : today)}
                                    value={values.endDate}
                                    onChange={(e) => set({ endDate: e.target.value })}
                                    disabled={!values.startDate}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="startTime">Horário inicial</Label>
                                <Input
                                    id="startTime"
                                    type="time"
                                    value={values.startTime}
                                    onChange={(e) => set({ startTime: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endTime">Horário final</Label>
                                <Input
                                    id="endTime"
                                    type="time"
                                    value={values.endTime}
                                    onChange={(e) => set({ endTime: e.target.value })}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground -mt-3">
                            Vaga com data expira sozinha depois do último dia. Sem data, fica no ar até você pausar ou concluir.
                        </p>
                    </div>

                    {/* 4. Orçamento e pagamento */}
                    <div className="grid gap-6">
                        <SectionTitle icon={DollarSign}>Orçamento e Pagamento</SectionTitle>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="budgetMin">Orçamento Estimado (R$)</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-2.5 text-muted-foreground">Min</span>
                                        <Input
                                            id="budgetMin"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="pl-12"
                                            value={values.budgetMin}
                                            onChange={(e) => set({ budgetMin: sanitizeMoney(e.target.value) })}
                                            disabled={values.noBudget}
                                        />
                                    </div>
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-2.5 text-muted-foreground">Máx</span>
                                        <Input
                                            id="budgetMax"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="pl-12"
                                            value={values.budgetMax}
                                            onChange={(e) => set({ budgetMax: sanitizeMoney(e.target.value) })}
                                            disabled={values.noBudget}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-3 p-3 rounded-lg border bg-muted/30">
                                    <input
                                        type="checkbox"
                                        id="noBudget"
                                        checked={values.noBudget}
                                        onChange={(e) =>
                                            set(e.target.checked
                                                ? { noBudget: true, budgetMin: "", budgetMax: "" }
                                                : { noBudget: false })
                                        }
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <div className="flex flex-col">
                                        <Label htmlFor="noBudget" className="cursor-pointer font-medium">Não informar valor</Label>
                                        <span className="text-xs text-muted-foreground">O orçamento estimado não será exibido na vaga.</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="paymentTerms">Forma e prazo de pagamento</Label>
                                <Textarea
                                    id="paymentTerms"
                                    value={values.paymentTerms}
                                    onChange={(e) => set({ paymentTerms: e.target.value })}
                                    placeholder="Ex: 50% na reserva via Pix e 50% na entrega do material"
                                    rows={3}
                                    maxLength={500}
                                    className="resize-y"
                                />
                                <p className="text-xs text-muted-foreground">Entra no termo de acordo enviado ao profissional.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                            <input
                                type="checkbox"
                                id="requiresInvoice"
                                checked={values.requiresInvoice}
                                onChange={(e) => set({ requiresInvoice: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <div className="flex flex-col">
                                <Label htmlFor="requiresInvoice" className="cursor-pointer font-medium">Exige Nota Fiscal</Label>
                                <span className="text-xs text-muted-foreground">O profissional deverá emitir NF para receber o pagamento.</span>
                            </div>
                        </div>
                    </div>

                    {/* 5. Descrição, requisitos e entrega */}
                    <div className="grid gap-6">
                        <SectionTitle icon={FileText}>Descrição e Requisitos</SectionTitle>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição da Vaga *</Label>
                            <Textarea
                                id="description"
                                value={values.description}
                                onChange={(e) => set({ description: e.target.value })}
                                placeholder="Descreva o projeto, o contexto e o que você procura (mínimo 20 caracteres)..."
                                rows={6}
                                required
                                minLength={20}
                                maxLength={5000}
                                className="resize-y min-h-[120px]"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="requirements">Requisitos / Equipamentos Necessários</Label>
                                <Textarea
                                    id="requirements"
                                    value={values.requirements}
                                    onChange={(e) => set({ requirements: e.target.value })}
                                    placeholder="Ex: Câmera Full Frame, Lente 50mm, Experiência com eventos..."
                                    rows={4}
                                    maxLength={3000}
                                    className="resize-y min-h-[100px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="positions" className="flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5" /> Profissionais
                                </Label>
                                <Input
                                    id="positions"
                                    type="number"
                                    min={1}
                                    max={POSITIONS_MAX}
                                    step={1}
                                    value={values.positions}
                                    onChange={(e) => set({ positions: e.target.value.replace(/\D/g, "") })}
                                />
                                <p className="text-xs text-muted-foreground">Quantos você vai contratar nesta vaga.</p>
                            </div>
                        </div>
                    </div>

                    {/* 6. Entrega */}
                    <div className="grid gap-6">
                        <SectionTitle icon={ClipboardList}>Entrega do Material</SectionTitle>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="deliverables">Entregáveis</Label>
                                <Textarea
                                    id="deliverables"
                                    value={values.deliverables}
                                    onChange={(e) => set({ deliverables: e.target.value })}
                                    placeholder="Ex: 300 fotos editadas em alta, 30 para redes sociais, vídeo highlight de 3 min"
                                    rows={4}
                                    maxLength={3000}
                                    className="resize-y"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="deliveryDeadline">Prazo de entrega</Label>
                                <Input
                                    id="deliveryDeadline"
                                    value={values.deliveryDeadline}
                                    onChange={(e) => set({ deliveryDeadline: e.target.value })}
                                    placeholder="Ex: até 15 dias após o evento"
                                    maxLength={200}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Vira o prazo sugerido no acordo com o profissional escolhido.
                                </p>
                            </div>
                        </div>
                    </div>

                    {isEdit && (
                        <div className="flex items-center gap-2 p-4 rounded-lg border bg-muted/10">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={values.isActive}
                                onChange={(e) => set({ isActive: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <div className="flex flex-col">
                                <Label htmlFor="isActive" className="cursor-pointer">Vaga Ativa (visível para todos)</Label>
                                <span className="text-xs text-muted-foreground">Desmarcar pausa a vaga; marcar reabre (as datas precisam estar no futuro).</span>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-6 border-t">
                        <Button type="button" variant="outline" onClick={onCancel} className="px-6 rounded-full">
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={submitting || disabled}
                            className="px-6 rounded-full shadow-md hover:shadow-lg transition-all"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {isEdit ? "Salvando..." : "Publicando..."}
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    {isEdit ? "Salvar Alterações" : "Publicar Vaga"}
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </form>
    );
}
