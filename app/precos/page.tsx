"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Zap, Crown, Shield, Clock } from "lucide-react";
import { ParticleBackground } from "@/components/particle-background";
import { ScrollReveal } from "@/components/scroll-reveal";
import { GradientBackground, FloatingParticles } from "@/components/video-background";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Fragment, useState } from "react";
import { usePlan } from "@/lib/plans/use-plan";
import { FEATURE_LABELS, PLAN_LIMITS, TRIAL_DAYS, type PlanLimits, type SubscriptionTier } from "@/lib/plans/plan-limits";
import { SUPPORT_CHANNEL_LABELS } from "@/lib/plans/support";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import apiClient from "@/lib/api-service";
import { formatCpfCnpj, validateCpfCnpj } from "@/lib/utils";

// Maps UI plan names to the canonical plan key sent to the API
const PLAN_KEY: Record<string, string> = {
    free: 'free',
    pro: 'pro',
    ultra: 'vip',
};

// ---- Tabela "Comparar planos" (dirigida por PLAN_LIMITS) ----
const COMPARE_TIERS: { tier: SubscriptionTier; label: string }[] = [
    { tier: "free", label: "Free" },
    { tier: "pro", label: "Pro" },
    { tier: "vip", label: "Ultra" },
];

type CompareRow = { key: keyof PlanLimits; label?: string };

const COMPARE_SECTIONS: { title: string; rows: CompareRow[] }[] = [
    {
        title: "Marketplace",
        rows: [
            { key: "jobApplicationsPerMonth" },
            { key: "counterProposalsPerJob" },
            { key: "profileViewsPerMonth" },
            { key: "jobOffersPerMonth" },
            { key: "equipmentListings" },
        ],
    },
    {
        title: "Perfil e portfólio",
        rows: [
            { key: "portfolioMediaFiles" },
            { key: "portfolioVideos" },
            { key: "verifiedBadge" },
            { key: "directContact", label: "WhatsApp e Instagram no perfil público" },
            { key: "searchRank" },
        ],
    },
    {
        title: "Social media com IA",
        rows: [
            { key: "socialMediaAccounts" },
            { key: "aiCalendarsPerMonth" },
            { key: "aiCreditsPerMonth" },
            { key: "smPremiumReports", label: "Simulador de Feed, Relatório mensal com IA e demografia" },
            { key: "competitorAnalysis" },
            { key: "teamMembersPerAccount", label: "Equipe de social media (membros por conta)" },
            { key: "whiteLabel", label: "Relatórios e links públicos sem marca IsoScanning (white-label)" },
        ],
    },
    {
        title: "Briefings e contratos",
        rows: [
            { key: "briefingsPerMonth" },
            { key: "briefingMembers" },
            { key: "briefingAiRefine" },
            { key: "contractsPerMonth" },
            { key: "customContractTemplates", label: "Editor de contratos e modelos próprios" },
        ],
    },
    {
        title: "Ferramentas e suporte",
        rows: [
            { key: "routeCalculationsPerMonth" },
            { key: "financeExport", label: "Financeiro completo + exportação" },
            { key: "supportChannel" },
        ],
    },
];

const SEARCH_RANK_LABELS: Record<number, string> = {
    1: "Padrão",
    2: "Prioridade",
    3: "Destaque máximo",
};

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function CompareValue({ feature, value }: { feature: keyof PlanLimits; value: PlanLimits[keyof PlanLimits] }) {
    if (feature === "searchRank") {
        return <span>{SEARCH_RANK_LABELS[value as number] ?? String(value)}</span>;
    }
    if (feature === "supportChannel") {
        return <span>{SUPPORT_CHANNEL_LABELS[value as keyof typeof SUPPORT_CHANNEL_LABELS] ?? String(value)}</span>;
    }
    if (value === null) {
        return <span className="font-semibold text-primary">Ilimitado</span>;
    }
    if (typeof value === "boolean" || value === 0) {
        return value
            ? <Check className="h-4 w-4 text-green-500 mx-auto" aria-label="Incluído" />
            : <X className="h-4 w-4 text-muted-foreground/50 mx-auto" aria-label="Não incluído" />;
    }
    return <span className="tabular-nums">{Number(value).toLocaleString("pt-BR")}</span>;
}

