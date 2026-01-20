"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Briefcase,
    MapPin,
    Plus,
    Trash2,
    Edit,
    Clock,
    DollarSign,
    Pause,
    Play,
    User,
    MoreVertical,
    Calendar,
    Search
} from "lucide-react";
import { fetchUserJobOffers, deleteJobOffer, updateJobOffer, type JobOffer } from "@/lib/data-service";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MinhasVagasPage() {
    const router = useRouter();
    const { userProfile, loading } = useAuth();
    const [vagas, setVagas] = useState<JobOffer[]>([]);
    const [loadingVagas, setLoadingVagas] = useState(true);

    const fetchVagas = useCallback(async () => {
        if (!userProfile) return;
        setLoadingVagas(true);
        try {
            const data = await fetchUserJobOffers(userProfile.id);
            setVagas(data);
        } catch (error) {
            console.error("Erro ao buscar vagas:", error);
        } finally {
            setLoadingVagas(false);
        }
    }, [userProfile]);

    useEffect(() => {
        if (!loading && !userProfile) {
            router.push("/login");
        } else if (userProfile) {
            fetchVagas();
        }
    }, [userProfile, loading, router, fetchVagas]);

    const handleToggleActive = async (vaga: JobOffer) => {
        try {
            await updateJobOffer(vaga.id, { isActive: !vaga.isActive });
            setVagas(vagas.map((v) => v.id === vaga.id ? { ...v, isActive: !v.isActive } : v));
        } catch (error) {
            console.error("Erro ao alterar status da vaga:", error);
            alert("Erro ao alterar status da vaga");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta vaga?")) return;

        try {
            await deleteJobOffer(id);
            setVagas(vagas.filter((v) => v.id !== id));
        } catch (error) {
            console.error("Erro ao excluir vaga:", error);
            alert("Erro ao excluir vaga");
        }
    };

    const getJobTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            freelance: "Freelance",
            full_time: "Tempo Integral",
            part_time: "Meio Período",
            project: "Por Projeto",
        };
        return types[type] || type;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!userProfile) return null;

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />

            <main className="flex-1 py-12 px-4">
                <div className="container mx-auto max-w-5xl space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Minhas Vagas</h1>
                            <p className="text-muted-foreground mt-1">
                                Gerencie suas oportunidades publicadas e acompanhe candidatos.
                            </p>
                        </div>
                        <Button asChild className="shadow-sm">
                            <Link href="/dashboard/vagas/nova">
                                <Plus className="mr-2 h-4 w-4" /> Publicar Nova Vaga
                            </Link>
                        </Button>
                    </div>

                    {loadingVagas ? (
                        <div className="grid grid-cols-1 gap-6">
                            {[1, 2].map((i) => (
                                <Card key={i} className="animate-pulse">
                                    <div className="h-48 bg-muted rounded-t-lg"></div>
                                    <CardContent className="p-6 space-y-4">
                                        <div className="h-6 bg-muted rounded w-3/4"></div>
                                        <div className="h-4 bg-muted rounded w-1/2"></div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : vagas.length === 0 ? (
                        <Card className="text-center py-16 border-dashed">
                            <CardContent className="space-y-6">
                                <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                                    <Briefcase className="h-10 w-10 text-muted-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <CardTitle className="text-xl">Nenhuma vaga publicada</CardTitle>
                                    <CardDescription className="text-base max-w-md mx-auto">
                                        Você ainda não publicou nenhuma oferta de emprego. Comece agora mesmo a encontrar os melhores profissionais.
                                    </CardDescription>
                                </div>
                                <Button asChild size="lg">
                                    <Link href="/dashboard/vagas/nova">Criar Primeira Vaga</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {vagas.map((vaga) => (
                                <Card key={vaga.id} className={`overflow-hidden transition-all hover:shadow-md ${!vaga.isActive ? 'opacity-75 bg-muted/30' : ''}`}>
                                    <CardContent className="p-0">
                                        <div className="flex flex-col md:flex-row">
                                            {/* Status Strip */}
                                            <div className={`w-full md:w-2 h-2 md:h-auto ${vaga.isActive ? 'bg-green-500' : 'bg-yellow-500'}`} />

                                            <div className="flex-1 p-6 space-y-4">
                                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Badge variant={vaga.isActive ? "default" : "secondary"} className={vaga.isActive ? "bg-green-600 hover:bg-green-700" : ""}>
                                                                {vaga.isActive ? "Ativa" : "Pausada"}
                                                            </Badge>
                                                            <Badge variant="outline" className="text-muted-foreground">
                                                                {vaga.category}
                                                            </Badge>
                                                        </div>
                                                        <h3 className="text-xl font-bold text-foreground line-clamp-1">
                                                            {vaga.title}
                                                        </h3>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            <span>Publicado em {format(new Date(vaga.createdAt), "d 'de' MMM, yyyy", { locale: ptBR })}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Button variant="outline" size="sm" asChild className="hidden md:flex">
                                                            <Link href={`/dashboard/vagas/${vaga.id}/candidatos`}>
                                                                <User className="mr-2 h-4 w-4" />
                                                                Ver Candidatos
                                                            </Link>
                                                        </Button>

                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                    <span className="sr-only">Ações</span>
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Ações da Vaga</DropdownMenuLabel>
                                                                <DropdownMenuItem asChild className="md:hidden">
                                                                    <Link href={`/dashboard/vagas/${vaga.id}/candidatos`}>
                                                                        <User className="mr-2 h-4 w-4" /> Ver Candidatos
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/vagas/${vaga.id}`} target="_blank">
                                                                        <Search className="mr-2 h-4 w-4" /> Visualizar Vaga
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={`/dashboard/vagas/editar/${vaga.id}`}>
                                                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleToggleActive(vaga)}>
                                                                    {vaga.isActive ? (
                                                                        <>
                                                                            <Pause className="mr-2 h-4 w-4" /> Pausar Vaga
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Play className="mr-2 h-4 w-4" /> Reativar Vaga
                                                                        </>
                                                                    )}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-destructive focus:text-destructive"
                                                                    onClick={() => handleDelete(vaga.id)}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Excluir Vaga
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Briefcase className="h-4 w-4 text-primary/70" />
                                                        <span>{getJobTypeLabel(vaga.jobType)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <MapPin className="h-4 w-4 text-primary/70" />
                                                        <span>
                                                            {vaga.locationType === "remote"
                                                                ? "Remoto"
                                                                : `${vaga.city || "Cidade não informada"}/${vaga.state || "UF"}`}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
                                                        <DollarSign className="h-4 w-4 text-primary/70" />
                                                        <span>
                                                            {(vaga.budgetMin || vaga.budgetMax) ? (
                                                                <>
                                                                    {vaga.budgetMin && `R$ ${vaga.budgetMin}`}
                                                                    {vaga.budgetMin && vaga.budgetMax && " - "}
                                                                    {vaga.budgetMax && `R$ ${vaga.budgetMax}`}
                                                                </>
                                                            ) : "A combinar"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
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
