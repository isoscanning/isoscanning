"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Briefcase,
    MapPin,
    Clock,
    DollarSign,
    ChevronLeft,
    Calendar,
    User,
    CheckCircle2,
} from "lucide-react";
import { fetchJobOfferById, type JobOffer } from "@/lib/data-service";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function DetalhesVagaPage() {
    const params = useParams();
    const router = useRouter();
    const [vaga, setVaga] = useState<JobOffer | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadVaga = async () => {
            if (!params.id) return;
            try {
                const data = await fetchJobOfferById(params.id as string);
                setVaga(data);
            } catch (error) {
                console.error("Erro ao buscar vaga:", error);
                setVaga(null);
            } finally {
                setLoading(false);
            }
        };
        loadVaga();
    }, [params.id]);

    const getJobTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            freelance: "Freelance",
            full_time: "Tempo Integral",
            part_time: "Meio Período",
            project: "Por Projeto",
        };
        return types[type] || type;
    };

    const getLocationLabel = (type: string) => {
        const types: Record<string, string> = {
            on_site: "Presencial",
            remote: "Remoto",
            hybrid: "Híbrido",
        };
        return types[type] || type;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!vaga) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex flex-col items-center justify-center p-4">
                    <h1 className="text-2xl font-bold">Vaga não encontrada</h1>
                    <Button variant="link" onClick={() => router.back()}>
                        Voltar
                    </Button>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 py-12 px-4">
                <div className="container mx-auto max-w-4xl space-y-8">
                    <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
                        <ChevronLeft className="mr-2 h-4 w-4" /> Voltar para vagas
                    </Button>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <Badge variant="secondary">{vaga.category}</Badge>
                                    <Badge variant="outline">{getJobTypeLabel(vaga.jobType)}</Badge>
                                    <Badge variant="outline">{getLocationLabel(vaga.locationType)}</Badge>
                                </div>
                                <h1 className="text-4xl font-bold">{vaga.title}</h1>
                                <p className="text-xl text-muted-foreground mt-2 flex items-center gap-2">
                                    <User className="h-5 w-5" /> {vaga.employerName}
                                </p>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Descrição da Vaga</CardTitle>
                                </CardHeader>
                                <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                                    <p className="whitespace-pre-wrap text-base leading-relaxed">
                                        {vaga.description}
                                    </p>
                                </CardContent>
                            </Card>

                            {vaga.requirements && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Requisitos e Equipamentos</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="whitespace-pre-wrap text-base leading-relaxed">
                                            {vaga.requirements}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Detalhes</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-5 w-5 text-primary mt-0.5" />
                                        <div>
                                            <p className="font-medium">Localização</p>
                                            <p className="text-sm text-muted-foreground">
                                                {vaga.locationType === "remote"
                                                    ? "Trabalho Remoto"
                                                    : `${vaga.city || "Cidade não informada"}${vaga.state ? `, ${vaga.state}` : ""}`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                                        <div>
                                            <p className="font-medium">Orçamento</p>
                                            <p className="text-sm text-muted-foreground">
                                                {(vaga.budgetMin !== null && vaga.budgetMin !== undefined) ||
                                                    (vaga.budgetMax !== null && vaga.budgetMax !== undefined) ? (
                                                    <>
                                                        {vaga.budgetMin !== null && vaga.budgetMin !== undefined && `R$ ${vaga.budgetMin}`}
                                                        {vaga.budgetMin !== null && vaga.budgetMin !== undefined &&
                                                            vaga.budgetMax !== null && vaga.budgetMax !== undefined && " - "}
                                                        {vaga.budgetMax !== null && vaga.budgetMax !== undefined && `R$ ${vaga.budgetMax}`}
                                                    </>
                                                ) : (
                                                    "A combinar"
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <Calendar className="h-5 w-5 text-primary mt-0.5" />
                                        <div>
                                            <p className="font-medium">Publicado em</p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(vaga.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                                        <div>
                                            <p className="font-medium">Status</p>
                                            <p className="text-sm text-muted-foreground">
                                                {vaga.isActive ? "Recebendo candidaturas" : "Encerrada"}
                                            </p>
                                        </div>
                                    </div>

                                    <Button className="w-full mt-4" size="lg">
                                        Candidatar-se
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Sobre o Empregador</CardTitle>
                                </CardHeader>
                                <CardContent className="text-center space-y-4">
                                    <div className="w-20 h-20 mx-auto">
                                        <Avatar className="w-full h-full">
                                            <AvatarImage src={vaga.employerAvatarUrl || ""} alt={vaga.employerName} />
                                            <AvatarFallback>
                                                <User className="h-10 w-10 text-muted-foreground" />
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg">{vaga.employerName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Membro desde {vaga.employerCreatedAt
                                                ? new Date(vaga.employerCreatedAt).getFullYear()
                                                : "2024"}
                                        </p>
                                    </div>
                                    <Button variant="outline" className="w-full" asChild>
                                        <Link href={`/profissionais/${vaga.employerId}`}>Ver Perfil</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
