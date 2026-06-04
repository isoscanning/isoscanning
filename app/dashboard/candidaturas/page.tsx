"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchUserApplications, applyToJob, respondToJobAgreement, type JobApplication } from "@/lib/data-service";
import { downloadAgreementPdf } from "@/lib/pdf-generator";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Clock, Building2, ChevronRight, Loader2, MessageSquare, DollarSign, FileText, Download } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export default function MinhasCandidaturasPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
    const [proposalValue, setProposalValue] = useState("");
    const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
    const [agreementToReview, setAgreementToReview] = useState<JobApplication | null>(null);
    const [isRespondingToAgreement, setIsRespondingToAgreement] = useState(false);

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

    const handleSendProposal = async () => {
        if (!userProfile || !selectedApplication) return;
        
        const numericValue = parseFloat(proposalValue.replace(/[^0-9,-]+/g, "").replace(",", "."));
        if (isNaN(numericValue) || numericValue <= 0) {
            toast({
                variant: "destructive",
                title: "Valor inválido",
                description: "Por favor, insira um valor válido para a sua proposta."
            });
            return;
        }

        setIsSubmittingProposal(true);
        try {
            await applyToJob(selectedApplication.jobOfferId, userProfile.id, selectedApplication.message, numericValue);
            
            toast({
                title: "Proposta enviada",
                description: "Sua proposta de valor foi enviada com sucesso."
            });
            
            // Reload applications
            const data = await fetchUserApplications(userProfile.id);
            setApplications(data);
            setSelectedApplication(null);
            setProposalValue("");
        } catch (error) {
            console.error("Erro ao enviar proposta:", error);
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Ocorreu um erro ao enviar sua proposta. Tente novamente."
            });
        } finally {
            setIsSubmittingProposal(false);
        }
    };

    const getStatusBadge = (status: string, agreementStatus?: string) => {
        if (agreementStatus === 'pending_candidate') {
            return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Acordo Pendente</Badge>;
        }
        
        switch (status) {
            case "accepted":
                return <Badge className="bg-emerald-500 hover:bg-emerald-600">Aprovado</Badge>;
            case "rejected":
                return <Badge variant="destructive">Não Selecionado</Badge>;
            case "withdrawn":
                return <Badge variant="outline">Desistência</Badge>;
            default:
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300">Em Análise</Badge>;
        }
    };

    const handleRespondAgreement = async (response: 'accepted' | 'rejected') => {
        if (!agreementToReview || !userProfile) return;
        
        setIsRespondingToAgreement(true);
        try {
            await respondToJobAgreement(agreementToReview.id, response);
            toast({
                title: response === 'accepted' ? "Acordo Aceito" : "Acordo Recusado",
                description: response === 'accepted' 
                    ? "A vaga foi oficializada com sucesso!" 
                    : "Você recusou os termos do acordo.",
            });
            
            // Reload applications
            const data = await fetchUserApplications(userProfile.id);
            setApplications(data);
            setAgreementToReview(null);
        } catch (error) {
            console.error("Erro ao responder ao acordo:", error);
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Ocorreu um erro ao responder ao termo de acordo."
            });
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

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Minhas Candidaturas</h1>
                        <p className="text-muted-foreground mt-1">
                            Acompanhe o status das vagas que você se candidatou.
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
                        {applications.map((app) => (
                            <Card key={app.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                <CardContent className="p-0">
                                    <div className="flex flex-col md:flex-row md:items-center p-6 gap-6">
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-start justify-between md:hidden">
                                                {getStatusBadge(app.status, app.agreementStatus)}
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

                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground mt-2">
                                                <div className="flex items-center gap-1.5 py-1 px-3 bg-muted/50 rounded-full border">
                                                    <DollarSign className="h-4 w-4 text-foreground/70" />
                                                    <span className="font-semibold text-foreground">
                                                        Vaga:{" "}
                                                        {(app.jobOffer.budgetMin !== null && app.jobOffer.budgetMin !== undefined) ||
                                                            (app.jobOffer.budgetMax !== null && app.jobOffer.budgetMax !== undefined) ? (
                                                            <>
                                                                {app.jobOffer.budgetMin !== null && app.jobOffer.budgetMin !== undefined && `R$ ${app.jobOffer.budgetMin}`}
                                                                {app.jobOffer.budgetMin !== null && app.jobOffer.budgetMin !== undefined &&
                                                                    app.jobOffer.budgetMax !== null && app.jobOffer.budgetMax !== undefined && " - "}
                                                                {app.jobOffer.budgetMax !== null && app.jobOffer.budgetMax !== undefined && `R$ ${app.jobOffer.budgetMax}`}
                                                            </>
                                                        ) : (
                                                            "A combinar"
                                                        )}
                                                    </span>
                                                </div>

                                                {(app.jobOffer.budgetMin === null || app.jobOffer.budgetMin === undefined) &&
                                                    (app.jobOffer.budgetMax === null || app.jobOffer.budgetMax === undefined) && 
                                                    !app.counterProposal ? (
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        className="h-7 text-xs rounded-full bg-muted/30 border-dashed hover:bg-muted"
                                                        onClick={() => setSelectedApplication(app)}
                                                    >
                                                        <DollarSign className="h-3.5 w-3.5 mr-1" />
                                                        Enviar proposta
                                                    </Button>
                                                ) : (
                                                    <div className={`flex items-center gap-1.5 py-1 px-3 rounded-full border ${app.counterProposal ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-muted/30 border-dashed"}`}>
                                                        <DollarSign className={`h-4 w-4 ${app.counterProposal ? "text-emerald-600" : "text-muted-foreground"}`} />
                                                        <span className={app.counterProposal ? "font-bold" : "text-muted-foreground"}>
                                                            {app.counterProposal ? `Minha Proposta: R$ ${app.counterProposal}` : "Sem contraproposta"}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-3 min-w-[140px]">
                                            <div className="hidden md:flex flex-col items-end gap-1 mb-1">
                                                {getStatusBadge(app.status, app.agreementStatus)}
                                                <span className="text-xs text-muted-foreground mt-1">
                                                    Candidatado em {format(new Date(app.createdAt), "d 'de' MMM", { locale: ptBR })}
                                                </span>
                                            </div>
                                            <Button variant="outline" size="sm" className="w-full md:w-auto" asChild>
                                                <Link href={`/vagas/${app.jobOfferId}`}>
                                                    Ver Detalhes <ChevronRight className="ml-2 h-4 w-4" />
                                                </Link>
                                            </Button>

                                            {app.agreementStatus === 'pending_candidate' && (
                                                <Button 
                                                    size="sm" 
                                                    className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-white shadow-sm" 
                                                    onClick={() => setAgreementToReview(app)}
                                                >
                                                    Analisar Acordo
                                                </Button>
                                            )}

                                            {app.status === 'accepted' && (
                                                <>
                                                    {app.agreementText && (
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            className="w-full md:w-auto shadow-sm" 
                                                            onClick={() => setAgreementToReview(app)}
                                                        >
                                                            <FileText className="mr-2 h-4 w-4" /> Ver Contrato
                                                        </Button>
                                                    )}
                                                    <Button size="sm" className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white shadow-sm" asChild>
                                                        <Link href={`/profissionais/${app.jobOffer.employerId}`}>
                                                            Entrar em Contato <MessageSquare className="ml-2 h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>

            <Dialog open={!!selectedApplication} onOpenChange={(open) => !open && setSelectedApplication(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enviar Proposta de Valor</DialogTitle>
                        <DialogDescription>
                            Esta vaga não possui um valor pré-definido. Envie a sua proposta para avaliação do contratante.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="proposal-value">Sua proposta (R$)</Label>
                            <Input
                                id="proposal-value"
                                placeholder="0,00"
                                value={proposalValue}
                                onChange={(e) => setProposalValue(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedApplication(null)} disabled={isSubmittingProposal}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSendProposal} disabled={isSubmittingProposal}>
                            {isSubmittingProposal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enviar Proposta
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!agreementToReview} onOpenChange={(open) => !open && setAgreementToReview(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Termo de Prestação de Serviços</DialogTitle>
                        <DialogDescription>
                            Revise os termos gerados pelo contratante. Ao aceitar, a vaga será oficialmente confirmada.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto p-4 bg-muted/30 border rounded-md font-mono text-sm whitespace-pre-wrap max-h-[50vh]">
                        {agreementToReview?.agreementText}
                    </div>
                    
                    <DialogFooter className="gap-2 sm:gap-0 mt-4 flex-wrap sm:flex-nowrap">
                        {agreementToReview?.agreementStatus === 'pending_candidate' && (
                            <Button 
                                variant="destructive" 
                                onClick={() => handleRespondAgreement('rejected')} 
                                disabled={isRespondingToAgreement}
                            >
                                Recusar Termos
                            </Button>
                        )}
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                if (agreementToReview?.agreementText) {
                                    downloadAgreementPdf(userProfile.displayName, agreementToReview.jobOffer.employerName, agreementToReview.agreementText);
                                }
                            }}
                            className={agreementToReview?.agreementStatus === 'pending_candidate' ? "mr-auto" : ""}
                        >
                            <Download className="mr-2 h-4 w-4" /> Baixar PDF
                        </Button>
                        
                        {agreementToReview?.agreementStatus === 'pending_candidate' ? (
                            <Button 
                                className="bg-emerald-600 hover:bg-emerald-700" 
                                onClick={() => handleRespondAgreement('accepted')} 
                                disabled={isRespondingToAgreement}
                            >
                                {isRespondingToAgreement && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Aceitar e Finalizar
                            </Button>
                        ) : (
                            <Button 
                                variant="outline"
                                onClick={() => setAgreementToReview(null)} 
                            >
                                Fechar
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="hidden lg:block">
                <Footer />
            </div>
        </div>
    );
}
