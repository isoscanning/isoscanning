"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useParams, useRouter } from "next/navigation";
import {
    MapPin,
    Star,
    Calendar,
    MessageSquare,
    Loader2,
    Check,
    X,
    Mail,
    Phone,
    MessageCircle,
    DollarSign,
    FileText,
    Download,
    ArrowLeftRight,
    History,
    Clock,
    CalendarDays,
    FileSignature,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { counterJobProposal, type JobCandidate } from "@/lib/data-service";
import { useState } from "react";
import apiClient from "@/lib/api-service";
import { downloadAgreementPdf } from "@/lib/pdf-generator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";
import {
    AgreementStatusBadge,
    CounterProposalDialog,
    NegotiationHistory,
    formatBRL,
    formatDateOnly,
} from "@/components/jobs/negotiation";

interface CandidateCardProps {
    candidate: JobCandidate;
    isProcessing: boolean;
    onStatusUpdate: (id: string, status: 'accepted' | 'rejected') => void;
    /** Chamado depois de uma contraproposta do contratante, para a página recarregar. */
    onNegotiationChanged?: () => void;
    jobBudgetValue: number;
    /** Abre o histórico já expandido (deep link ?candidatura=<id>). */
    highlighted?: boolean;
}

const apiErrorMessage = (error: unknown, fallback: string) => {
    const msg = (error as any)?.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(" ");
    return typeof msg === "string" && msg ? msg : fallback;
};

export function CandidateCard({
    candidate,
    isProcessing,
    onStatusUpdate,
    onNegotiationChanged,
    jobBudgetValue,
    highlighted = false,
}: CandidateCardProps) {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const jobId = params.id as string;
    const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);
    const [isCounterOpen, setIsCounterOpen] = useState(false);
    const [sendingCounter, setSendingCounter] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(highlighted);
    const [historyRefresh, setHistoryRefresh] = useState(0);
    const [startingChat, setStartingChat] = useState(false);
    const [generatingContract, setGeneratingContract] = useState(false);
    const [contractId, setContractId] = useState<string | null>(candidate.contractId ?? null);

    const agreementAccepted = candidate.agreementStatus === 'accepted';
    const inNegotiation = candidate.status === 'pending' && !agreementAccepted;

    // Fluxo integrado: acordo aceito → contrato digital pré-preenchido → assinatura
    const handleGenerateContract = async () => {
        if (contractId) {
            router.push(`/dashboard/contratos/${contractId}`);
            return;
        }
        setGeneratingContract(true);
        try {
            const res = await apiClient.post(`/contracts/from-application/${candidate.id}`);
            setContractId(res.data.id);
            router.push(`/dashboard/contratos/${res.data.id}`);
        } catch (error: any) {
            console.error("Erro ao gerar contrato:", error);
            if (!isPlanErrorBody(error?.response?.data)) {
                toast({
                    variant: "destructive",
                    title: "Não foi possível gerar o contrato",
                    description: apiErrorMessage(error, "Tente novamente em instantes."),
                });
            }
            setGeneratingContract(false);
        }
    };

    const handleStartChat = async () => {
        setStartingChat(true);
        try {
            const res = await apiClient.post("/chat/conversations", { participantId: candidate.profile.id });
            router.push(`/dashboard/chat/${res.data.id}`);
        } catch {
            setStartingChat(false);
        }
    };

    const handleDownloadPdf = () => {
        if (candidate.agreementText) {
            downloadAgreementPdf(candidate.profile.displayName, '', candidate.agreementText);
        }
    };

    /** Contraproposta do contratante (POST :id/counter) — sem cota, notifica o candidato. */
    const handleSendCounter = async (value: number, message: string) => {
        setSendingCounter(true);
        try {
            await counterJobProposal(candidate.id, { value, message });
            toast({ title: "Contraproposta enviada", description: `Você propôs ${formatBRL(value)} a ${candidate.profile.displayName}.` });
            setIsCounterOpen(false);
            setHistoryRefresh((k) => k + 1);
            onNegotiationChanged?.();
        } catch (error) {
            console.error("Erro ao enviar contraproposta:", error);
            if (!isPlanErrorBody((error as any)?.response?.data)) {
                toast({ variant: "destructive", title: "Erro", description: apiErrorMessage(error, "Não foi possível enviar a contraproposta.") });
            }
        } finally {
            setSendingCounter(false);
        }
    };

    const serviceDates = (() => {
        const start = candidate.agreementStartDate;
        const end = candidate.agreementEndDate ?? start;
        if (!start) return null;
        return start === end ? formatDateOnly(start) : `${formatDateOnly(start)} – ${formatDateOnly(end)}`;
    })();

    return (
        <>
            <Card className={`overflow-hidden hover:shadow-md transition-shadow ${highlighted ? "ring-2 ring-primary" : ""}`}>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-shrink-0">
                            <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                                <AvatarImage src={candidate.profile.avatarUrl} alt={candidate.profile.displayName} />
                                <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                                    {candidate.profile.displayName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-xl font-bold text-foreground">
                                            {candidate.profile.displayName}
                                        </h3>
                                        <AgreementStatusBadge
                                            status={candidate.status}
                                            agreementStatus={candidate.agreementStatus}
                                            contractId={contractId}
                                            labels={{ pending: "Pendente", rejected: "Rejeitado" }}
                                        />
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                        {candidate.profile.specialty && (
                                            <span className="font-medium text-foreground/80">{candidate.profile.specialty}</span>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <MapPin className="h-3.5 w-3.5" />
                                            <span>{candidate.profile.city || "N/A"}/{candidate.profile.state || "UF"}</span>
                                        </div>
                                        {candidate.profile.totalReviews && candidate.profile.totalReviews > 0 ? (
                                            <div className="flex items-center gap-1">
                                                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                                                <span>{candidate.profile.averageRating?.toFixed(1) || "5.0"} ({candidate.profile.totalReviews})</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-muted-foreground text-xs font-medium">
                                                <span>Sem avaliação</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>Aplicou em {format(new Date(candidate.createdAt), "d 'de' MMM", { locale: ptBR })}</span>
                                    </div>
                                    {!!candidate.counterProposal && candidate.counterProposal > 0 && (
                                        <div className="flex items-center gap-1.5 text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                                            <DollarSign className="h-3.5 w-3.5" />
                                            <span>Proposta do candidato: {formatBRL(candidate.counterProposal)}</span>
                                        </div>
                                    )}
                                    {!!candidate.employerCounterProposal && inNegotiation && (
                                        <div className="flex items-center gap-1.5 text-amber-700 font-bold bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                                            <ArrowLeftRight className="h-3.5 w-3.5" />
                                            <span>Sua contraproposta: {formatBRL(candidate.employerCounterProposal)}</span>
                                        </div>
                                    )}
                                    {agreementAccepted && candidate.agreementValue !== undefined && (
                                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                            <DollarSign className="h-3.5 w-3.5" />
                                            <span>Fechado: {formatBRL(candidate.agreementValue)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {candidate.message && (
                                <div className="bg-muted/30 p-3 rounded-md text-sm italic text-muted-foreground border">
                                    <div className="flex items-start gap-2">
                                        <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0 opacity-70" />
                                        <p>"{candidate.message}"</p>
                                    </div>
                                </div>
                            )}

                            {/* Resumo do acordo enviado */}
                            {candidate.agreementText && (
                                <div className="grid gap-1 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-2">
                                    <div className="flex items-center gap-2"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" /> Valor: <strong>{formatBRL(candidate.agreementValue)}</strong></div>
                                    {candidate.agreementDeadline && (
                                        <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-muted-foreground" /> Prazo: <strong>{candidate.agreementDeadline}</strong></div>
                                    )}
                                    {candidate.agreementLocation && (
                                        <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Local: <strong>{candidate.agreementLocation}</strong></div>
                                    )}
                                    {serviceDates && (
                                        <div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> Data: <strong>{serviceDates}</strong></div>
                                    )}
                                    {candidate.agreementStatus === 'rejected' && (
                                        <p className="sm:col-span-2 text-destructive">O candidato recusou este acordo. Você pode reenviar novos termos.</p>
                                    )}
                                    {candidate.agreementStatus === 'countered' && (
                                        <p className="sm:col-span-2 text-amber-700 dark:text-amber-300">
                                            O candidato contrapropôs {formatBRL(candidate.counterProposal)}. Reenvie o acordo com o novo valor ou faça outra contraproposta.
                                        </p>
                                    )}
                                    {agreementAccepted && !contractId && (
                                        <p className="sm:col-span-2 text-emerald-700 dark:text-emerald-300">Acordo aceito — gere o contrato digital para formalizar e bloquear a agenda.</p>
                                    )}
                                </div>
                            )}

                            {/* Histórico de negociação */}
                            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground">
                                        <History className="mr-1.5 h-3.5 w-3.5" />
                                        {historyOpen ? "Ocultar negociação" : "Ver histórico da negociação"}
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="pt-3">
                                    {historyOpen && (
                                        <NegotiationHistory applicationId={candidate.id} viewerRole="employer" refreshKey={historyRefresh} />
                                    )}
                                </CollapsibleContent>
                            </Collapsible>

                            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 justify-between">
                                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                    <Button size="sm" variant="outline" asChild className="flex-1 sm:flex-none">
                                        <Link href={`/profissionais/${candidate.profile.id}`} target="_blank">
                                            Ver Perfil Completo
                                        </Link>
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 sm:flex-none gap-1.5"
                                        onClick={handleStartChat}
                                        disabled={startingChat}
                                    >
                                        {startingChat ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <MessageSquare className="h-3.5 w-3.5" />
                                        )}
                                        Mensagem
                                    </Button>
                                    {candidate.agreementText && (
                                        <Button size="sm" variant="outline" onClick={() => setIsAgreementModalOpen(true)} className="flex-1 sm:flex-none">
                                            <FileText className="mr-2 h-4 w-4" /> Ver Acordo
                                        </Button>
                                    )}
                                    {candidate.status === 'accepted' && (
                                        <Button
                                            size="sm"
                                            className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground"
                                            onClick={handleGenerateContract}
                                            disabled={generatingContract}
                                        >
                                            {generatingContract ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <FileSignature className="mr-2 h-4 w-4" />
                                            )}
                                            {contractId ? "Ver Contrato Digital" : "Gerar Contrato Digital"}
                                        </Button>
                                    )}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                                                Entrar em Contato
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Opções de Contato</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {candidate.profile.email ? (
                                                <DropdownMenuItem asChild>
                                                    <a href={`mailto:${candidate.profile.email}`}>
                                                        <Mail className="mr-2 h-4 w-4" /> Email
                                                    </a>
                                                </DropdownMenuItem>
                                            ) : null}
                                            {candidate.profile.phone ? (
                                                <>
                                                    <DropdownMenuItem asChild>
                                                        <a href={`https://wa.me/${candidate.profile.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                                                            <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                                                        </a>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <a href={`tel:${candidate.profile.phone}`}>
                                                            <Phone className="mr-2 h-4 w-4" /> Telefone
                                                        </a>
                                                    </DropdownMenuItem>
                                                </>
                                            ) : null}
                                            {!candidate.profile.email && !candidate.profile.phone && (
                                                <DropdownMenuItem disabled>
                                                    Sem dados de contato
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {inNegotiation && (
                                    <div className="flex flex-wrap gap-2 w-full sm:w-auto pt-2 sm:pt-0">
                                        {candidate.agreementStatus !== 'pending_candidate' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1 sm:flex-none"
                                                onClick={() => setIsCounterOpen(true)}
                                                disabled={isProcessing}
                                            >
                                                <ArrowLeftRight className="mr-1 h-4 w-4" /> Contrapropor
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none"
                                            onClick={() => router.push(`/dashboard/vagas/${jobId}/acordo/${candidate.id}`)}
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <><Check className="mr-1 h-4 w-4" /> {candidate.agreementText ? "Reenviar Acordo" : "Gerar Acordo"}</>
                                            )}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="flex-1 sm:flex-none"
                                            onClick={() => onStatusUpdate(candidate.id, 'rejected')}
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <><X className="mr-1 h-4 w-4" /> Rejeitar</>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isAgreementModalOpen} onOpenChange={setIsAgreementModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Termo de Prestação de Serviços</DialogTitle>
                        <DialogDescription>
                            Revise os termos do acordo.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 bg-muted/30 border rounded-md font-mono text-sm whitespace-pre-wrap max-h-[50vh]">
                        {candidate.agreementText}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsAgreementModalOpen(false)}
                        >
                            Fechar
                        </Button>
                        <Button
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={handleDownloadPdf}
                        >
                            <Download className="mr-2 h-4 w-4" /> Baixar PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CounterProposalDialog
                open={isCounterOpen}
                onOpenChange={setIsCounterOpen}
                title="Contraproposta ao candidato"
                description="Proponha um valor. O candidato será notificado e poderá aceitar (você então envia o acordo) ou contrapropor."
                referenceLabel={candidate.counterProposal ? "Proposta do candidato" : "Orçamento da vaga"}
                referenceValue={candidate.counterProposal ?? (jobBudgetValue || null)}
                initialValue={candidate.employerCounterProposal ?? candidate.counterProposal ?? (jobBudgetValue || null)}
                submitting={sendingCounter}
                onSubmit={handleSendCounter}
            />
        </>
    );
}
