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
    Loader2,
} from "lucide-react";
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
import { fetchUserJobOffers, deleteJobOffer, updateJobOffer, type JobOffer } from "@/lib/data-service";
import Link from "next/link";

export default function MinhasVagasPage() {
    const router = useRouter();
    const { userProfile, loading } = useAuth();
    const [vagas, setVagas] = useState<JobOffer[]>([]);
    const [loadingVagas, setLoadingVagas] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [vagaToDelete, setVagaToDelete] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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

    const handleDeleteClick = (id: string) => {
        setVagaToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!vagaToDelete) return;

        setIsDeleting(true);
        try {
            await deleteJobOffer(vagaToDelete);
            setVagas(vagas.filter((v) => v.id !== vagaToDelete));
            setIsDeleteDialogOpen(false);
        } catch (error) {
            console.error("Erro ao excluir vaga:", error);
            alert("Erro ao excluir vaga");
        } finally {
            setIsDeleting(false);
            setVagaToDelete(null);
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

    if (!userProfile) return null;

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 py-12 px-4">
                <div className="container mx-auto max-w-5xl space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold">Minhas Vagas</h1>
                            <p className="text-muted-foreground mt-2">
                                Gerencie as oportunidades que você publicou
                            </p>
                        </div>
                        <Button asChild>
                            <Link href="/dashboard/vagas/nova">
                                <Plus className="mr-2 h-4 w-4" /> Publicar Nova Vaga
                            </Link>
                        </Button>
                    </div>

                    {loadingVagas ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <Card className="text-center py-12">
                            <CardContent className="space-y-4">
                                <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                                    <Briefcase className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <CardTitle>Nenhuma vaga publicada</CardTitle>
                                    <CardDescription>
                                        Você ainda não publicou nenhuma oferta de emprego.
                                    </CardDescription>
                                </div>
                                <Button asChild variant="outline">
                                    <Link href="/dashboard/vagas/nova">Começar agora</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {vagas.map((vaga) => (
                                <Card key={vaga.id} className="overflow-hidden flex flex-col">
                                    <CardHeader className="pb-4">
                                        <div className="flex justify-between items-start">
                                            <Badge variant="secondary" className="mb-2">
                                                {vaga.category}
                                            </Badge>
                                            <Badge variant={vaga.isActive ? "default" : "outline"}>
                                                {vaga.isActive ? "Ativa" : "Inativa"}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-xl line-clamp-1">
                                            {vaga.title}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-2">
                                            <Clock className="h-3 w-3" />
                                            Publicado em {new Date(vaga.createdAt).toLocaleDateString()}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 space-y-4">
                                        <div className="grid grid-cols-2 gap-y-2 text-sm">
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
                                                <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                                                    <DollarSign className="h-4 w-4" />
                                                    <span>
                                                        Orçamento:{" "}
                                                        {vaga.budgetMin !== null && vaga.budgetMin !== undefined && `R$ ${vaga.budgetMin}`}
                                                        {vaga.budgetMin !== null && vaga.budgetMin !== undefined &&
                                                            vaga.budgetMax !== null && vaga.budgetMax !== undefined && " - "}
                                                        {vaga.budgetMax !== null && vaga.budgetMax !== undefined && `R$ ${vaga.budgetMax}`}
                                                    </span>
                                                </div>
                                            ) : null}
                                            {vaga.startDate && (
                                                <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                                                    <Clock className="h-4 w-4" />
                                                    <span>
                                                        Início: {new Date(vaga.startDate).toLocaleDateString()}
                                                        {vaga.endDate && ` - Término: ${new Date(vaga.endDate).toLocaleDateString()}`}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-sm line-clamp-2 text-muted-foreground">
                                            {vaga.description}
                                        </p>

                                        <div className="flex gap-2 pt-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => handleToggleActive(vaga)}
                                            >
                                                {vaga.isActive ? (
                                                    <>
                                                        <Pause className="mr-2 h-4 w-4" /> Pausar
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="mr-2 h-4 w-4" /> Reativar
                                                    </>
                                                )}
                                            </Button>
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/dashboard/vagas/${vaga.id}/candidatos`}>
                                                        <User className="mr-2 h-4 w-4" />
                                                        Candidatos
                                                    </Link>
                                                </Button>
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={`/dashboard/vagas/editar/${vaga.id}`}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Editar
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDeleteClick(vaga.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente a vaga
                            e removerá todos os dados associados de nossos servidores.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmDelete();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Excluindo...
                                </>
                            ) : (
                                "Confirmar Exclusão"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
