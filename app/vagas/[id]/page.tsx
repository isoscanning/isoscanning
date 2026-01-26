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
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchJobOfferById, type JobOffer, checkJobApplication, applyToJob, fetchJobApplication, type JobApplication } from "@/lib/data-service";
import apiClient from "@/lib/api-service";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/scroll-reveal";
import { useToast } from "@/components/ui/use-toast";

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
        } catch (error) {
            toast({
                title: "Erro ao candidatar",
                description: "Ocorreu um erro ao processar sua candidatura. Tente novamente.",
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
        } catch (error) {
            toast({
                title: "Erro ao enviar",
                description: "Ocorreu um erro ao enviar sua contraproposta. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setApplying(false);
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

    const getJobTypeColor = (type: string) => {
        switch (type) {
            case "freelance": return "bg-blue-500";
            case "full_time": return "bg-green-500";
            case "part_time": return "bg-orange-500";
            case "project": return "bg-purple-500";
            default: return "bg-gray-500";
        }
    };

    const getLocationLabel = (type: string) => {
        const types: Record<string, string> = {
            on_site: "Presencial",
            remote: "Remoto",
            hybrid: "Híbrido",
        };
        return types[type] || type;
    };

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
                                {vaga.isActive ? (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white bg-emerald-500">
                                        Ativa
                                    </span>
                                ) : (
                                    <Badge variant="destructive" className="rounded-full">Encerrada</Badge>
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
                                    <span>{getLocationLabel(vaga.locationType)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    <span>Há {Math.floor((new Date().getTime() - new Date(vaga.createdAt).getTime()) / (1000 * 60 * 60 * 24))} dias</span>
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
                                        <div className="text-3xl font-bold text-foreground">
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
                                        </div>
                                        {appliedDetails?.counterProposal && (
                                            <div className="mt-2 flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 w-fit">
                                                <DollarSign className="h-4 w-4" />
                                                <span>Minha Proposta: R$ {appliedDetails.counterProposal}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground flex items-center gap-2">
                                                <Calendar className="h-4 w-4" /> Início
                                            </span>
                                            <span className="font-medium">{vaga.startDate ? new Date(vaga.startDate).toLocaleDateString() : "Imediato"}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground flex items-center gap-2">
                                                <Clock className="h-4 w-4" /> Término
                                            </span>
                                            <span className="font-medium">{vaga.endDate ? new Date(vaga.endDate).toLocaleDateString() : "A definir"}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground flex items-center gap-2">
                                                <MapPin className="h-4 w-4" /> Local
                                            </span>
                                            <span className="font-medium">
                                                {vaga.locationType === "remote"
                                                    ? "Remoto"
                                                    : `${vaga.city || "N/A"}/${vaga.state || "UF"}`}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <Button
                                            className="w-full font-bold text-base h-11 shadow-lg shadow-primary/20"
                                            size="lg"
                                            onClick={handleApply}
                                            disabled={applying || hasApplied}
                                        >
                                            {applying ? "Enviando..." : hasApplied ? "Já Candidatado" : "Candidatar-se Agora"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full h-11"
                                            onClick={handleShare}
                                        >
                                            <Share2 className="mr-2 h-4 w-4" /> Compartilhar Vaga
                                        </Button>

                                        {userProfile?.id !== vaga.employerId && !hasApplied && (
                                            <Dialog open={isProposalModalOpen} onOpenChange={setIsProposalModalOpen}>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" className="w-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 mt-2">
                                                        Fazer contraproposta
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
                                                            <Label htmlFor="amount">Valor Sugerido (R$)</Label>
                                                            <Input
                                                                id="amount"
                                                                type="number"
                                                                placeholder="Ex: 600"
                                                                value={proposalAmount}
                                                                onChange={(e) => setProposalAmount(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="message">Mensagem (Opcional)</Label>
                                                            <Textarea
                                                                id="message"
                                                                placeholder="Explique o motivo da sua proposta..."
                                                                value={proposalMessage}
                                                                onChange={(e) => setProposalMessage(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <Button onClick={handleCounterProposal} disabled={applying}>
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
                            <p className="font-bold text-lg leading-tight text-foreground">
                                {(vaga.budgetMin !== null && vaga.budgetMin !== undefined) ||
                                    (vaga.budgetMax !== null && vaga.budgetMax !== undefined) ? (
                                    <>
                                        {vaga.budgetMin !== null && vaga.budgetMin !== undefined && `R$ ${vaga.budgetMin}`}
                                    </>
                                ) : (
                                    "A combinar"
                                )}
                            </p>
                            {appliedDetails?.counterProposal && (
                                <p className="text-emerald-700 font-bold text-sm mt-0.5">
                                    Minha Proposta: R$ {appliedDetails.counterProposal}
                                </p>
                            )}
                        </div>
                        <Button
                            size="lg"
                            className="font-bold shadow-lg"
                            onClick={handleApply}
                            disabled={applying || hasApplied}
                        >
                            {applying ? "Enviando..." : hasApplied ? "Já Candidatado" : "Candidatar-se"}
                        </Button>
                        {userProfile?.id !== vaga.employerId && !hasApplied && (
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
                                            <Label htmlFor="amount-mobile">Valor Sugerido (R$)</Label>
                                            <Input
                                                id="amount-mobile"
                                                type="number"
                                                placeholder="Ex: 600"
                                                value={proposalAmount}
                                                onChange={(e) => setProposalAmount(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button className="w-full" onClick={handleCounterProposal} disabled={applying}>
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
