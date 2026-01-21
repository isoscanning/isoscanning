"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchJobCandidates, fetchJobOfferById, updateJobApplicationStatus, updateJobStatus, type JobCandidate, type JobOffer } from "@/lib/data-service";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, Calendar, MessageSquare, ChevronLeft, Loader2, Check, X, User, Mail, Phone, MessageCircle, CheckCircle2, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

                    if (!jobData) {
                        router.push("/dashboard/vagas");
                        return;
                    }

                    // Verify ownership
                    if (jobData.employerId !== userProfile.id) {
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

    const handleStatusUpdate = async (applicationId: string, status: 'accepted' | 'rejected') => {
        setProcessingId(applicationId);
        try {
            const success = await updateJobApplicationStatus(applicationId, status);

            if (!success) {
                throw new Error("Falha ao atualizar status. Verifique as permissões.");
            }

            // Update local state
            setCandidates(candidates.map(c =>
                c.id === applicationId ? { ...c, status } : c
            ));

            toast({
                title: status === 'accepted' ? "Candidato aprovado!" : "Candidato rejeitado",
                description: status === 'accepted'
                    ? "O candidato foi marcado como aprovado."
                    : "O candidato foi marcado como rejeitado.",
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

    const handleConcludeJob = () => {
        setIsConcludeDialogOpen(true);
    };

    const confirmConclude = async () => {
        if (!jobOffer) return;

        try {
            await updateJobStatus(jobOffer.id, 'closed');
            setJobOffer({ ...jobOffer, status: 'closed', isActive: false });
            toast({
                title: "Vaga Concluída",
                description: "A vaga foi marcada como concluída com sucesso.",
            });
            setIsConcludeDialogOpen(false);
        } catch (error) {
            console.error("Erro ao concluir vaga:", error);
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Não foi possível concluir a vaga.",
            });
        }
    };

    const handleReopenJob = () => {
        setIsReopenDialogOpen(true);
    };

    const confirmReopen = async () => {
        if (!jobOffer) return;

        try {
            await updateJobStatus(jobOffer.id, 'open');
            setJobOffer({ ...jobOffer, status: 'open', isActive: true });
            toast({
                title: "Vaga Reaberta",
                description: "A vaga foi reaberta com sucesso.",
            });
            setIsReopenDialogOpen(false);
        } catch (error) {
            console.error("Erro ao reabrir vaga:", error);
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Não foi possível reabrir a vaga.",
            });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "accepted":
                return <Badge className="bg-emerald-500 hover:bg-emerald-600">Aprovado</Badge>;
            case "rejected":
                return <Badge variant="destructive">Rejeitado</Badge>;
            case "withdrawn":
                return <Badge variant="outline">Desistência</Badge>;
            default:
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300">Pendente</Badge>;
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
                            <Button
                                onClick={handleConcludeJob}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Concluir Vaga
                            </Button>
                        )}
                        {jobOffer.status === 'closed' && (
                            <Button
                                onClick={handleReopenJob}
                                variant="outline"
                            >
                                <RefreshCcw className="mr-2 h-4 w-4" /> Reabrir Vaga
                            </Button>
                        )}
                        <Badge variant="outline" className="text-sm py-1 px-3">
                            {candidates.length} {candidates.length === 1 ? 'Candidato' : 'Candidatos'}
                        </Badge>
                    </div>
                </div>


                {
                    candidates.length === 0 ? (
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
                                                    <p className="text-muted-foreground max-w-sm">
                                                        Não há candidatos nesta categoria.
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <div className="grid gap-4">
                                            {candidates
                                                .filter(c => tabValue === "all" || c.status === tabValue)
                                                .map((candidate) => (
                                                    <Card key={candidate.id} className="overflow-hidden hover:shadow-md transition-shadow">
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
                                                                                {getStatusBadge(candidate.status)}
                                                                            </div>

                                                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                                                                {candidate.profile.specialty && (
                                                                                    <span className="font-medium text-foreground/80">{candidate.profile.specialty}</span>
                                                                                )}
                                                                                <div className="flex items-center gap-1">
                                                                                    <MapPin className="h-3.5 w-3.5" />
                                                                                    <span>{candidate.profile.city || "N/A"}/{candidate.profile.state || "UF"}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-1">
                                                                                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                                                                                    <span>{candidate.profile.averageRating?.toFixed(1) || "New"} ({candidate.profile.totalReviews || 0})</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Calendar className="h-3.5 w-3.5" />
                                                                                <span>Aplicou em {format(new Date(candidate.createdAt), "d 'de' MMM", { locale: ptBR })}</span>
                                                                            </div>
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

                                                                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 justify-between">
                                                                        <div className="flex gap-2 w-full sm:w-auto">
                                                                            <Button size="sm" variant="outline" asChild className="flex-1 sm:flex-none">
                                                                                <Link href={`/profissionais/${candidate.profile.id}`} target="_blank">
                                                                                    Ver Perfil Completo
                                                                                </Link>
                                                                            </Button>
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

                                                                        {candidate.status === 'pending' && (
                                                                            <div className="flex gap-2 w-full sm:w-auto pt-2 sm:pt-0">
                                                                                <Button
                                                                                    size="sm"
                                                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none"
                                                                                    onClick={() => handleStatusUpdate(candidate.id, 'accepted')}
                                                                                    disabled={processingId === candidate.id}
                                                                                >
                                                                                    {processingId === candidate.id ? (
                                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                                    ) : (
                                                                                        <>
                                                                                            <Check className="mr-1 h-4 w-4" /> Aprovar
                                                                                        </>
                                                                                    )}
                                                                                </Button>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="destructive"
                                                                                    className="flex-1 sm:flex-none"
                                                                                    onClick={() => handleStatusUpdate(candidate.id, 'rejected')}
                                                                                    disabled={processingId === candidate.id}
                                                                                >
                                                                                    {processingId === candidate.id ? (
                                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                                    ) : (
                                                                                        <>
                                                                                            <X className="mr-1 h-4 w-4" /> Rejeitar
                                                                                        </>
                                                                                    )}
                                                                                </Button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                        </div>
                                    )}
                                </TabsContent>
                            ))}
                        </Tabs>
                    )
                }
            </main>

            <div className="hidden lg:block">
                <Footer />
            </div>

            <AlertDialog open={isConcludeDialogOpen} onOpenChange={setIsConcludeDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Concluir Vaga?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja concluir esta vaga? Isso irá marcá-la como fechada e não receberá novas candidaturas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmConclude();
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            Confirmar Conclusão
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isReopenDialogOpen} onOpenChange={setIsReopenDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reabrir Vaga?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja reabrir esta vaga? Ela ficará visível para novos candidatos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmReopen();
                            }}
                        >
                            Confirmar Reabertura
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
