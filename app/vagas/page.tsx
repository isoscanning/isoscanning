"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import {
    Briefcase,
    MapPin,
    Clock,
    DollarSign,
    Search,
    Filter,
} from "lucide-react";
import { fetchJobOffers, type JobOffer } from "@/lib/data-service";
import Link from "next/link";

export default function VagasPublicasPage() {
    const [vagas, setVagas] = useState<JobOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const loadVagas = async () => {
            try {
                const data = await fetchJobOffers();
                setVagas(data);
            } catch (error) {
                console.error("Erro ao buscar vagas:", error);
            } finally {
                setLoading(false);
            }
        };
        loadVagas();
    }, []);

    const filteredVagas = vagas.filter((vaga) =>
        vaga.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vaga.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vaga.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getJobTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            freelance: "Freelance",
            full_time: "Tempo Integral",
            part_time: "Meio Período",
            project: "Por Projeto",
        };
        return types[type] || type;
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 py-12 px-4">
                <div className="container mx-auto max-w-6xl space-y-8">
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl font-bold tracking-tight">Vagas e Oportunidades</h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Encontre seu próximo projeto audiovisual ou contrate os melhores profissionais do mercado.
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 max-w-4xl mx-auto">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por título, categoria ou descrição..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline">
                            <Filter className="mr-2 h-4 w-4" /> Filtros
                        </Button>
                        <Button asChild>
                            <Link href="/dashboard/vagas/nova">Publicar Vaga</Link>
                        </Button>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Card key={i} className="animate-pulse">
                                    <div className="h-40 bg-muted"></div>
                                    <CardContent className="p-6 space-y-4">
                                        <div className="h-6 bg-muted rounded w-3/4"></div>
                                        <div className="h-4 bg-muted rounded w-1/2"></div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : filteredVagas.length === 0 ? (
                        <div className="text-center py-20">
                            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium">Nenhuma vaga encontrada</h3>
                            <p className="text-muted-foreground">Tente ajustar sua busca ou filtros.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredVagas.map((vaga) => (
                                <Card key={vaga.id} className="hover:shadow-lg transition-shadow flex flex-col">
                                    <CardHeader>
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant="secondary">{vaga.category}</Badge>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(vaga.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <CardTitle className="text-xl line-clamp-2">{vaga.title}</CardTitle>
                                        <CardDescription className="font-medium text-primary">
                                            {vaga.employerName}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 space-y-4">
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Briefcase className="h-4 w-4" />
                                                <span>{getJobTypeLabel(vaga.jobType)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <MapPin className="h-4 w-4" />
                                                <span>
                                                    {vaga.locationType === "remote"
                                                        ? "Remoto"
                                                        : `${vaga.city || "Cidade não informada"}${vaga.state ? `, ${vaga.state}` : ""}`}
                                                </span>
                                            </div>
                                            {(vaga.budgetMin !== null && vaga.budgetMin !== undefined) ||
                                                (vaga.budgetMax !== null && vaga.budgetMax !== undefined) ? (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <DollarSign className="h-4 w-4" />
                                                    <span>
                                                        {vaga.budgetMin !== null && vaga.budgetMin !== undefined && `A partir de R$ ${vaga.budgetMin}`}
                                                        {!vaga.budgetMin && vaga.budgetMax !== null && vaga.budgetMax !== undefined && `Até R$ ${vaga.budgetMax}`}
                                                    </span>
                                                </div>
                                            ) : null}
                                        </div>

                                        <p className="text-sm line-clamp-3 text-muted-foreground">
                                            {vaga.description}
                                        </p>

                                        <Button className="w-full mt-4" asChild>
                                            <Link href={`/vagas/${vaga.id}`}>Ver Detalhes</Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
