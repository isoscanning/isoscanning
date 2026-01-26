"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { fetchUserApplications, type JobApplication } from "@/lib/data-service";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Clock, Building2, ChevronRight, Loader2, MessageSquare, DollarSign } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MinhasCandidaturasPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const [applications, setApplications] = useState<JobApplication[]>([]);
    const [loading, setLoading] = useState(true);

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

    const getStatusBadge = (status: string) => {
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
                                                {getStatusBadge(app.status)}
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

                                                <div className={`flex items-center gap-1.5 py-1 px-3 rounded-full border ${app.counterProposal ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-muted/30 border-dashed"}`}>
                                                    <DollarSign className={`h-4 w-4 ${app.counterProposal ? "text-emerald-600" : "text-muted-foreground"}`} />
                                                    <span className={app.counterProposal ? "font-bold" : "text-muted-foreground"}>
                                                        {app.counterProposal ? `Minha Proposta: R$ ${app.counterProposal}` : "Sem contraproposta"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-3 min-w-[140px]">
                                            <div className="hidden md:flex flex-col items-end gap-1 mb-1">
                                                {getStatusBadge(app.status)}
                                                <span className="text-xs text-muted-foreground mt-1">
                                                    Candidatado em {format(new Date(app.createdAt), "d 'de' MMM", { locale: ptBR })}
                                                </span>
                                            </div>
                                            <Button variant="outline" size="sm" className="w-full md:w-auto" asChild>
                                                <Link href={`/vagas/${app.jobOfferId}`}>
                                                    Ver Detalhes <ChevronRight className="ml-2 h-4 w-4" />
                                                </Link>
                                            </Button>

                                            {app.status === 'accepted' && (
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
