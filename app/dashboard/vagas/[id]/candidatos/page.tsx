"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchJobCandidates, fetchJobOfferById, updateJobApplicationStatus, type JobCandidate, type JobOffer } from "@/lib/data-service";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, Calendar, MessageSquare, ChevronLeft, Loader2, Check, X, User } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

export default function CandidatosVagaPage() {
    const params = useParams();
    const router = useRouter();
    const { userProfile, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [candidates, setCandidates] = useState<JobCandidate[]>([]);
    const [jobOffer, setJobOffer] = useState<JobOffer | null>(null);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

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
            await updateJobApplicationStatus(applicationId, status);

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
                description: "Não foi possível atualizar o status do candidato.",
                variant: "destructive",
            });
        } finally {
            setProcessingId(null);
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
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-sm py-1 px-3">
                                {candidates.length} {candidates.length === 1 ? 'Candidato' : 'Candidatos'}
                            </Badge>
                        </div>
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
                    <div className="grid gap-4">
                        {candidates.map((candidate) => (
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
                                                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                                                        Entrar em Contato
                                                    </Button>
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
            </main>

            <div className="hidden lg:block">
                <Footer />
            </div>
        </div>
    );
}
