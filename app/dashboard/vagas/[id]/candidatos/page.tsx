"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { fetchJobCandidates, fetchJobOfferById, type JobCandidate, type JobOffer } from "@/lib/data-service";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, Calendar, MessageSquare, ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CandidatosVagaPage() {
    const params = useParams();
    const router = useRouter();
    const { userProfile, loading: authLoading } = useAuth();
    const [candidates, setCandidates] = useState<JobCandidate[]>([]);
    const [jobOffer, setJobOffer] = useState<JobOffer | null>(null);
    const [loading, setLoading] = useState(true);

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

                                            <div className="flex items-center gap-3 pt-2">
                                                <Button size="sm" asChild>
                                                    <Link href={`/perfil/${candidate.profile.id}`}>
                                                        Ver Perfil Completo
                                                    </Link>
                                                </Button>
                                                <Button variant="outline" size="sm">
                                                    Entrar em Contato
                                                </Button>
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

import { User } from "lucide-react";
