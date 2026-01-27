"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchJobCandidates, fetchJobOfferById, updateJobApplicationStatus, updateJobStatus, type JobCandidate, type JobOffer } from "@/lib/data-service";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, User, CheckCircle2, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CandidateCard } from "./components/candidate-card";

export default function CandidatosVagaPage() {
    const params = useParams();
    const router = useRouter();
    const { userProfile, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [candidates, setCandidates] = useState<JobCandidate[]>([]);
    const [jobOffer, setJobOffer] = useState<JobOffer | null>(null);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isConcludeDialogOpen, setIsConcludeDialogOpen] = useState(false);
    const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (userProfile && params.id) {
                try {
                    const [jobData, candidatesData] = await Promise.all([
                        fetchJobOfferById(params.id as string),
                        fetchJobCandidates(params.id as string)
                    ]);

                    if (!jobData || jobData.employerId !== userProfile.id) {
                        router.push("/dashboard/vagas");
                        return;
                    }

                    setJobOffer(jobData);
                    setCandidates(candidatesData);
                } catch (error) {
                    console.error("Erro ao carregar dados:", error);
                } finally {
                    setLoading(false);
                }
            } else if (!authLoading && !userProfile) {
                router.push("/login");
            }
        };

        loadData();
    }, [userProfile, authLoading, params.id, router]);

    const handleStatusUpdate = async (applicationId: string, status: 'accepted' | 'rejected', agreedValue?: number) => {
        setProcessingId(applicationId);
        try {
            const success = await updateJobApplicationStatus(applicationId, status, agreedValue);

            if (!success) throw new Error("Falha ao atualizar status.");

            setCandidates(candidates.map(c => c.id === applicationId ? { ...c, status, agreedValue: status === 'accepted' ? agreedValue : undefined } : c));

            toast({
                title: status === 'accepted' ? "Candidato aprovado!" : "Candidato rejeitado",
                description: status === 'accepted' ? "O candidato foi marcado como aprovado." : "O candidato foi marcado como rejeitado.",
                variant: status === 'accepted' ? "default" : "destructive",
            });
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            toast({
                title: "Erro ao atualizar",
                description: "Não foi possível atualizar o status do candidato. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setProcessingId(null);
        }
    };

    const confirmConclude = async () => {
        if (!jobOffer) return;
        try {
            await updateJobStatus(jobOffer.id, 'closed');
            setJobOffer({ ...jobOffer, status: 'closed', isActive: false });
            toast({ title: "Vaga Concluída", description: "A vaga foi marcada como concluída com sucesso." });
            setIsConcludeDialogOpen(false);
        } catch (error) {
            console.error("Erro ao concluir vaga:", error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível concluir a vaga." });
        }
    };

    const confirmReopen = async () => {
        if (!jobOffer) return;
        try {
            await updateJobStatus(jobOffer.id, 'open');
            setJobOffer({ ...jobOffer, status: 'open', isActive: true });
            toast({ title: "Vaga Reaberta", description: "A vaga foi reaberta com sucesso." });
            setIsReopenDialogOpen(false);
        } catch (error) {
            console.error("Erro ao reabrir vaga:", error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível reabrir a vaga." });
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex flex-col bg-background">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </main>
                <Footer />
            </div>
        );
    }

    if (!jobOffer) return null;

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
                <div className="mb-8">
                    <Button variant="ghost" size="sm" className="mb-4 pl-0 hover:bg-transparent hover:text-primary" asChild>
                        <Link href="/dashboard/vagas">
                            <ChevronLeft className="mr-2 h-4 w-4" /> Voltar para Minhas Vagas
                        </Link>
                    </Button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Candidatos</h1>
                            <p className="text-muted-foreground mt-1">
                                Gerencie as candidaturas para a vaga <span className="font-medium text-foreground">"{jobOffer.title}"</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        {jobOffer.status === 'open' && (
                            <Button onClick={() => setIsConcludeDialogOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Concluir Vaga
                            </Button>
                        )}
                        {jobOffer.status === 'closed' && (
                            <Button onClick={() => setIsReopenDialogOpen(true)} variant="outline">
                                <RefreshCcw className="mr-2 h-4 w-4" /> Reabrir Vaga
                            </Button>
                        )}
                        <Badge variant="outline" className="text-sm py-1 px-3">
                            {candidates.length} {candidates.length === 1 ? 'Candidato' : 'Candidatos'}
                        </Badge>
                    </div>
                </div>

                {candidates.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                            <div className="bg-muted rounded-full p-4">
                                <User className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">Nenhum candidato ainda</h3>
                                <p className="text-muted-foreground max-w-sm">
                                    Esta vaga ainda não recebeu nenhuma candidatura. Compartilhe o link da vaga para atrair mais profissionais!
                                </p>
                            </div>
                            <Button asChild variant="outline">
                                <Link href={`/vagas/${jobOffer.id}`}>Ver Vaga Pública</Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Tabs defaultValue="all" className="w-full">
                        <div className="flex items-center justify-between mb-4">
                            <TabsList>
                                <TabsTrigger value="all">Todos</TabsTrigger>
                                <TabsTrigger value="pending">Pendentes</TabsTrigger>
                                <TabsTrigger value="accepted">Aprovados</TabsTrigger>
                                <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
                            </TabsList>
                        </div>

                        {["all", "pending", "accepted", "rejected"].map((tabValue) => (
                            <TabsContent key={tabValue} value={tabValue} className="mt-0">
                                {candidates.filter(c => tabValue === "all" || c.status === tabValue).length === 0 ? (
                                    <Card className="border-dashed">
                                        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                                            <div className="bg-muted rounded-full p-4">
                                                <User className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-lg font-semibold">Nenhum candidato encontrado</h3>
                                                <p className="text-muted-foreground max-w-sm">Não há candidatos nesta categoria.</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="grid gap-4">
                                        {candidates
                                            .filter(c => tabValue === "all" || c.status === tabValue)
                                            .map((candidate) => (
                                                <CandidateCard
                                                    key={candidate.id}
                                                    candidate={candidate}
                                                    isProcessing={processingId === candidate.id}
                                                    onStatusUpdate={handleStatusUpdate}
                                                    jobBudgetValue={jobOffer.budgetMax || jobOffer.budgetMin || 0}
                                                />
                                            ))}
                                    </div>
                                )}
                            </TabsContent>
                        ))}
                    </Tabs>
                )}
            </main>

            <div className="hidden lg:block"><Footer /></div>

            <AlertDialog open={isConcludeDialogOpen} onOpenChange={setIsConcludeDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Concluir Vaga?</AlertDialogTitle>
                        <AlertDialogDescription>Tem certeza que deseja concluir esta vaga? Isso irá marcá-la como fechada.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmConclude(); }} className="bg-green-600 hover:bg-green-700 text-white">Confirmar Conclusão</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isReopenDialogOpen} onOpenChange={setIsReopenDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reabrir Vaga?</AlertDialogTitle>
                        <AlertDialogDescription>Tem certeza que deseja reabrir esta vaga?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmReopen(); }}>Confirmar Reabertura</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
