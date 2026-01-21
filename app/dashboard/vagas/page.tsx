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
    Search,
    Loader2,
    CheckSquare,
    Square,
    CheckCircle2,
    XCircle,
    RotateCcw,
    PlayCircle,
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
import { fetchUserJobOffers, deleteJobOffer, updateJobOffer, bulkUpdateJobStatus, updateJobStatus, type JobOffer } from "@/lib/data-service";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

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
            // Logic: 
            // If Open -> Pause
            // If Paused -> Open
            // If Closed -> Open

            let newStatus: 'open' | 'paused' | 'closed' = 'open';
            if (vaga.status === 'open') {
                newStatus = 'paused';
            } else {
                newStatus = 'open'; // Paused or Closed -> Open
            }

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
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Erro ao excluir vaga",
            });
        } finally {
            setIsDeleting(false);
            setVagaToDelete(null);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedJobIds(vagas.map(v => v.id));
        } else {
            setSelectedJobIds([]);
        }
    };

    const handleSelectJob = (jobId: string, checked: boolean) => {
        if (checked) {
            setSelectedJobIds(prev => [...prev, jobId]);
        } else {
            setSelectedJobIds(prev => prev.filter(id => id !== jobId));
        }
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

                // Update local state
                setVagas(vagas.map(v => {
                    if (selectedJobIds.includes(v.id)) {
                        return {
                            ...v,
                            status: status,
                            isActive: status === 'open'
                        };
                    }
                    return v;
                }));

                let actionName = '';
                switch (action) {
                    case 'conclude': actionName = 'concluídas'; break;
                    case 'pause': actionName = 'pausadas'; break;
                    case 'open': actionName = 'reativadas'; break;
                }
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

    const getJobTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            freelance: "Freelance",
            full_time: "Tempo Integral",
            part_time: "Meio Período",
            project: "Por Projeto",
        };
        return types[type] || type;
    };

    // Calculate derived state for bulk actions
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

                    {/* Bulk Selection Header (Only visible when items exist) */}
                    {vagas.length > 0 && (
                        <div className="flex items-center gap-2 py-2 px-1">
                            <Checkbox
                                id="select-all"
                                checked={selectedJobIds.length === vagas.length && vagas.length > 0}
                                onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                            />
                            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer select-none text-muted-foreground">
                                {selectedJobIds.length === 0
                                    ? "Selecionar todas"
                                    : `${selectedJobIds.length} selecionada${selectedJobIds.length > 1 ? 's' : ''}`
                                }
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
                                <Card key={vaga.id} className={`overflow-hidden transition-all hover:shadow-md ${!vaga.isActive ? 'opacity-75 bg-muted/30' : ''} ${selectedJobIds.includes(vaga.id) ? 'ring-2 ring-primary border-primary' : ''}`}>
                                    <CardContent className="p-0">
                                        <div className="flex flex-col md:flex-row">
                                            {/* Selection Strip */}
                                            <div className="flex items-center justify-center w-12 bg-muted/10 border-r">
                                                <Checkbox
                                                    checked={selectedJobIds.includes(vaga.id)}
                                                    onCheckedChange={(checked) => handleSelectJob(vaga.id, checked as boolean)}
                                                />
                                            </div>

                                            {/* Status Strip */}
                                            <div className={`w-full md:w-2 h-2 md:h-auto ${vaga.status === 'closed' ? 'bg-gray-500' : vaga.isActive ? 'bg-green-500' : 'bg-yellow-500'}`} />

                                            <div className="flex-1 p-6 space-y-4">
                                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Badge variant={vaga.status === 'closed' ? "secondary" : vaga.isActive ? "default" : "secondary"} className={vaga.status === 'closed' ? "bg-gray-200 text-gray-700" : vaga.isActive ? "bg-green-600 hover:bg-green-700" : ""}>
                                                                {vaga.status === 'closed' ? "Concluída" : vaga.isActive ? "Ativa" : "Pausada"}
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

                                                                {vaga.status !== 'closed' && (
                                                                    <DropdownMenuItem onClick={() => handleConcludeJob(vaga)}>
                                                                        <CheckCircle2 className="mr-2 h-4 w-4" /> Concluir Vaga
                                                                    </DropdownMenuItem>
                                                                )}

                                                                {vaga.status === 'open' && (
                                                                    <DropdownMenuItem onClick={() => handleToggleActive(vaga)}>
                                                                        <Pause className="mr-2 h-4 w-4" /> Pausar Vaga
                                                                    </DropdownMenuItem>
                                                                )}

                                                                {vaga.status === 'paused' && (
                                                                    <DropdownMenuItem onClick={() => handleToggleActive(vaga)}>
                                                                        <Play className="mr-2 h-4 w-4" /> Reativar Vaga
                                                                    </DropdownMenuItem>
                                                                )}

                                                                {vaga.status === 'closed' && (
                                                                    <DropdownMenuItem onClick={() => handleToggleActive(vaga)}>
                                                                        <Play className="mr-2 h-4 w-4" /> Reabrir Vaga
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem
                                                                    className="text-destructive focus:text-destructive"
                                                                    onClick={() => handleDeleteClick(vaga.id)}
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

                {/* Floating Action Bar */}
                <AnimatePresence>
                    {selectedJobIds.length > 0 && (
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-2xl"
                        >
                            <Card className="bg-foreground text-background shadow-2xl border-none">
                                <CardContent className="p-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <span className="font-medium text-sm md:text-base whitespace-nowrap">
                                            {selectedJobIds.length} item{selectedJobIds.length > 1 ? 's' : ''} selecionado{selectedJobIds.length > 1 ? 's' : ''}
                                        </span>
                                        <div className="h-4 w-px bg-background/20" />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedJobIds([])}
                                            className="text-background/70 hover:text-background hover:bg-background/10 h-8"
                                        >
                                            Cancelar
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {hasNonOpenJobs && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleBulkAction('open')}
                                                disabled={isBulkProcessing}
                                                className="h-9"
                                            >
                                                {isBulkProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                                                <span className="hidden sm:inline">Reativar</span>
                                            </Button>
                                        )}

                                        {hasOpenJobs && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleBulkAction('pause')}
                                                disabled={isBulkProcessing}
                                                className="h-9"
                                            >
                                                {isBulkProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4 mr-2" />}
                                                <span className="hidden sm:inline">Pausar</span>
                                            </Button>
                                        )}

                                        {hasNonClosedJobs && (
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 text-white h-9 border-none"
                                                onClick={() => handleBulkAction('conclude')}
                                                disabled={isBulkProcessing}
                                            >
                                                {isBulkProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                                <span className="hidden sm:inline">Concluir</span>
                                            </Button>
                                        )}

                                        <Button
                                            size="icon"
                                            variant="destructive"
                                            onClick={() => handleBulkAction('delete')}
                                            disabled={isBulkProcessing}
                                            className="h-9 w-9"
                                        >
                                            {isBulkProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
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
        </div>
    );
}
