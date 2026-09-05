"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Briefcase,
    MapPin,
    Clock,
    DollarSign,
    ChevronLeft,
    Calendar,
    User,
    CheckCircle2,
    Share2,
    Building2,
    ArrowRight,
    Globe,
    Mail,
    Star,
    ArrowUpRight,
    MoreHorizontal,
    Users,
    Receipt,
    ClipboardList,
    Wallet,
    Timer,
    Settings2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchJobOfferById, type JobOffer, applyToJob, fetchJobApplication, type JobApplication } from "@/lib/data-service";
import apiClient from "@/lib/api-service";
import { trackEvent } from "@/lib/analytics";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/scroll-reveal";
import { useToast } from "@/components/ui/use-toast";
import { usePlan } from "@/lib/plans/use-plan";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";
import { PlanBadge, UpgradeButton } from "@/components/plan/plan-gate";
import {
    formatJobBudget,
    formatJobDateRange,
    formatJobTimeRange,
    isJobOpen,
    jobCityState,
    jobLocationLabel,
    jobStatusInfo,
    jobTypeColor,
    jobTypeLabel,
    locationTypeLabel,
    positionsLabel,
    publishedAgo,
} from "@/lib/jobs/job-offer-display";

export default function DetalhesVagaPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { userProfile } = useAuth();
    const [vaga, setVaga] = useState<JobOffer | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasApplied, setHasApplied] = useState(false);
    const [appliedDetails, setAppliedDetails] = useState<JobApplication | null>(null);
    const [applying, setApplying] = useState(false);
    const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
    const [proposalAmount, setProposalAmount] = useState<string>("");
    const [proposalMessage, setProposalMessage] = useState<string>("");
    const [employerStats, setEmployerStats] = useState<{ averageRating: number; totalReviews: number }>({ averageRating: 0, totalReviews: 0 });

    // Contrapropostas por vaga no plano do usuário (Free: 0 → campo bloqueado;
    // Pro: N; Ultra: null = ilimitado). Visitante deslogado cai no fluxo de login.
    const plan = usePlan();
    const counterLimit = plan.limitOf("counterProposalsPerJob");
    const counterBlocked = plan.authenticated && counterLimit === 0;

    const renderProposalPlanHint = () => {
        if (counterBlocked) {
            return (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground flex-1">Contrapropostas a partir do plano Pro.</p>
                    <UpgradeButton size="sm" />
                </div>
            );
        }
        if (plan.authenticated && counterLimit !== null && counterLimit > 0) {
            return (
                <p className="text-xs text-muted-foreground">
                    Até {counterLimit} contrapropostas por vaga no plano {plan.label}.
                </p>
            );
        }
        return null;
    };

    useEffect(() => {
        const loadData = async () => {
            if (!params.id) return;
            try {
                const vagaData = await fetchJobOfferById(params.id as string);
                setVaga(vagaData);

                // Fetch employer review stats
                if (vagaData?.employerId) {
                    try {
                        const statsRes = await apiClient.get(`/reviews/stats/${vagaData.employerId}`);
                        setEmployerStats({
                            averageRating: statsRes.data.averageRating || 0,
                            totalReviews: statsRes.data.totalReviews || 0,
                        });
                    } catch (e) {
                        console.error("Error fetching employer stats:", e);
                    }
                }

                trackEvent({
                    action: 'view_job_offer',
                    category: 'Jobs',
                    label: vagaData?.title,
                    value: (vagaData?.budgetMax ?? vagaData?.budgetMin) ?? 0
                });

                if (userProfile) {
                    const application = await fetchJobApplication(params.id as string, userProfile.id);
                    setHasApplied(!!application);
                    setAppliedDetails(application);
                }
            } catch (error) {
                console.error("Erro ao buscar dados:", error);
                setVaga(null);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [params.id, userProfile]);

    const handleShare = async () => {
        const shareData = {
            title: vaga?.title || "Vaga na IsoScanning",
            text: `Confira esta vaga de ${vaga?.title} na IsoScanning!`,
            url: window.location.href,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                console.log("Error sharing:", error);
            }
        } else {
            // Fallback for desktop - could implement a custom modal here for WhatsApp/etc if needed, 
            // but for now sticking to clipboard + toast as it's standard desktop behavior.
            // User asked for "choose like mobile", but standard web API on desktop is limited.
            // We can add specific links for WhatsApp/LinkedIn/Email.
            navigator.clipboard.writeText(window.location.href);
            toast({
                title: "Link copiado!",
                description: "Compartilhe via WhatsApp, LinkedIn ou E-mail.",
            });
        }
    };

    const isOwner = !!userProfile && !!vaga && userProfile.id === vaga.employerId;
    const statusInfo = vaga ? jobStatusInfo(vaga) : null;
    const acceptingApplications = !!vaga && isJobOpen(vaga);

    const handleApply = async () => {
        if (!userProfile) {
            toast({
                title: "Login necessário",
                description: "Você precisa estar logado para se candidatar.",
                variant: "destructive",
            });
            router.push("/login");
            return;
        }

        if (isOwner) {
            toast({ title: "Esta vaga é sua", description: "Você não pode se candidatar à própria vaga." });
            return;
        }

        if (!acceptingApplications) {
            toast({ title: "Vaga fora do ar", description: "Esta vaga não está mais recebendo candidaturas." });
            return;
        }

        if (hasApplied) {
            toast({
                title: "Já candidatado",
                description: "Você já se candidatou para esta vaga.",
            });
            return;
        }

        setApplying(true);
        try {
            await applyToJob(vaga!.id, userProfile.id);
            setHasApplied(true);
            toast({
                title: "Candidatura enviada!",
                description: "Boa sorte! Você pode acompanhar suas candidaturas no painel.",
                duration: 5000,
            });
            router.push("/dashboard/candidaturas");
        } catch (error: any) {
            // 403 de plano: o modal de upgrade já foi aberto pelo apiClient.
            if (isPlanErrorBody(error?.response?.data)) return;
            toast({
                title: "Erro ao candidatar",
                description:
                    error?.response?.data?.message ||
                    "Ocorreu um erro ao processar sua candidatura. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setApplying(false);
        }
    };

    const handleCounterProposal = async () => {
        if (!userProfile) {
            toast({
                title: "Login necessário",
                description: "Você precisa estar logado para fazer uma contraproposta.",
                variant: "destructive",
            });
            router.push("/login");
            return;
        }

        if (!proposalAmount) {
            toast({
                title: "Campo obrigatório",
                description: "Por favor, insira o valor da sua proposta.",
                variant: "destructive",
            });
            return;
        }

        if (Number(proposalAmount) < 0) {
            toast({
                title: "Valor inválido",
                description: "O valor da proposta não pode ser negativo.",
                variant: "destructive",
            });
            return;
        }

        if (counterBlocked) return; // campo desabilitado no plano Free

        setApplying(true);
        try {
            await applyToJob(vaga!.id, userProfile.id, proposalMessage, parseFloat(proposalAmount));
            setHasApplied(true);
            setIsProposalModalOpen(false);
            toast({
                title: "Contraproposta enviada!",
                description: "Sua proposta foi enviada com sucesso ao contratante.",
                duration: 5000,
            });
            router.push("/dashboard/candidaturas");
        } catch (error: any) {
            // 403 de plano: o modal de upgrade já foi aberto pelo apiClient.
            if (isPlanErrorBody(error?.response?.data)) {
                setIsProposalModalOpen(false);
                return;
            }
            toast({
                title: "Erro ao enviar",
                description:
                    error?.response?.data?.message ||
                    "Ocorreu um erro ao enviar sua contraproposta. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setApplying(false);
        }
    };

    const getJobTypeLabel = jobTypeLabel;
    const getJobTypeColor = jobTypeColor;
    const getLocationLabel = locationTypeLabel;

    const formatMemberSince = (dateString?: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const months = [
            "janeiro", "fevereiro", "março", "abril", "maio", "junho",
            "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
        ];
        return `${months[date.getMonth()]} de ${date.getFullYear()}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col bg-background">
                <Header />
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        <p className="text-muted-foreground animate-pulse">Carregando detalhes da vaga...</p>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    if (!vaga) {
        return (
            <div className="min-h-screen flex flex-col bg-background">
                <Header />
                <main className="flex-1 flex flex-col items-center justify-center p-4">
                    <div className="text-center space-y-4">
                        <div className="bg-muted rounded-full p-6 inline-block">
                            <Briefcase className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <h1 className="text-2xl font-bold">Vaga não encontrada</h1>
                        <p className="text-muted-foreground max-w-md">
                            A vaga que você está procurando pode ter sido removida ou não existe mais.
                        </p>
                        <Button variant="default" onClick={() => router.push('/vagas')}>
                            Ver outras vagas
                        </Button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />

            <main className="flex-1 pb-24 lg:pb-12">
                {/* Subtle Hero Background (Matching List Page) */}
                <div className="relative py-12 md:py-16 overflow-hidden bg-muted/10 border-b">
                    {/* Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-cyan-50/50 dark:from-blue-950/10 dark:via-indigo-950/5 dark:to-cyan-950/10" />

                    <div className="container mx-auto px-4 max-w-6xl relative z-10">
                        {/* Breadcrumbs */}
                        <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
                            <Link href="/vagas" className="hover:text-foreground transition-colors">Vagas</Link>
                            <ChevronLeft className="h-4 w-4 rotate-180" />
                            <span className="text-foreground font-medium truncate max-w-[300px]">{vaga.title}</span>
                        </div>

                        <div className="space-y-6">
                            <div className="flex flex-wrap items-center gap-3">
                                <Badge variant="secondary" className="rounded-full px-3 py-1 font-medium">
                                    {vaga.category}
                                </Badge>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${getJobTypeColor(vaga.jobType)}`}>
                                    {getJobTypeLabel(vaga.jobType)}
                                </span>
                                {statusInfo?.status === "open" ? (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white bg-emerald-500">
                                        Ativa
                                    </span>
                                ) : (
                                    <Badge variant={statusInfo?.tone === "warning" ? "secondary" : "destructive"} className="rounded-full">
                                        {statusInfo?.label ?? "Encerrada"}
                                    </Badge>
                                )}
                                {(vaga.positions ?? 1) > 1 && (
                                    <Badge variant="outline" className="rounded-full gap-1">
                                        <Users className="h-3 w-3" /> {positionsLabel(vaga.positions)}
                                    </Badge>
                                )}
                                {vaga.requiresInvoice && (
                                    <Badge variant="outline" className="rounded-full gap-1">
                                        <Receipt className="h-3 w-3" /> Exige NF
                                    </Badge>
                                )}
                            </div>

                            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
                                {vaga.title}
                            </h1>

                            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-base text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-primary" />
                                    <span className="font-medium text-foreground">{vaga.employerName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5" />
                                    <span>
                                        {getLocationLabel(vaga.locationType)}
                                        {vaga.locationType !== "remote" && (vaga.city || vaga.state)
                                            ? ` · ${[vaga.city, vaga.state].filter(Boolean).join(", ")}`
                                            : ""}
                                    </span>
                                </div>
                                {vaga.startDate && (
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5" />
                                        <span>{formatJobDateRange(vaga.startDate, vaga.endDate)}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    <span>{publishedAgo(vaga.createdAt)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 max-w-6xl py-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                        {/* Main Content Column */}
                        <div className="lg:col-span-8 space-y-10">

                            {/* Description */}
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                    <Briefcase className="h-6 w-6 text-primary" />
                                    Descrição da Vaga
                                </h2>
                                <div className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                                    <p className="whitespace-pre-wrap">{vaga.description}</p>
                                </div>
                            </div>

                            <Separator />

                            {/* Requirements */}
                            {vaga.requirements && (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                        <CheckCircle2 className="h-6 w-6 text-primary" />
                                        Requisitos e Equipamentos
                                    </h2>
                                    <div className="bg-muted/30 rounded-xl p-6 border">
                                        <div className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                                            <p className="whitespace-pre-wrap">{vaga.requirements}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Separator />

                            {/* Como será o trabalho (detalhes de execução — SQL 78) */}
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                    <Settings2 className="h-6 w-6 text-primary" />
                                    Como será o trabalho
                                </h2>
                                <dl className="grid gap-4 sm:grid-cols-2 rounded-xl border bg-card p-6 shadow-sm text-sm">
                                    <div className="flex gap-3">
                                        <Calendar className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                                        <div>
                                            <dt className="text-muted-foreground">Data</dt>
                                            <dd className="font-medium text-foreground">{formatJobDateRange(vaga.startDate, vaga.endDate) ?? "A combinar"}</dd>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Timer className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                                        <div>
                                            <dt className="text-muted-foreground">Horário</dt>
                                            <dd className="font-medium text-foreground">{formatJobTimeRange(vaga.startTime, vaga.endTime) ?? "A combinar"}</dd>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                                        <div>
                                            <dt className="text-muted-foreground">Local de execução</dt>
                                            <dd className="font-medium text-foreground">{jobLocationLabel(vaga, "A combinar")}</dd>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Users className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                                        <div>
                                            <dt className="text-muted-foreground">Profissionais</dt>
                                            <dd className="font-medium text-foreground">{positionsLabel(vaga.positions)}</dd>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <ClipboardList className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                                        <div>
                                            <dt className="text-muted-foreground">Prazo de entrega</dt>
                                            <dd className="font-medium text-foreground">{vaga.deliveryDeadline || "A combinar"}</dd>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Wallet className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                                        <div>
                                            <dt className="text-muted-foreground">Pagamento</dt>
                                            <dd className="font-medium text-foreground">
                                                {vaga.paymentTerms || "A combinar"}
                                                {vaga.requiresInvoice && <span className="block text-xs text-muted-foreground mt-0.5">Exige emissão de nota fiscal.</span>}
                                            </dd>
                                        </div>
                                    </div>
                                </dl>

                                {vaga.deliverables && (
                                    <div className="space-y-3">
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <ClipboardList className="h-5 w-5 text-primary" />
                                            Entregáveis
                                        </h3>
                                        <div className="bg-muted/30 rounded-xl p-6 border">
                                            <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{vaga.deliverables}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* About Employer */}
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                    <Building2 className="h-6 w-6 text-primary" />
                                    Sobre o Contratante
                                </h2>
                                <div className="flex items-start gap-5 bg-card border rounded-xl p-6 shadow-sm">
                                    <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                                        <AvatarImage src={vaga.employerAvatarUrl || ""} alt={vaga.employerName} />
                                        <AvatarFallback>
                                            <User className="h-8 w-8 text-muted-foreground" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div>
                                                <h3 className="text-lg font-bold text-foreground">{vaga.employerName}</h3>
                                                <div className="flex items-center text-sm text-yellow-500 mt-0.5">
                                                    <Star className="h-4 w-4 fill-current" />
                                                    <span className="ml-1 font-medium text-foreground">
                                                        {employerStats.averageRating > 0 ? employerStats.averageRating.toFixed(1) : "—"}
                                                    </span>
                                                    {employerStats.totalReviews > 0 && (
                                                        <>
                                                            <span className="mx-1 text-muted-foreground">•</span>
                                                            <span className="text-muted-foreground">{employerStats.totalReviews} avaliações</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/profissionais/${vaga.employerId}`}>
                                                    Ver Perfil
                                                </Link>
                                            </Button>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {vaga.employerCreatedAt
                                                ? `Membro ativo da plataforma desde ${formatMemberSince(vaga.employerCreatedAt)}.`
                                                : "Membro ativo da plataforma."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Column (Desktop) */}
                        <div className="hidden lg:block lg:col-span-4 space-y-6">

                            {/* Primary Action Card */}
                            <Card className="border shadow-md bg-card">
                                <div className="h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500" />
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg">Detalhes da Oportunidade</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-1">
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Orçamento Estimado</span>
                                        <div className="text-2xl font-bold text-foreground">
                                            {formatJobBudget(vaga)}
                                        </div>
                                        {appliedDetails?.counterProposal && (
                                            <div className="mt-2 flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 w-fit">
                                                <DollarSign className="h-4 w-4" />
                                                <span>Minha Proposta: R$ {appliedDetails.counterProposal}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="flex justify-between gap-3 text-sm">
                                            <span className="text-muted-foreground flex items-center gap-2 shrink-0">
                                                <Calendar className="h-4 w-4" /> Data
                                            </span>
                                            <span className="font-medium text-right">{formatJobDateRange(vaga.startDate, vaga.endDate) ?? "A combinar"}</span>
                                        </div>
                                        {formatJobTimeRange(vaga.startTime, vaga.endTime) && (
                                            <div className="flex justify-between gap-3 text-sm">
                                                <span className="text-muted-foreground flex items-center gap-2 shrink-0">
                                                    <Clock className="h-4 w-4" /> Horário
                                                </span>
                                                <span className="font-medium text-right">{formatJobTimeRange(vaga.startTime, vaga.endTime)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between gap-3 text-sm">
                                            <span className="text-muted-foreground flex items-center gap-2 shrink-0">
                                                <MapPin className="h-4 w-4" /> Local
                                            </span>
                                            <span className="font-medium text-right">
                                                {vaga.locationType === "remote" ? "Remoto" : jobCityState(vaga)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between gap-3 text-sm">
                                            <span className="text-muted-foreground flex items-center gap-2 shrink-0">
                                                <Users className="h-4 w-4" /> Profissionais
                                            </span>
                                            <span className="font-medium text-right">{positionsLabel(vaga.positions)}</span>
                                        </div>
                                        {vaga.deliveryDeadline && (
                                            <div className="flex justify-between gap-3 text-sm">
                                                <span className="text-muted-foreground flex items-center gap-2 shrink-0">
                                                    <ClipboardList className="h-4 w-4" /> Entrega
                                                </span>
                                                <span className="font-medium text-right">{vaga.deliveryDeadline}</span>
                                            </div>
                                        )}
                                        {vaga.requiresInvoice && (
                                            <div className="flex justify-between gap-3 text-sm">
                                                <span className="text-muted-foreground flex items-center gap-2 shrink-0">
                                                    <Receipt className="h-4 w-4" /> Nota fiscal
                                                </span>
                                                <span className="font-medium text-right">Obrigatória</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        {isOwner ? (
                                            <>
                                                <Button className="w-full font-bold text-base h-11 shadow-lg shadow-primary/20" size="lg" asChild>
                                                    <Link href={`/dashboard/vagas/${vaga.id}/candidatos`}>Gerenciar candidatos</Link>
                                                </Button>
                                                <Button variant="outline" className="w-full h-11" asChild>
                                                    <Link href={`/dashboard/vagas/editar/${vaga.id}`}>Editar vaga</Link>
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                className="w-full font-bold text-base h-11 shadow-lg shadow-primary/20"
                                                size="lg"
                                                onClick={handleApply}
                                                disabled={applying || hasApplied || !acceptingApplications}
                                            >
                                                {applying
                                                    ? "Enviando..."
                                                    : hasApplied
                                                        ? "Já Candidatado"
                                                        : acceptingApplications
                                                            ? "Candidatar-se Agora"
                                                            : `Vaga ${statusInfo?.label.toLowerCase() ?? "encerrada"}`}
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            className="w-full h-11"
                                            onClick={handleShare}
                                        >
                                            <Share2 className="mr-2 h-4 w-4" /> Compartilhar Vaga
                                        </Button>

                                        {!isOwner && !hasApplied && acceptingApplications && (
                                            <Dialog open={isProposalModalOpen} onOpenChange={setIsProposalModalOpen}>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" className="w-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 mt-2">
                                                        Fazer contraproposta
                                                        {counterBlocked && <PlanBadge tier="pro" className="ml-2" />}
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[425px]">
                                                    <DialogHeader>
                                                        <DialogTitle>Fazer Contraproposta</DialogTitle>
                                                        <DialogDescription>
                                                            Sugira um valor diferente para este trabalho. O contratante será notificado.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="grid gap-4 py-4">
                                                        <div className="grid gap-2">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <Label htmlFor="amount">Valor Sugerido (R$)</Label>
                                                                {counterBlocked && <PlanBadge tier="pro" />}
                                                            </div>
                                                            <Input
                                                                id="amount"
                                                                type="number"
                                                                disabled={counterBlocked}
                                                                min="0"
                                                                placeholder="Ex: 600"
                                                                value={proposalAmount}
                                                                onChange={(e) => {
                                                                    let val = e.target.value;
                                                                    if (val.includes('-')) return;
                                                                    if (val.startsWith('0') && val.length > 1 && val[1] !== '.') {
                                                                        val = val.replace(/^0+/, '');
                                                                    }
                                                                    setProposalAmount(val);
                                                                }}
                                                            />
                                                            {renderProposalPlanHint()}
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="message">Mensagem (Opcional)</Label>
                                                            <Textarea
                                                                id="message"
                                                                placeholder="Explique o motivo da sua proposta..."
                                                                value={proposalMessage}
                                                                onChange={(e) => setProposalMessage(e.target.value)}
                                                                disabled={counterBlocked}
                                                            />
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <Button onClick={handleCounterProposal} disabled={applying || counterBlocked}>
                                                            {applying ? "Enviando..." : "Enviar Proposta"}
                                                        </Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>


                        </div>
                    </div>
                </div>

                {/* Mobile Sticky Action Bar */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t lg:hidden z-50 pb-safe safe-area-bottom">
                    <div className="flex items-center gap-4 max-w-md mx-auto">
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground uppercase font-medium">Orçamento</p>
                            <p className="font-bold text-base leading-tight text-foreground">
                                {formatJobBudget(vaga, "A combinar")}
                            </p>
                            {appliedDetails?.counterProposal && (
                                <p className="text-emerald-700 font-bold text-sm mt-0.5">
                                    Minha Proposta: R$ {appliedDetails.counterProposal}
                                </p>
                            )}
                        </div>
                        {isOwner ? (
                            <Button size="lg" className="font-bold shadow-lg" asChild>
                                <Link href={`/dashboard/vagas/${vaga.id}/candidatos`}>Candidatos</Link>
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                className="font-bold shadow-lg"
                                onClick={handleApply}
                                disabled={applying || hasApplied || !acceptingApplications}
                            >
                                {applying
                                    ? "Enviando..."
                                    : hasApplied
                                        ? "Já Candidatado"
                                        : acceptingApplications
                                            ? "Candidatar-se"
                                            : `Vaga ${statusInfo?.label.toLowerCase() ?? "encerrada"}`}
                            </Button>
                        )}
                        {!isOwner && !hasApplied && acceptingApplications && (
                            <Dialog open={isProposalModalOpen} onOpenChange={setIsProposalModalOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800">
                                        <DollarSign className="h-6 w-6" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Fazer Contraproposta</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <Label htmlFor="amount-mobile">Valor Sugerido (R$)</Label>
                                                {counterBlocked && <PlanBadge tier="pro" />}
                                            </div>
                                            <Input
                                                id="amount-mobile"
                                                type="number"
                                                disabled={counterBlocked}
                                                min="0"
                                                placeholder="Ex: 600"
                                                value={proposalAmount}
                                                onChange={(e) => {
                                                    let val = e.target.value;
                                                    if (val.includes('-')) return;
                                                    if (val.startsWith('0') && val.length > 1 && val[1] !== '.') {
                                                        val = val.replace(/^0+/, '');
                                                    }
                                                    setProposalAmount(val);
                                                }}
                                            />
                                            {renderProposalPlanHint()}
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button className="w-full" onClick={handleCounterProposal} disabled={applying || counterBlocked}>
                                            {applying ? "Enviando..." : "Enviar"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>
            </main>

            <div className="hidden lg:block">
                <Footer />
            </div>
        </div>
    );
}
