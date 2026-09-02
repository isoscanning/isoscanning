"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    ArrowLeftRight,
    Check,
    FileText,
    Loader2,
    Send,
    X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    fetchJobNegotiation,
    type JobAgreementStatus,
    type JobNegotiation,
    type NegotiationRound,
} from "@/lib/data-service";
import { cn } from "@/lib/utils";

// ─── Helpers compartilhados ─────────────────────────────────────────────────

export function formatBRL(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

/** "1.500,00" | "1500" | "R$ 1.500" → 1500 (NaN se inválido). */
export function parseBRL(raw: string): number {
    const cleaned = raw.replace(/[^\d.,-]/g, "");
    if (!cleaned) return NaN;
    // Se tem vírgula, ela é o separador decimal e os pontos são de milhar.
    const normalized = cleaned.includes(",")
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned;
    return parseFloat(normalized);
}

/** Datas YYYY-MM-DD vindas do banco: sem `new Date(str)` para não perder um dia por fuso. */
export function formatDateOnly(value: string | null | undefined, pattern = "dd/MM/yyyy"): string {
    if (!value) return "";
    const [y, m, d] = value.slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return value;
    return format(new Date(y, m - 1, d), pattern, { locale: ptBR });
}

export function agreementStatusLabel(status: JobAgreementStatus | null | undefined): string {
    switch (status) {
        case "pending_candidate":
            return "Acordo aguardando o candidato";
        case "countered":
            return "Contraproposta do candidato";
        case "accepted":
            return "Acordo aceito";
        case "rejected":
            return "Acordo recusado";
        default:
            return "Em negociação";
    }
}

// ─── Histórico de rodadas ───────────────────────────────────────────────────

const ROUND_META: Record<
    NegotiationRound["kind"],
    { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
    proposal: { label: "Candidatura", icon: Send, tone: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
    counter: { label: "Contraproposta", icon: ArrowLeftRight, tone: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
    agreement: { label: "Acordo enviado", icon: FileText, tone: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
    accept: { label: "Acordo aceito", icon: Check, tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
    reject: { label: "Acordo recusado", icon: X, tone: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

interface NegotiationHistoryProps {
    applicationId: string;
    /** Papel de quem está vendo — define "Você" vs. o outro lado. */
    viewerRole: "candidate" | "employer";
    /** Mude para forçar recarga (ex.: depois de enviar uma contraproposta). */
    refreshKey?: number;
    /** Chamado com o estado carregado — útil para a cota do candidato. */
    onLoaded?: (negotiation: JobNegotiation) => void;
    className?: string;
}

/**
 * Linha do tempo da negociação (proposta → contrapropostas → acordo →
 * aceite/recusa). Lê GET /job-applications/:id/negotiation; se o histórico
 * (SQL 73) ainda não existir, mostra só um aviso discreto.
 */
export function NegotiationHistory({ applicationId, viewerRole, refreshKey = 0, onLoaded, className }: NegotiationHistoryProps) {
    const [negotiation, setNegotiation] = useState<JobNegotiation | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);
        fetchJobNegotiation(applicationId)
            .then((data) => {
                if (!active) return;
                setNegotiation(data);
                if (data) onLoaded?.(data);
            })
            .finally(() => active && setLoading(false));
        return () => {
            active = false;
        };
        // onLoaded costuma ser inline; não queremos refetch a cada render do pai
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applicationId, refreshKey]);

    if (loading) {
        return (
            <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando negociação…
            </div>
        );
    }

    if (!negotiation || negotiation.rounds.length === 0) {
        return (
            <p className={cn("text-sm text-muted-foreground", className)}>
                Nenhuma rodada de negociação registrada ainda.
            </p>
        );
    }

    return (
        <ol className={cn("space-y-3", className)} aria-label="Histórico da negociação">
            {negotiation.rounds.map((round) => {
                const meta = ROUND_META[round.kind] ?? ROUND_META.counter;
                const Icon = meta.icon;
                const isViewer = round.authorRole === viewerRole;
                const author = isViewer ? "Você" : round.authorRole === "candidate" ? "Candidato" : "Contratante";
                return (
                    <li key={round.id} className="flex gap-3">
                        <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", meta.tone)}>
                            <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span className="text-sm font-semibold">{meta.label}</span>
                                <span className="text-xs text-muted-foreground">
                                    {author} · {format(new Date(round.createdAt), "d MMM, HH:mm", { locale: ptBR })}
                                </span>
                            </div>
                            {round.value !== null && round.value !== undefined && (
                                <p className="text-sm font-bold text-foreground">{formatBRL(round.value)}</p>
                            )}
                            {round.message && round.kind !== "agreement" && (
                                <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">“{round.message}”</p>
                            )}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

// ─── Cota de contrapropostas (candidato) ────────────────────────────────────

export function CounterProposalQuotaHint({ quota }: { quota: JobNegotiation["counterProposalQuota"] }) {
    if (!quota) return null;
    if (quota.limit === null) {
        return <p className="text-xs text-muted-foreground">Contrapropostas ilimitadas no seu plano.</p>;
    }
    const remaining = Math.max(0, quota.limit - quota.used);
    if (quota.limit === 0) {
        return (
            <p className="text-xs text-amber-600 dark:text-amber-400">
                Seu plano não permite contrapropostas. Faça upgrade para negociar valores.
            </p>
        );
    }
    return (
        <p className={cn("text-xs", remaining === 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
            {remaining === 0
                ? `Você usou as ${quota.limit} contrapropostas desta vaga.`
                : `${remaining} de ${quota.limit} contrapropostas disponíveis nesta vaga.`}
        </p>
    );
}

// ─── Diálogo de contraproposta (usado pelos dois lados) ─────────────────────

interface CounterProposalDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    /** Valor de referência mostrado acima do campo (última oferta do outro lado). */
    referenceLabel?: string;
    referenceValue?: number | null;
    initialValue?: number | null;
    submitLabel?: string;
    submitting?: boolean;
    quota?: JobNegotiation["counterProposalQuota"];
    onSubmit: (value: number, message: string) => Promise<void> | void;
}

export function CounterProposalDialog({
    open,
    onOpenChange,
    title = "Enviar contraproposta",
    description = "Proponha um novo valor. O outro lado será notificado e poderá aceitar ou contrapropor.",
    referenceLabel,
    referenceValue,
    initialValue,
    submitLabel = "Enviar contraproposta",
    submitting = false,
    quota,
    onSubmit,
}: CounterProposalDialogProps) {
    const [value, setValue] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setValue(initialValue ? String(initialValue).replace(".", ",") : "");
            setMessage("");
            setError(null);
        }
    }, [open, initialValue]);

    const blocked = !!quota && quota.limit !== null && quota.used >= quota.limit;

    const handleSubmit = async () => {
        const numeric = parseBRL(value);
        if (Number.isNaN(numeric) || numeric <= 0) {
            setError("Informe um valor válido, maior que zero.");
            return;
        }
        setError(null);
        await onSubmit(numeric, message.trim());
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {referenceValue !== undefined && referenceValue !== null && (
                        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
                            <span className="text-muted-foreground">{referenceLabel ?? "Valor atual"}</span>
                            <span className="font-semibold">{formatBRL(referenceValue)}</span>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="counter-value">Seu valor (R$)</Label>
                        <Input
                            id="counter-value"
                            inputMode="decimal"
                            placeholder="Ex: 1.500,00"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            disabled={submitting || blocked}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="counter-message">Mensagem (opcional)</Label>
                        <Textarea
                            id="counter-message"
                            placeholder="Explique o valor, o que está incluso, condições…"
                            value={message}
                            onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
                            className="min-h-[90px]"
                            disabled={submitting || blocked}
                        />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <CounterProposalQuotaHint quota={quota ?? null} />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || blocked}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {submitLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Badge de status do acordo ──────────────────────────────────────────────

export function AgreementStatusBadge({
    status,
    agreementStatus,
    contractId,
    labels,
}: {
    status: "pending" | "accepted" | "rejected" | "withdrawn";
    agreementStatus?: JobAgreementStatus | null;
    contractId?: string | null;
    /** Rótulos por perspectiva: o candidato vê "Em análise", o contratante "Pendente". */
    labels?: { pending?: string; rejected?: string };
}) {
    if (status === "accepted" && contractId) {
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Contrato gerado</Badge>;
    }
    if (status === "pending") {
        if (agreementStatus === "pending_candidate") {
            return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Acordo pendente</Badge>;
        }
        if (agreementStatus === "countered") {
            return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Contraproposta enviada</Badge>;
        }
        if (agreementStatus === "rejected") {
            return <Badge variant="destructive">Acordo recusado</Badge>;
        }
    }
    switch (status) {
        case "accepted":
            return <Badge className="bg-emerald-500 hover:bg-emerald-600">Aprovado</Badge>;
        case "rejected":
            return <Badge variant="destructive">{labels?.rejected ?? "Não selecionado"}</Badge>;
        case "withdrawn":
            return <Badge variant="outline">Desistência</Badge>;
        default:
            return (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300">
                    {labels?.pending ?? "Em análise"}
                </Badge>
            );
    }
}
