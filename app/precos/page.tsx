"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, Zap, Crown, Shield } from "lucide-react";
import { ParticleBackground } from "@/components/particle-background";
import { ScrollReveal } from "@/components/scroll-reveal";
import { GradientBackground, FloatingParticles } from "@/components/video-background";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import apiClient from "@/lib/api-service";

// Maps UI plan names to the canonical plan key sent to the API
const PLAN_KEY: Record<string, string> = {
    free: 'free',
    pro: 'pro',
    ultra: 'vip',
};

export default function PricingPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [isAnnual, setIsAnnual] = useState(false);
    const [loadingTier, setLoadingTier] = useState<string | null>(null);

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

        setLoadingTier(planName);

        try {
            const { data } = await apiClient.post('/billing/subscribe', {
                plan: planKey,
                billingCycle: isAnnual ? 'annual' : 'monthly',
            });

            if (data.paymentUrl) {
                // Redirect to Asaas checkout page
                window.location.href = data.paymentUrl;
            } else {
                throw new Error('Payment URL not returned');
            }
        } catch (error: any) {
            console.error('[precos] Subscribe error:', error);
            const message =
                error?.response?.data?.message ||
                'Não foi possível iniciar o pagamento. Tente novamente.';
            toast({
                variant: "destructive",
                title: "Erro ao assinar plano",
                description: message,
            });
        } finally {
            setLoadingTier(null);
        }
    };

    const plans = [
        {
            name: "Free",
            description: "Para quem está começando a explorar novas oportunidades",
            price: 0,
            annualPrice: 0,
            features: [
                "5 candidaturas em vagas por mês",
                "Até 10 visualizações de perfil por mês",
                "Publique até 1 vaga por mês",
                "Anuncie 1 equipamento",
                "Envie até 4 arquivos no portfólio",
                "Gestão de 1 conta de social media",
                "1 calendário com IA por mês"
            ],
            notIncluded: [
                "Envio de contrapropostas",
                "Destaque no marketplace",
                "Suporte prioritário"
            ],
            cta: "Começar Grátis",
            ctaVariant: "outline" as const,
            popular: false,
            icon: Zap
        },
        {
            name: "Pro",
            description: "Perfeito para profissionais ativos e demandas regulares",
            price: 59.90,
            annualPrice: 47.90,
            features: [
                "10 candidaturas em vagas por mês",
                "Até 30 visualizações de perfil por mês",
                "Publique até 3 vagas por mês",
                "Envie 3 contrapropostas por job",
                "Anuncie até 5 equipamentos",
                "Envie até 10 arquivos no portfólio",
                "Selo de Perfil Verificado",
                "Contato direto via WhatsApp",
                "Visualização do Instagram do profissional",
                "Gestão de até 5 contas de social media",
                "Calendários com IA ilimitados"
            ],
            notIncluded: [
                "Candidaturas ilimitadas",
                "Destaque ouro nas buscas"
            ],
            cta: "Assinar Pro",
            ctaVariant: "default" as const,
            popular: true,
            icon: Crown
        },
        {
            name: "Ultra",
            description: "Sem limites para agências e power users",
            price: 159.90,
            annualPrice: 127.90,
            features: [
                "Candidaturas ILIMITADAS",
                "Visualizações de perfil ILIMITADAS",
                "Publique vagas ILIMITADAS",
                "Contrapropostas livres",
                "Equipamentos ILIMITADOS",
                "Envie até 150 arquivos no portfólio",
                "Selo de Perfil Verificado",
                "Contato direto via WhatsApp",
                "Visualização do Instagram do profissional",
                "Destaque máximo nas buscas",
                "Suporte VIP Prioritário",
                "Contas de social media ILIMITADAS",
                "Calendários com IA ilimitados",
                "Até 5 membros de equipe por conta para gestão de social media"
            ],
            notIncluded: [],
            cta: "Ser Profissional Ultra",
            ctaVariant: "outline" as const,
            popular: false,
            icon: Shield
        }
    ];

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />

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
                        </div>


                        {/* Removed Launch Plan Section */}

                        {/* Active Plans */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                            {plans.map((plan, index) => (
                                <ScrollReveal key={plan.name} delay={index * 0.1}>
                                    <Card className={`relative flex flex-col h-full overflow-hidden border-2 transition-all duration-300 hover:shadow-xl ${plan.popular ? "border-primary shadow-lg shadow-primary/10" : "border-border hover:border-primary/40"} bg-card/50`}>
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
                                                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
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
                                                disabled={loadingTier === plan.name}
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

                {/* Feature Comparison Section could go here for more detail */}

                <GradientBackground variant="blue" className="py-20">
                    <FloatingParticles count={10} />
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-3xl font-bold mb-8 text-white">Dúvidas Frequentes</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
                            {[
                                { q: "Posso cancelar a qualquer momento?", a: "Sim, todos os planos mensais podem ser cancelados a qualquer momento sem multa." },
                                { q: "Como funcionam os créditos?", a: "Os créditos são usados para se candidatar a vagas e desbloquear contatos. Eles renovam mensalmente." },
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
