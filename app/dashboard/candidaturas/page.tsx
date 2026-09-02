"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
    counterJobProposal,
    fetchJobNegotiation,
    fetchUserApplications,
    respondToJobAgreement,
    type JobApplication,
    type JobNegotiation,
} from "@/lib/data-service";
import { downloadAgreementPdf } from "@/lib/pdf-generator";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
    Briefcase,
    Building2,
    CalendarDays,
    ChevronRight,
    Loader2,
    MessageSquare,
    DollarSign,
    FileText,
    Download,
    ArrowLeftRight,
    History,
    MapPin,
    Clock,
    FileSignature,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";
import {
    AgreementStatusBadge,
    CounterProposalDialog,
    CounterProposalQuotaHint,
    NegotiationHistory,
    formatBRL,
    formatDateOnly,
} from "@/components/jobs/negotiation";

/** 403 de plano → o modal de upgrade já foi aberto pelo interceptor do apiClient. */
const isPlanError = (error: unknown) => isPlanErrorBody((error as any)?.response?.data);

const apiErrorMessage = (error: unknown, fallback: string) => {
    const msg = (error as any)?.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(" ");
    return typeof msg === "string" && msg ? msg : fallback;
};

/** Candidatura ainda aberta a contrapropostas (nem aceita, nem encerrada). */
const canNegotiate = (app: JobApplication) =>
    app.status === "pending" && app.agreementStatus !== "accepted";

