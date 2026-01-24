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
import {
    Plus,
    Briefcase,
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
import { fetchUserJobOffers, deleteJobOffer, bulkUpdateJobStatus, updateJobStatus, type JobOffer } from "@/lib/data-service";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { JobCard } from "./components/job-card";
import { BulkActionBar } from "./components/bulk-action-bar";

export default function MinhasVagasPage() {
    const router = useRouter();
    const { userProfile, loading } = useAuth();
    const [vagas, setVagas] = useState<JobOffer[]>([]);
    const [loadingVagas, setLoadingVagas] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [vagaToDelete, setVagaToDelete] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [vagaToConclude, setVagaToConclude] = useState<JobOffer | null>(null);
    const [isConcludeDialogOpen, setIsConcludeDialogOpen] = useState(false);
    const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    const { toast } = useToast();

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
            let newStatus: 'open' | 'paused' | 'closed' = vaga.status === 'open' ? 'paused' : 'open';
            const newIsActive = newStatus === 'open';

            await updateJobStatus(vaga.id, newStatus);
            setVagas(vagas.map((v) => v.id === vaga.id ? { ...v, isActive: newIsActive, status: newStatus } : v));

            toast({
                title: newStatus === 'open' ? "Vaga Reativada" : "Vaga Pausada",
                description: newStatus === 'open'
                    ? "A vaga está visível para candidatos novamente."
                    : "A vaga foi pausada e não receberá novas candidaturas."
            });
        } catch (error) {
            console.error("Erro ao alterar status da vaga:", error);
            toast({ variant: "destructive", title: "Erro", description: "Erro ao alterar status da vaga" });
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
            toast({ variant: "destructive", title: "Erro", description: "Erro ao excluir vaga" });
        } finally {
            setIsDeleting(false);
            setVagaToDelete(null);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectedJobIds(checked ? vagas.map(v => v.id) : []);
    };

    const handleSelectJob = (jobId: string, checked: boolean) => {
        setSelectedJobIds(prev => checked ? [...prev, jobId] : prev.filter(id => id !== jobId));
    };

    const handleConcludeJob = (vaga: JobOffer) => {
        setVagaToConclude(vaga);
        setIsConcludeDialogOpen(true);
    };

    const confirmConclude = async () => {
        if (!vagaToConclude) return;

        try {
            await updateJobStatus(vagaToConclude.id, 'closed');
            setVagas(vagas.map((v) => v.id === vagaToConclude.id ? { ...v, status: 'closed', isActive: false } : v));
            toast({ title: "Vaga Concluída", description: "A vaga foi marcada como concluída com sucesso." });
            setIsConcludeDialogOpen(false);
        } catch (error) {
            console.error("Erro ao concluir vaga:", error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível concluir a vaga." });
        } finally {
            setVagaToConclude(null);
        }
    };

    const handleBulkAction = async (action: 'conclude' | 'pause' | 'delete' | 'open') => {
        if (selectedJobIds.length === 0) return;
        setIsBulkProcessing(true);

        try {
            if (action === 'delete') {
                await Promise.all(selectedJobIds.map(id => deleteJobOffer(id)));
                setVagas(vagas.filter(v => !selectedJobIds.includes(v.id)));
                toast({ title: "Vagas excluídas", description: `${selectedJobIds.length} vagas foram excluídas.` });
            } else {
                const status = action === 'conclude' ? 'closed' : action === 'pause' ? 'paused' : 'open';
                await bulkUpdateJobStatus(selectedJobIds, status);

                setVagas(vagas.map(v => selectedJobIds.includes(v.id) ? { ...v, status, isActive: status === 'open' } : v));

                let actionName = action === 'conclude' ? 'concluídas' : action === 'pause' ? 'pausadas' : 'reativadas';
                toast({ title: "Sucesso", description: `${selectedJobIds.length} vagas foram ${actionName}.` });
            }
            setSelectedJobIds([]);
        } catch (error) {
            console.error("Erro na ação em massa:", error);
            toast({ variant: "destructive", title: "Erro", description: "Falha ao processar ação em massa." });
        } finally {
            setIsBulkProcessing(false);
        }
    };

    // Derived flags for BulkActionBar
    const selectedJobs = vagas.filter(v => selectedJobIds.includes(v.id));
    const hasOpenJobs = selectedJobs.some(v => v.status === 'open');
    const hasPausedJobs = selectedJobs.some(v => v.status === 'paused');
    const hasClosedJobs = selectedJobs.some(v => v.status === 'closed');
    const hasNonClosedJobs = selectedJobs.some(v => v.status !== 'closed');
    const hasNonOpenJobs = selectedJobs.some(v => v.status !== 'open');

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

            <main className="flex-1 py-12 px-4 relative">
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

                    {vagas.length > 0 && (
                        <div className="flex items-center gap-2 py-2 px-1">
                            <Checkbox
                                id="select-all"
                                checked={selectedJobIds.length === vagas.length && vagas.length > 0}
                                onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                            />
                            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer select-none text-muted-foreground">
                                {selectedJobIds.length === 0 ? "Selecionar todas" : `${selectedJobIds.length} selecionada${selectedJobIds.length > 1 ? 's' : ''}`}
                            </label>
                        </div>
                    )}

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
                        <div className="grid grid-cols-1 gap-6 pb-24">
                            {vagas.map((vaga) => (
                                <JobCard
                                    key={vaga.id}
                                    vaga={vaga}
                                    isSelected={selectedJobIds.includes(vaga.id)}
                                    onToggleSelection={(checked) => handleSelectJob(vaga.id, checked)}
                                    onToggleActive={() => handleToggleActive(vaga)}
                                    onDelete={() => handleDeleteClick(vaga.id)}
                                    onConclude={() => handleConcludeJob(vaga)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <BulkActionBar
                    selectedIds={selectedJobIds}
                    isProcessing={isBulkProcessing}
                    hasOpenJobs={hasOpenJobs}
                    hasNonOpenJobs={hasNonOpenJobs}
                    hasNonClosedJobs={hasNonClosedJobs}
                    onAction={handleBulkAction}
                    onCancel={() => setSelectedJobIds([])}
                />
            </main>

            <Footer />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente a vaga e removerá todos os dados associados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); confirmDelete(); }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...</> : "Confirmar Exclusão"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
                            onClick={(e) => { e.preventDefault(); confirmConclude(); }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            Confirmar Conclusão
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
