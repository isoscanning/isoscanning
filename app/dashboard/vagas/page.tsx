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
import { usePlan } from "@/lib/plans/use-plan";
import { isPlanErrorBody, startOfCurrentMonth } from "@/lib/plans/plan-limits";
import { jobStatusInfo, type JobOfferStatus } from "@/lib/jobs/job-offer-display";

/** 403 de plano → o modal de upgrade já foi aberto pelo interceptor do apiClient. */
const isPlanError = (error: unknown) => isPlanErrorBody((error as any)?.response?.data);

/** Mensagem do backend (ex.: "vaga com data no passado") ou o fallback. */
const apiErrorMessage = (error: unknown, fallback: string) => {
    const msg = (error as any)?.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(" ");
    return typeof msg === "string" && msg ? msg : fallback;
};

type StatusFilter = "all" | JobOfferStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "Todas" },
    { value: "open", label: "Ativas" },
    { value: "paused", label: "Pausadas" },
    { value: "closed", label: "Concluídas" },
    { value: "expired", label: "Expiradas" },
];

export default function MinhasVagasPage() {
    const router = useRouter();
    const { userProfile, loading } = useAuth();
    const [vagas, setVagas] = useState<JobOffer[]>([]);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [loadingVagas, setLoadingVagas] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [vagaToDelete, setVagaToDelete] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [vagaToConclude, setVagaToConclude] = useState<JobOffer | null>(null);
    const [isConcludeDialogOpen, setIsConcludeDialogOpen] = useState(false);
    const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    const { toast } = useToast();

    // Uso do mês × limite do plano (null = ilimitado → sem dica)
    const plan = usePlan();
    const jobLimit = plan.limitOf("jobOffersPerMonth");
    const monthStart = startOfCurrentMonth().getTime();
    const jobsThisMonth = vagas.filter((v) => new Date(v.createdAt).getTime() >= monthStart).length;

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
        // Expirada: a data passou — só reabre com novas datas (tela de edição)
        if (jobStatusInfo(vaga).status === "expired") {
            router.push(`/dashboard/vagas/editar/${vaga.id}`);
            return;
        }
        try {
            const newStatus: 'open' | 'paused' | 'closed' = vaga.status === 'open' ? 'paused' : 'open';
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
            if (!isPlanError(error)) {
                toast({
                    variant: "destructive",
                    title: "Não foi possível alterar o status",
                    description: apiErrorMessage(error, "Erro ao alterar status da vaga"),
                });
            }
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

    // Filtro por situação (contagens por status para os chips)
    const statusCounts = vagas.reduce<Record<string, number>>((acc, v) => {
        const s = jobStatusInfo(v).status;
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
    }, {});
    const visibleVagas = statusFilter === "all"
        ? vagas
        : vagas.filter((v) => jobStatusInfo(v).status === statusFilter);

    const handleSelectAll = (checked: boolean) => {
        setSelectedJobIds(checked ? visibleVagas.map(v => v.id) : []);
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
            if (!isPlanError(error)) {
                toast({ variant: "destructive", title: "Erro", description: "Não foi possível concluir a vaga." });
            }
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
                const result = await bulkUpdateJobStatus(selectedJobIds, status);
                // O backend devolve só o que mudou: ao reativar, vagas com data
                // no passado ficam de fora (precisam de novas datas).
                const updated = new Set(result?.updated ?? selectedJobIds);
                const skipped = selectedJobIds.length - updated.size;

                setVagas(vagas.map(v => updated.has(v.id) ? { ...v, status, isActive: status === 'open' } : v));

                const actionName = action === 'conclude' ? 'concluídas' : action === 'pause' ? 'pausadas' : 'reativadas';
                toast({
                    title: "Sucesso",
                    description: skipped > 0
                        ? `${updated.size} vaga(s) ${actionName}. ${skipped} não reativada(s): a data do trabalho já passou — edite as datas.`
                        : `${updated.size} vagas foram ${actionName}.`,
                });
            }
            setSelectedJobIds([]);
        } catch (error) {
            console.error("Erro na ação em massa:", error);
            if (!isPlanError(error)) {
                toast({ variant: "destructive", title: "Erro", description: apiErrorMessage(error, "Falha ao processar ação em massa.") });
            }
        } finally {
            setIsBulkProcessing(false);
        }
    };

    // Derived flags for BulkActionBar
    const selectedJobs = vagas.filter(v => selectedJobIds.includes(v.id));
    const hasOpenJobs = selectedJobs.some(v => v.status === 'open');
    const hasNonClosedJobs = selectedJobs.some(v => v.status !== 'closed');
    // Expirada não reativa em lote (precisa de novas datas na edição)
    const hasNonOpenJobs = selectedJobs.some(v => v.status === 'paused' || v.status === 'closed');

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
                            {jobLimit !== null && !loadingVagas && (
                                <p
                                    className={`mt-2 text-xs font-medium ${
                                        jobsThisMonth >= jobLimit
                                            ? "text-amber-600 dark:text-amber-400"
                                            : "text-muted-foreground"
                                    }`}
                                >
                                    {jobsThisMonth}/{jobLimit} vagas este mês no plano {plan.label}
                                </p>
                            )}
                        </div>
                        <Button asChild className="shadow-sm">
                            <Link href="/dashboard/vagas/nova">
                                <Plus className="mr-2 h-4 w-4" /> Publicar Nova Vaga
                            </Link>
                        </Button>
                    </div>

                    {vagas.length > 0 && (
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between py-2 px-1">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="select-all"
                                    checked={visibleVagas.length > 0 && selectedJobIds.length === visibleVagas.length}
                                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                />
                                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer select-none text-muted-foreground">
                                    {selectedJobIds.length === 0 ? "Selecionar todas" : `${selectedJobIds.length} selecionada${selectedJobIds.length > 1 ? 's' : ''}`}
                                </label>
                            </div>
                            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por situação">
                                {STATUS_FILTERS.map((f) => {
                                    const count = f.value === "all" ? vagas.length : (statusCounts[f.value] ?? 0);
                                    if (f.value !== "all" && count === 0) return null;
                                    const active = statusFilter === f.value;
                                    return (
                                        <button
                                            key={f.value}
                                            type="button"
                                            onClick={() => { setStatusFilter(f.value); setSelectedJobIds([]); }}
                                            aria-pressed={active}
                                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-background text-muted-foreground hover:bg-muted"}`}
                                        >
                                            {f.label} <span className="opacity-70">({count})</span>
                                        </button>
                                    );
                                })}
                            </div>
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
                    ) : visibleVagas.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="py-12 text-center text-muted-foreground">
                                Nenhuma vaga nesta situação.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 pb-24">
                            {visibleVagas.map((vaga) => (
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