function MinhasCandidaturasInner() {
    const { userProfile, loading: authLoading } = useAuth();
    const searchParams = useSearchParams();
    const highlightId = searchParams.get("candidatura");
    const highlightRef = useRef<HTMLDivElement | null>(null);

    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // Contraproposta (fora do acordo)
    const [counterTarget, setCounterTarget] = useState<JobApplication | null>(null);
    const [isSubmittingCounter, setIsSubmittingCounter] = useState(false);
    const [quotaByApp, setQuotaByApp] = useState<Record<string, JobNegotiation["counterProposalQuota"] | undefined>>({});

    // Acordo
    const [agreementToReview, setAgreementToReview] = useState<JobApplication | null>(null);
    const [isRespondingToAgreement, setIsRespondingToAgreement] = useState(false);
    const [agreementCounterOpen, setAgreementCounterOpen] = useState(false);

    // Histórico aberto por candidatura + chave para recarregar após uma ação
    const [openHistory, setOpenHistory] = useState<Record<string, boolean>>({});
    const [historyRefresh, setHistoryRefresh] = useState(0);

    const reload = useCallback(async () => {
        if (!userProfile) return;
        const data = await fetchUserApplications(userProfile.id);
        setApplications(data);
        setHistoryRefresh((k) => k + 1);
        // A cota muda a cada contraproposta; recarrega sob demanda
        setQuotaByApp({});
    }, [userProfile]);

    useEffect(() => {
        const loadApplications = async () => {
            if (userProfile) {
                try {
                    const data = await fetchUserApplications(userProfile.id);
                    setApplications(data);
                } catch (error) {
                    console.error("Erro ao carregar candidaturas:", error);
                } finally {
                    setLoading(false);
                }
            } else if (!authLoading) {
                setLoading(false);
            }
        };

        loadApplications();
    }, [userProfile, authLoading]);

    // Deep link do sino (?candidatura=<id>): abre o histórico e rola até o card.
    // IDs antigos (de vaga) simplesmente não casam e são ignorados.
    useEffect(() => {
        if (!highlightId || loading) return;
        const target = applications.find((a) => a.id === highlightId);
        if (!target) return;
        setOpenHistory((prev) => ({ ...prev, [highlightId]: true }));
        if (target.agreementStatus === "pending_candidate") setAgreementToReview(target);
        const t = setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [highlightId, loading, applications.length]);

    const loadQuota = useCallback(async (app: JobApplication) => {
        if (quotaByApp[app.id] !== undefined) return;
        const neg = await fetchJobNegotiation(app.id);
        setQuotaByApp((prev) => ({ ...prev, [app.id]: neg?.counterProposalQuota ?? null }));
    }, [quotaByApp]);

    const openCounterDialog = (app: JobApplication) => {
        setCounterTarget(app);
        void loadQuota(app);
    };

    /** Contraproposta avulsa (POST :id/counter) — nunca `applyToJob` (409 duplicada). */
    const handleSendCounter = async (value: number, message: string) => {
        if (!counterTarget) return;
        setIsSubmittingCounter(true);
        try {
            await counterJobProposal(counterTarget.id, { value, message });
            toast({ title: "Contraproposta enviada", description: `Você propôs ${formatBRL(value)}. O contratante foi notificado.` });
            setCounterTarget(null);
            await reload();
        } catch (error) {
            console.error("Erro ao enviar contraproposta:", error);
            if (isPlanError(error)) {
                setCounterTarget(null);
            } else {
                toast({ variant: "destructive", title: "Erro", description: apiErrorMessage(error, "Não foi possível enviar a contraproposta.") });
            }
        } finally {
            setIsSubmittingCounter(false);
        }
    };

    const handleRespondAgreement = async (response: "accepted" | "rejected") => {
        if (!agreementToReview || !userProfile) return;

        setIsRespondingToAgreement(true);
        try {
            const result = await respondToJobAgreement(agreementToReview.id, response);
            if (response === "accepted") {
                const days = result?.reservedDays ?? 0;
                toast({
                    title: "Acordo aceito",
                    description:
                        days > 0
                            ? `${days} dia(s) reservado(s) na sua agenda. O contratante vai gerar o contrato para assinatura.`
                            : "O contratante vai gerar o contrato para assinatura. Sem datas no acordo, nada foi reservado na agenda ainda.",
                });
            } else {
                toast({ title: "Acordo recusado", description: "O contratante foi avisado e pode reenviar um novo acordo." });
            }
            setAgreementToReview(null);
            await reload();
        } catch (error) {
            console.error("Erro ao responder ao acordo:", error);
            if (!isPlanError(error)) {
                toast({ variant: "destructive", title: "Erro", description: apiErrorMessage(error, "Ocorreu um erro ao responder ao termo de acordo.") });
            }
        } finally {
            setIsRespondingToAgreement(false);
        }
    };

    /** Contraproposta em resposta ao acordo (accept=false + counterValue). */
    const handleAgreementCounter = async (value: number, message: string) => {
        if (!agreementToReview) return;
        setIsRespondingToAgreement(true);
        try {
            await respondToJobAgreement(agreementToReview.id, "countered", { value, message });
            toast({ title: "Contraproposta enviada", description: `Você propôs ${formatBRL(value)}. O contratante pode aceitar reenviando o acordo.` });
            setAgreementCounterOpen(false);
            setAgreementToReview(null);
            await reload();
        } catch (error) {
            console.error("Erro ao contrapropor ao acordo:", error);
            if (isPlanError(error)) {
                setAgreementCounterOpen(false);
            } else {
                toast({ variant: "destructive", title: "Erro", description: apiErrorMessage(error, "Não foi possível enviar a contraproposta.") });
            }
        } finally {
            setIsRespondingToAgreement(false);
        }
    };

    if (authLoading || loading || !userProfile) {
        return (
            <div className="min-h-screen flex flex-col bg-background">
                <Header />
                <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
                    <div className="flex items-center justify-between mb-8">
                        <div className="space-y-2">
                            <Skeleton className="h-9 w-56" />
                            <Skeleton className="h-4 w-72" />
                        </div>
                        <Skeleton className="h-10 w-40 rounded-md" />
                    </div>
                    <div className="space-y-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex flex-col md:flex-row md:items-center p-6 gap-6 border rounded-lg">
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-5 w-2/3" />
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-4 w-1/3" />
                                </div>
                                <Skeleton className="h-6 w-24 rounded-full" />
                            </div>
                        ))}
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const hasBudget = (app: JobApplication) =>
        (app.jobOffer.budgetMin !== null && app.jobOffer.budgetMin !== undefined) ||
        (app.jobOffer.budgetMax !== null && app.jobOffer.budgetMax !== undefined);

    const agreementDates = (app: JobApplication) => {
        const start = app.agreementStartDate ?? app.jobOffer.startDate;
        const end = app.agreementEndDate ?? (app.agreementStartDate ? app.agreementStartDate : app.jobOffer.endDate) ?? start;
        if (!start) return null;
        return start === end || !end ? formatDateOnly(start) : `${formatDateOnly(start)} – ${formatDateOnly(end)}`;
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Minhas Candidaturas</h1>
                        <p className="text-muted-foreground mt-1">
                            Acompanhe o status e negocie as vagas que você se candidatou.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/vagas">Buscar Mais Vagas</Link>
                    </Button>
                </div>

                {applications.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                            <div className="bg-muted rounded-full p-4">
                                <Briefcase className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">Nenhuma candidatura encontrada</h3>
                                <p className="text-muted-foreground max-w-sm">
                                    Você ainda não se candidatou a nenhuma vaga. Explore as oportunidades disponíveis e comece agora!
                                </p>
                            </div>
                            <Button asChild variant="outline">
                                <Link href="/vagas">Ver Vagas Disponíveis</Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {applications.map((app) => {
                            const isHighlighted = app.id === highlightId;
                            const dates = agreementDates(app);
                            return (
                                <Card
                                    key={app.id}
                                    ref={isHighlighted ? highlightRef : undefined}
                                    className={`overflow-hidden hover:shadow-md transition-shadow ${isHighlighted ? "ring-2 ring-primary" : ""}`}
                                >
                                    <CardContent className="p-0">
                                        <div className="flex flex-col md:flex-row md:items-start p-6 gap-6">
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-start justify-between md:hidden">
                                                    <AgreementStatusBadge status={app.status} agreementStatus={app.agreementStatus} contractId={app.contractId} />
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(new Date(app.createdAt), "d 'de' MMM", { locale: ptBR })}
                                                    </span>
                                                </div>

                                                <div>
                                                    <Link href={`/vagas/${app.jobOfferId}`} className="hover:underline">
                                                        <h3 className="text-xl font-bold text-foreground">{app.jobOffer.title}</h3>
                                                    </Link>
                                                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                                        <Building2 className="h-4 w-4" />
                                                        <span className="text-sm">{app.jobOffer.employerName}</span>
                                                    </div>
                                                </div>

                                                {/* Valores em jogo */}
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1.5 py-1 px-3 bg-muted/50 rounded-full border">
                                                        <DollarSign className="h-4 w-4 text-foreground/70" />
                                                        <span className="font-semibold text-foreground">
                                                            Vaga:{" "}
                                                            {hasBudget(app) ? (
                                                                <>
                                                                    {app.jobOffer.budgetMin !== null && app.jobOffer.budgetMin !== undefined && formatBRL(app.jobOffer.budgetMin)}
                                                                    {app.jobOffer.budgetMin !== null && app.jobOffer.budgetMin !== undefined &&
                                                                        app.jobOffer.budgetMax !== null && app.jobOffer.budgetMax !== undefined && " – "}
                                                                    {app.jobOffer.budgetMax !== null && app.jobOffer.budgetMax !== undefined && formatBRL(app.jobOffer.budgetMax)}
                                                                </>
                                                            ) : (
                                                                "A combinar"
                                                            )}
                                                        </span>
                                                    </div>

                                                    {!!app.counterProposal && (
                                                        <div className="flex items-center gap-1.5 py-1 px-3 rounded-full border bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-900 dark:text-emerald-300">
                                                            <DollarSign className="h-4 w-4" />
                                                            <span className="font-bold">Minha proposta: {formatBRL(app.counterProposal)}</span>
                                                        </div>
                                                    )}

                                                    {!!app.employerCounterProposal && canNegotiate(app) && (
                                                        <div className="flex items-center gap-1.5 py-1 px-3 rounded-full border bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-900/20 dark:border-amber-900 dark:text-amber-300">
                                                            <ArrowLeftRight className="h-4 w-4" />
                                                            <span className="font-bold">Contratante propôs: {formatBRL(app.employerCounterProposal)}</span>
                                                        </div>
                                                    )}

                                                    {app.agreementStatus === "accepted" && app.agreementValue !== undefined && (
                                                        <div className="flex items-center gap-1.5 py-1 px-3 rounded-full border bg-emerald-600 text-white">
                                                            <DollarSign className="h-4 w-4" />
                                                            <span className="font-bold">Fechado: {formatBRL(app.agreementValue)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Resumo do acordo (quando existe) */}
                                                {app.agreementText && (
                                                    <div className="grid gap-1 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-2">
                                                        {app.agreementValue !== undefined && (
                                                            <div className="flex items-center gap-2"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" /> Valor: <strong>{formatBRL(app.agreementValue)}</strong></div>
                                                        )}
                                                        {app.agreementDeadline && (
                                                            <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-muted-foreground" /> Prazo: <strong>{app.agreementDeadline}</strong></div>
                                                        )}
                                                        {app.agreementLocation && (
                                                            <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Local: <strong>{app.agreementLocation}</strong></div>
                                                        )}
                                                        {dates && (
                                                            <div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> Data do serviço: <strong>{dates}</strong></div>
                                                        )}
                                                        {app.agreementStatus === "rejected" && (
                                                            <p className="sm:col-span-2 text-destructive">Você recusou este acordo. O contratante pode reenviar novos termos.</p>
                                                        )}
                                                        {app.agreementStatus === "accepted" && !app.contractId && (
                                                            <p className="sm:col-span-2 text-muted-foreground">Acordo aceito — aguardando o contratante gerar o contrato digital.</p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Histórico de negociação */}
                                                <Collapsible
                                                    open={!!openHistory[app.id]}
                                                    onOpenChange={(o) => setOpenHistory((prev) => ({ ...prev, [app.id]: o }))}
                                                >
                                                    <CollapsibleTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
                                                            <History className="mr-1.5 h-3.5 w-3.5" />
                                                            {openHistory[app.id] ? "Ocultar negociação" : "Ver histórico da negociação"}
                                                        </Button>
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent className="pt-3">
                                                        {openHistory[app.id] && (
                                                            <NegotiationHistory
                                                                applicationId={app.id}
                                                                viewerRole="candidate"
                                                                refreshKey={historyRefresh}
                                                                onLoaded={(neg) => setQuotaByApp((prev) => ({ ...prev, [app.id]: neg.counterProposalQuota }))}
                                                            />
                                                        )}
                                                    </CollapsibleContent>
                                                </Collapsible>
                                            </div>

                                            <div className="flex flex-col items-end gap-3 min-w-[160px]">
                                                <div className="hidden md:flex flex-col items-end gap-1 mb-1">
                                                    <AgreementStatusBadge status={app.status} agreementStatus={app.agreementStatus} contractId={app.contractId} />
                                                    <span className="text-xs text-muted-foreground mt-1">
                                                        Candidatado em {format(new Date(app.createdAt), "d 'de' MMM", { locale: ptBR })}
                                                    </span>
                                                </div>
                                                <Button variant="outline" size="sm" className="w-full md:w-auto" asChild>
                                                    <Link href={`/vagas/${app.jobOfferId}`}>
                                                        Ver Detalhes <ChevronRight className="ml-2 h-4 w-4" />
                                                    </Link>
                                                </Button>

                                                {app.agreementStatus === "pending_candidate" && (
                                                    <Button
                                                        size="sm"
                                                        className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                                                        onClick={() => setAgreementToReview(app)}
                                                    >
                                                        Analisar Acordo
                                                    </Button>
                                                )}

                                                {canNegotiate(app) && app.agreementStatus !== "pending_candidate" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-full md:w-auto"
                                                        onClick={() => openCounterDialog(app)}
                                                    >
                                                        <ArrowLeftRight className="mr-2 h-4 w-4" />
                                                        {app.counterProposal ? "Nova contraproposta" : "Enviar proposta"}
                                                    </Button>
                                                )}

                                                {app.agreementText && app.agreementStatus !== "pending_candidate" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-full md:w-auto shadow-sm"
                                                        onClick={() => setAgreementToReview(app)}
                                                    >
                                                        <FileText className="mr-2 h-4 w-4" /> Ver Acordo
                                                    </Button>
                                                )}

                                                {app.contractId && (
                                                    <Button size="sm" className="w-full md:w-auto shadow-sm" asChild>
                                                        <Link href={`/dashboard/contratos/${app.contractId}`}>
                                                            <FileSignature className="mr-2 h-4 w-4" /> Ver Contrato
                                                        </Link>
                                                    </Button>
                                                )}

                                                {app.status === "accepted" && (
                                                    <Button size="sm" className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white shadow-sm" asChild>
                                                        <Link href={`/profissionais/${app.jobOffer.employerId}`}>
                                                            Entrar em Contato <MessageSquare className="ml-2 h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Contraproposta avulsa */}
            <CounterProposalDialog
                open={!!counterTarget}
                onOpenChange={(open) => !open && setCounterTarget(null)}
                title={counterTarget?.counterProposal ? "Nova contraproposta" : "Enviar proposta de valor"}
                description={
                    counterTarget && !hasBudget(counterTarget)
                        ? "Esta vaga não possui um valor pré-definido. Envie a sua proposta para avaliação do contratante."
                        : "Proponha um valor para esta vaga. O contratante será notificado e poderá aceitar, contrapropor ou enviar o acordo."
                }
                referenceLabel={counterTarget?.employerCounterProposal ? "Última oferta do contratante" : "Orçamento da vaga"}
                referenceValue={counterTarget?.employerCounterProposal ?? counterTarget?.jobOffer.budgetMax ?? counterTarget?.jobOffer.budgetMin ?? null}
                initialValue={counterTarget?.employerCounterProposal ?? counterTarget?.counterProposal ?? null}
                submitting={isSubmittingCounter}
                quota={counterTarget ? quotaByApp[counterTarget.id] ?? null : null}
                onSubmit={handleSendCounter}
            />

            {/* Acordo */}
            <Dialog open={!!agreementToReview && !agreementCounterOpen} onOpenChange={(open) => !open && setAgreementToReview(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Termo de Prestação de Serviços</DialogTitle>
                        <DialogDescription>
                            {agreementToReview?.agreementStatus === "pending_candidate"
                                ? "Revise os termos enviados pelo contratante. Ao aceitar, a candidatura é aprovada e as datas do serviço ficam reservadas na sua agenda até a assinatura do contrato."
                                : "Termos do acordo desta vaga."}
                        </DialogDescription>
                    </DialogHeader>

                    {agreementToReview && (
                        <div className="grid gap-1 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-2">
                            <div><span className="text-muted-foreground">Valor:</span> <strong>{formatBRL(agreementToReview.agreementValue)}</strong></div>
                            <div><span className="text-muted-foreground">Prazo:</span> <strong>{agreementToReview.agreementDeadline || "—"}</strong></div>
                            <div className="sm:col-span-2"><span className="text-muted-foreground">Local:</span> <strong>{agreementToReview.agreementLocation || "—"}</strong></div>
                            <div className="sm:col-span-2">
                                <span className="text-muted-foreground">Data do serviço:</span>{" "}
                                <strong>{agreementDates(agreementToReview) ?? "não informada (nada será reservado na agenda)"}</strong>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-4 bg-muted/30 border rounded-md font-mono text-sm whitespace-pre-wrap max-h-[45vh]">
                        {agreementToReview?.agreementText}
                    </div>

                    {agreementToReview?.agreementStatus === "pending_candidate" && (
                        <CounterProposalQuotaHint quota={quotaByApp[agreementToReview.id] ?? null} />
                    )}

                    <DialogFooter className="gap-2 sm:gap-0 mt-2 flex-wrap sm:flex-nowrap">
                        {agreementToReview?.agreementStatus === "pending_candidate" && (
                            <>
                                <Button
                                    variant="destructive"
                                    onClick={() => handleRespondAgreement("rejected")}
                                    disabled={isRespondingToAgreement}
                                >
                                    Recusar
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        void loadQuota(agreementToReview);
                                        setAgreementCounterOpen(true);
                                    }}
                                    disabled={isRespondingToAgreement}
                                >
                                    <ArrowLeftRight className="mr-2 h-4 w-4" /> Contrapropor
                                </Button>
                            </>
                        )}
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (agreementToReview?.agreementText) {
                                    downloadAgreementPdf(userProfile.displayName, agreementToReview.jobOffer.employerName, agreementToReview.agreementText);
                                }
                            }}
                            className={agreementToReview?.agreementStatus === "pending_candidate" ? "sm:mr-auto" : ""}
                        >
                            <Download className="mr-2 h-4 w-4" /> Baixar PDF
                        </Button>

                        {agreementToReview?.agreementStatus === "pending_candidate" ? (
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleRespondAgreement("accepted")}
                                disabled={isRespondingToAgreement}
                            >
                                {isRespondingToAgreement && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Aceitar acordo
                            </Button>
                        ) : (
                            <Button variant="outline" onClick={() => setAgreementToReview(null)}>
                                Fechar
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Contraproposta em resposta ao acordo */}
            <CounterProposalDialog
                open={agreementCounterOpen}
                onOpenChange={setAgreementCounterOpen}
                title="Contrapropor ao acordo"
                description="Devolva um novo valor ao contratante. O acordo atual fica em espera até ele responder (reenviando o acordo ou contrapropondo)."
                referenceLabel="Valor do acordo"
                referenceValue={agreementToReview?.agreementValue ?? null}
                initialValue={agreementToReview?.agreementValue ?? null}
                submitting={isRespondingToAgreement}
                quota={agreementToReview ? quotaByApp[agreementToReview.id] ?? null : null}
                onSubmit={handleAgreementCounter}
            />

            <div className="hidden lg:block">
                <Footer />
            </div>
        </div>
    );
}

export default function MinhasCandidaturasPage() {
    // useSearchParams exige Suspense no App Router
    return (
        <Suspense fallback={null}>
            <MinhasCandidaturasInner />
        </Suspense>
    );
}