export default function PricingPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const plan = usePlan();
    const { toast } = useToast();
    const router = useRouter();
    const [isAnnual, setIsAnnual] = useState(false);
    const [loadingTier, setLoadingTier] = useState<string | null>(null);

    // Dialog de CPF/CNPJ — o Asaas exige o documento para gerar a cobrança.
    // Só abre se o perfil ainda não tiver CPF cadastrado.
    const [docDialogPlan, setDocDialogPlan] = useState<string | null>(null);
    const [docValue, setDocValue] = useState("");
    const [docError, setDocError] = useState<string | null>(null);

    const startCheckout = async (planName: string, planKey: string, cpfCnpj?: string) => {
        setLoadingTier(planName);

        try {
            const { data } = await apiClient.post('/billing/subscribe', {
                plan: planKey,
                billingCycle: isAnnual ? 'annual' : 'monthly',
                ...(cpfCnpj ? { cpfCnpj: cpfCnpj.replace(/\D/g, "") } : {}),
            });

            if (data.paymentUrl) {
                // Redirect to Asaas checkout page
                window.location.href = data.paymentUrl;
            } else {
                throw new Error('Payment URL not returned');
            }
        } catch (error: any) {
            console.error('[precos] Subscribe error:', error);
            const payload = error?.response?.data;

            // Backend não encontrou documento (perfil sem CPF) → pede ao usuário
            if (payload?.code === 'CPF_REQUIRED' || payload?.message?.code === 'CPF_REQUIRED') {
                setDocError(null);
                setDocDialogPlan(planName);
                setLoadingTier(null);
                return;
            }

            const rawMessage = typeof payload?.message === 'string'
                ? payload.message
                : payload?.message?.message;
            const message = rawMessage || 'Não foi possível iniciar o pagamento. Tente novamente.';
            toast({
                variant: "destructive",
                title: "Erro ao assinar plano",
                description: message,
            });
            setLoadingTier(null);
        }
    };

    const handleSubscribe = async (planName: string) => {
        if (authLoading) return;

        if (!userProfile) {
            router.push(`/login?redirect=/precos`);
            return;
        }

        const planKey = PLAN_KEY[planName.toLowerCase()];

        // Free plan: nothing to pay, just send to dashboard
        if (!planKey || planKey === 'free') {
            router.push('/dashboard');
            return;
        }

        // Sem CPF no perfil → coleta antes de ir para o checkout
        if (!userProfile.cpf) {
            setDocValue("");
            setDocError(null);
            setDocDialogPlan(planName);
            return;
        }

        await startCheckout(planName, planKey);
    };

    const handleConfirmDocument = async () => {
        if (!docDialogPlan) return;
        if (!validateCpfCnpj(docValue)) {
            setDocError("Documento inválido. Confira os dígitos do CPF ou CNPJ.");
            return;
        }
        const planName = docDialogPlan;
        const planKey = PLAN_KEY[planName.toLowerCase()];
        setDocDialogPlan(null);
        await startCheckout(planName, planKey, docValue);
    };

    const plans = [
        {
            name: "Free",
            tagline: "Ser encontrado",
            description: "Para criar seu perfil, montar o portfólio e receber as primeiras oportunidades",
            price: 0,
            annualPrice: 0,
            features: [
                "5 candidaturas por mês",
                "10 visualizações de perfil por mês",
                "1 vaga publicada por mês",
                "1 equipamento anunciado",
                "4 arquivos no portfólio",
                "1 conta de social media",
                "1 calendário com IA por mês",
                "10 créditos de IA por mês",
                "1 briefing por mês (até 2 membros)",
                "1 contrato por mês (modelos do sistema)",
                "3 cálculos de rota por mês",
                "Chat ilimitado",
                "Suporte pela comunidade"
            ],
            notIncluded: [
                "Contrapropostas em vagas",
                "Selo Perfil Verificado",
                "WhatsApp e Instagram no perfil",
                "Simulador de Feed e Relatório com IA",
                "Análise de concorrentes",
                "Refinar briefing com IA",
                "Exportação do financeiro"
            ],
            cta: "Começar Grátis",
            ctaVariant: "outline" as const,
            popular: false,
            icon: Zap
        },
        {
            name: "Pro",
            tagline: "Trabalhar",
            description: "Para profissionais ativos: mais visibilidade, contato direto e IA no dia a dia",
            price: 59.90,
            annualPrice: 47.90,
            features: [
                "10 candidaturas por mês",
                "3 contrapropostas por vaga",
                "30 visualizações de perfil por mês",
                "3 vagas publicadas por mês",
                "5 equipamentos anunciados",
                "20 arquivos no portfólio (5 vídeos)",
                "Selo Perfil Verificado",
                "WhatsApp e Instagram no seu perfil público",
                "Prioridade nas buscas",
                "5 contas de social media",
                "Calendários com IA ilimitados",
                "300 créditos de IA por mês",
                "Simulador de Feed, Relatório mensal com IA e demografia",
                "Análise de concorrentes",
                "10 briefings por mês, refinar com IA, até 10 membros",
                "10 contratos por mês, editor e modelos próprios",
                "50 cálculos de rota por mês",
                "Financeiro completo + exportação",
                "Suporte por e-mail"
            ],
            notIncluded: [
                "Equipe de social media",
                "White-label"
            ],
            cta: "Assinar Pro",
            ctaVariant: "default" as const,
            popular: true,
            icon: Crown
        },
        {
            name: "Ultra",
            tagline: "Escalar",
            description: "Para agências e power users: sem limites no marketplace, equipe e white-label",
            price: 159.90,
            annualPrice: 127.90,
            features: [
                "Tudo ilimitado no marketplace: candidaturas, contrapropostas, visualizações, vagas e equipamentos",
                "150 arquivos no portfólio (20 vídeos)",
                "Selo Perfil Verificado e contato direto no perfil",
                "Destaque máximo nas buscas",
                "Contas de social media ilimitadas",
                "Equipe de até 5 membros por conta",
                "1.500 créditos de IA por mês",
                "Simulador de Feed, Relatório com IA e análise de concorrentes",
                "Relatórios e links públicos sem marca IsoScanning (white-label)",
                "Briefings ilimitados",
                "Contratos ilimitados",
                "200 cálculos de rota por mês",
                "Financeiro completo + exportação",
                "Suporte prioritário por WhatsApp"
            ],
            notIncluded: [],
            cta: "Assinar Ultra",
            ctaVariant: "outline" as const,
            popular: false,
            icon: Shield
        }
    ];

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />

            {/* CPF/CNPJ necessário para emissão da cobrança no Asaas */}
            <Dialog open={docDialogPlan !== null} onOpenChange={(open) => { if (!open) setDocDialogPlan(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Informe seu CPF ou CNPJ</DialogTitle>
                        <DialogDescription>
                            Precisamos do seu documento para emitir a cobrança do plano {docDialogPlan}.
                            Ele fica salvo no seu perfil e não será exibido publicamente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label htmlFor="checkout-document">CPF / CNPJ</Label>
                        <Input
                            id="checkout-document"
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="000.000.000-00"
                            value={docValue}
                            onChange={(e) => { setDocValue(formatCpfCnpj(e.target.value)); setDocError(null); }}
                            onKeyDown={(e) => { if (e.key === "Enter") handleConfirmDocument(); }}
                        />
                        {docError && <p className="text-sm text-destructive">{docError}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDocDialogPlan(null)}>Cancelar</Button>
                        <Button onClick={handleConfirmDocument} disabled={docValue.replace(/\D/g, "").length < 11}>
                            Continuar para o pagamento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <main className="flex-1">
                <section className="relative py-20 md:py-32 overflow-hidden">
                    <ParticleBackground />
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl animate-pulse" />
                    </div>

                    <div className="container mx-auto px-4 relative z-10">
                        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                            <ScrollReveal>
                                <div className="inline-flex items-center justify-center p-1 rounded-full bg-muted/50 backdrop-blur-sm mb-6 border">
                                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                                        Nossos Planos
                                    </Badge>
                                </div>
                                <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
                                    Escolha o plano ideal para <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 dark:from-blue-400 dark:via-indigo-400 dark:to-cyan-400">
                                        escalar sua carreira
                                    </span>
                                </h1>
                            </ScrollReveal>

                            <ScrollReveal delay={0.1}>
                                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                                    Comece gratuitamente e faça o upgrade conforme suas necessidades crescem.
                                    Sem contratos de longo prazo, cancele quando quiser.
                                </p>
                            </ScrollReveal>

                            <ScrollReveal delay={0.2}>
                                <div className="flex items-center justify-center gap-4 mt-8">
                                    <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        Mensal
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={isAnnual}
                                            onCheckedChange={setIsAnnual}
                                            id="billing-mode"
                                        />
                                        <Label htmlFor="billing-mode" className="sr-only">Modo de cobrança</Label>
                                    </div>
                                    <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        Anual <span className="text-xs text-green-500 font-bold ml-1">(-20%)</span>
                                    </span>
                                </div>
                            </ScrollReveal>

                            <p className="mt-4 text-sm text-center text-blue-400 font-medium">
                                🎉 Todo cadastro novo ganha {TRIAL_DAYS} dias do Pro grátis, sem cartão.
                            </p>

                            {plan.isTrial && plan.trialDaysLeft !== null && (
                                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                                    <Clock className="h-4 w-4 shrink-0" />
                                    Você está no teste do Pro — {plan.trialDaysLeft} dia{plan.trialDaysLeft === 1 ? "" : "s"} restante{plan.trialDaysLeft === 1 ? "" : "s"}
                                </div>
                            )}
                        </div>


                        {/* Removed Launch Plan Section */}

                        {/* Active Plans */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                            {plans.map((plan, index) => (
                                <ScrollReveal key={plan.name} delay={index * 0.1}>
                                    <Card className={`relative flex flex-col h-full border-2 transition-all duration-300 hover:shadow-xl ${plan.popular ? "border-primary shadow-lg shadow-primary/10" : "border-border hover:border-primary/40"} bg-card/50`}>
                                        {plan.popular && (
                                            <div className="absolute top-0 inset-x-0 flex justify-center -mt-3.5">
                                                <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold shadow-md">
                                                    Mais Popular
                                                </Badge>
                                            </div>
                                        )}
                                        <CardHeader className="pt-8">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className={`p-2.5 rounded-xl ${plan.popular ? "bg-primary/10 text-primary" : "bg-muted text-foreground"}`}>
                                                    <plan.icon className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{plan.tagline}</p>
                                                </div>
                                            </div>
                                            <CardDescription className="min-h-[40px] text-sm">{plan.description}</CardDescription>
                                        </CardHeader>

                                        <CardContent className="flex-1 flex flex-col space-y-6">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-bold">
                                                    {plan.price === 0 ? "R$ 0" : `R$ ${(isAnnual ? plan.annualPrice : plan.price).toFixed(2).replace('.', ',')}`}
                                                </span>
                                                <span className="text-muted-foreground text-sm">/mês</span>
                                            </div>

                                            <div className="space-y-3 flex-1">
                                                {plan.features.map((feature) => (
                                                    <div key={feature} className="flex items-start gap-2 text-sm">
                                                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                                        <span>{feature}</span>
                                                    </div>
                                                ))}
                                                {plan.notIncluded.map((feature) => (
                                                    <div key={feature} className="flex items-start gap-2 text-sm opacity-50">
                                                        <X className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                                        <span className="text-muted-foreground">{feature}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>

                                        <CardFooter className="pt-6 pb-8">
                                            <Button
                                                className={`w-full h-12 text-base ${plan.popular ? "shadow-md hover:shadow-lg hover:shadow-primary/20" : ""}`}
                                                variant={plan.ctaVariant}
                                                size="lg"
                                                onClick={() => handleSubscribe(plan.name)}
                                                disabled={loadingTier !== null}
                                            >
                                                {loadingTier === plan.name && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                {plan.cta}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                </ScrollReveal>
                            ))}
                        </div>

                        <div className="mt-20 text-center">
                            <ScrollReveal delay={0.4}>
                                <p className="text-muted-foreground mb-4">
                                    Precisa de um plano personalizado para sua empresa?
                                </p>
                                <Link href="/contato">
                                    <Button variant="link" className="text-primary font-semibold text-lg">
                                        Entre em contato com nossa equipe de vendas &rarr;
                                    </Button>
                                </Link>
                            </ScrollReveal>
                        </div>
                    </div>
                </section>

                {/* Comparar planos — dirigido por PLAN_LIMITS */}
                <section className="py-16 md:py-20 border-t border-border/60">
                    <div className="container mx-auto px-4">
                        <ScrollReveal>
                            <div className="text-center mb-10 space-y-3">
                                <h2 className="text-3xl md:text-4xl font-bold">Comparar planos</h2>
                                <p className="text-muted-foreground max-w-2xl mx-auto">
                                    Todos os limites lado a lado. As cotas mensais renovam no início de cada mês.
                                </p>
                            </div>
                        </ScrollReveal>

                        <ScrollReveal delay={0.1}>
                            <Card className="max-w-5xl mx-auto overflow-hidden border-border bg-card/50">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[46%] min-w-[220px] text-sm font-semibold">Recurso</TableHead>
                                            {COMPARE_TIERS.map((t) => (
                                                <TableHead
                                                    key={t.tier}
                                                    className={`text-center text-sm font-semibold ${t.tier === "pro" ? "bg-primary/5 text-primary" : ""}`}
                                                >
                                                    {t.label}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {COMPARE_SECTIONS.map((section) => (
                                            <Fragment key={section.title}>
                                                <TableRow className="bg-muted/40 hover:bg-muted/40">
                                                    <TableCell colSpan={COMPARE_TIERS.length + 1} className="py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                        {section.title}
                                                    </TableCell>
                                                </TableRow>
                                                {section.rows.map((row) => (
                                                    <TableRow key={row.key}>
                                                        <TableCell className="text-sm">
                                                            {row.label ?? capitalize(FEATURE_LABELS[row.key])}
                                                        </TableCell>
                                                        {COMPARE_TIERS.map((t) => (
                                                            <TableCell
                                                                key={t.tier}
                                                                className={`text-center text-sm ${t.tier === "pro" ? "bg-primary/5" : ""}`}
                                                            >
                                                                <CompareValue feature={row.key} value={PLAN_LIMITS[t.tier][row.key]} />
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Card>
                        </ScrollReveal>

                        <ScrollReveal delay={0.2}>
                            <p className="mt-6 text-center text-xs text-muted-foreground">
                                Todo cadastro novo ganha {TRIAL_DAYS} dias do Pro grátis, sem cartão. Ao final do teste, sua conta volta para o Free sem custo.
                            </p>
                        </ScrollReveal>
                    </div>
                </section>

                <GradientBackground variant="blue" className="py-20">
                    <FloatingParticles count={10} />
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-3xl font-bold mb-8 text-white">Dúvidas Frequentes</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
                            {[
                                { q: "Como funciona o teste grátis do Pro?", a: `Todo cadastro novo ganha ${TRIAL_DAYS} dias do plano Pro, sem cartão. Ao final do teste, sua conta volta para o Free automaticamente — assine quando quiser para manter os recursos.` },
                                { q: "Como funcionam os créditos de IA?", a: "Os créditos de IA são consumidos pelas ferramentas com inteligência artificial: calendários de social media, relatórios, análise de concorrentes e refinamento de briefing. Cada plano tem uma cota mensal (10 no Free, 300 no Pro e 1.500 no Ultra) que renova todo mês." },
                                { q: "Posso cancelar a qualquer momento?", a: "Sim, todos os planos mensais podem ser cancelados a qualquer momento sem multa. Seu acesso continua até o fim do período pago." },
                                { q: "O que acontece quando atinjo um limite?", a: "Você recebe um aviso na hora e pode fazer upgrade sem perder nada. Os limites mensais renovam no início de cada mês." },
                                { q: "Tenho desconto no plano anual?", a: "Sim! Ao assinar o plano anual você economiza 20% em comparação ao plano mensal." },
                                { q: "Quais métodos de pagamento aceitam?", a: "Aceitamos todos os principais cartões de crédito, PIX e Boleto Bancário." }
                            ].map((faq, i) => (
                                <ScrollReveal key={i} delay={0.1 * i}>
                                    <Card className="bg-white/10 border-white/20 backdrop-blur-sm text-white h-full">
                                        <CardHeader>
                                            <CardTitle className="text-lg">{faq.q}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-white/80">{faq.a}</p>
                                        </CardContent>
                                    </Card>
                                </ScrollReveal>
                            ))}
                        </div>
                    </div>
                </GradientBackground>
            </main>
            <Footer />
        </div>
    );
}
