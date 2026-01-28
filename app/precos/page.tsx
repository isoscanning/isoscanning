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

export default function PricingPage() {
    const { updateSubscriptionTier, userProfile, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [isAnnual, setIsAnnual] = useState(false);
    const [loadingTier, setLoadingTier] = useState<string | null>(null);

    const handleSubscribe = async (tierName: string) => {
        if (authLoading) return;

        if (!userProfile) {
            router.push("/auth/login?redirect=/precos");
            return;
        }

        const tier = tierName.toLowerCase() as 'free' | 'standard' | 'pro' | 'vip';
        setLoadingTier(tierName);

        try {
            await updateSubscriptionTier(tier);
            toast({
                title: "Plano atualizado!",
                description: `Você agora é um assinante ${tierName}. Aproveite!`,
            });
            // Optional: redirect to dashboard after success
            // router.push("/dashboard");
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Erro ao atualizar plano",
                description: "Tente novamente mais tarde.",
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
                "Envie até 4 arquivos no portfólio"
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
            name: "Standard",
            description: "Perfeito para profissionais ativos e demandas regulares",
            price: 49.90,
            annualPrice: 39.90,
            features: [
                "10 candidaturas em vagas por mês",
                "Até 30 visualizações de perfil por mês",
                "Publique até 3 vagas por mês",
                "Envie 3 contrapropostas por job",
                "Anuncie até 5 equipamentos",
                "Envie até 10 arquivos no portfólio",
                "Selo de Perfil Verificado"
            ],
            notIncluded: [
                "Candidaturas ilimitadas",
                "Destaque ouro nas buscas"
            ],
            cta: "Assinar Standard",
            ctaVariant: "default" as const,
            popular: true,
            icon: Crown
        },
        {
            name: "Pro",
            description: "Sem limites para agências e power users",
            price: 99.90,
            annualPrice: 79.90,
            features: [
                "Candidaturas ILIMITADAS",
                "Visualizações de perfil ILIMITADAS",
                "Publique vagas ILIMITADAS",
                "Contrapropostas livres",
                "Equipamentos ILIMITADOS",
                "Envie até 20 arquivos no portfólio",
                "Selo de Perfil Verificado",
                "Destaque máximo nas buscas",
                "Suporte VIP Prioritário"
            ],
            notIncluded: [],
            cta: "Ser Profissional Pro",
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
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400">
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


                        {/* Launch Plan Section */}
                        <ScrollReveal>
                            <div className="max-w-4xl mx-auto mb-20">
                                <Card className="relative overflow-hidden border-2 border-primary shadow-2xl shadow-primary/20 bg-background/60 backdrop-blur-xl">
                                    <div className="absolute top-0 right-0 p-4">
                                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold px-4 py-1 rounded-full shadow-lg animate-pulse">
                                            Oferta de Lançamento
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />

                                    <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12">
                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="text-3xl font-bold mb-2">Plano VIP</h3>
                                                <p className="text-muted-foreground text-lg">
                                                    Acesso total a todas as funcionalidades do sistema durante o período de lançamento.
                                                </p>
                                            </div>

                                            <div className="flex items-baseline gap-2">
                                                <span className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                                                    R$ 0,00
                                                </span>
                                                <span className="text-xl text-muted-foreground line-through">R$ 99,90</span>
                                            </div>

                                            <Button
                                                size="lg"
                                                className="w-full text-lg h-14 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/25"
                                                onClick={() => handleSubscribe('vip')}
                                                disabled={loadingTier === 'vip' || userProfile?.subscriptionTier === 'vip'}
                                            >
                                                {loadingTier === 'vip' && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                                {userProfile?.subscriptionTier === 'vip' ? "Plano Atual Ativo" : "Garantir Acesso Completo Grátis"}
                                            </Button>

                                            <p className="text-center text-sm text-muted-foreground">
                                                *Válido por tempo limitado. Cancele quando quiser.
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
                                                Tudo que você precisa:
                                            </div>
                                            <div className="grid gap-3">
                                                {[
                                                    "Candidaturas ILIMITADAS",
                                                    "Visualizações de perfil ILIMITADAS",
                                                    "Publique vagas ILIMITADAS",
                                                    "Contrapropostas livres",
                                                    "Envie até 20 arquivos no portfólio",
                                                    "Selo de Perfil Verificado",
                                                    "Destaque máximo nas buscas",
                                                    "Suporte VIP Prioritário"
                                                ].map((feature) => (
                                                    <div key={feature} className="flex items-start gap-3">
                                                        <div className="mt-1 p-1 rounded-full bg-green-500/10">
                                                            <Check className="h-3 w-3 text-green-500" />
                                                        </div>
                                                        <span className="text-sm md:text-base">{feature}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </ScrollReveal>

                        {/* Existing Plans (Disabled) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto opacity-60 grayscale-[0.5] pointer-events-none select-none relative after:absolute after:inset-0 after:z-10">
                            {plans.map((plan, index) => (
                                <ScrollReveal key={plan.name} delay={index * 0.1}>
                                    <Card className={`relative flex flex-col h-full overflow-hidden border-border bg-card/50`}>
                                        <CardHeader>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className={`p-2 rounded-lg bg-muted text-foreground`}>
                                                    <plan.icon className="h-6 w-6" />
                                                </div>
                                            </div>
                                            <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                                            <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
                                        </CardHeader>

                                        <CardContent className="flex-1 space-y-6">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-bold">
                                                    R$ 0,00
                                                </span>
                                                <span className="text-muted-foreground">/mês</span>
                                            </div>

                                            <div className="space-y-3">
                                                {plan.features.map((feature) => (
                                                    <div key={feature} className="flex items-start gap-2 text-sm">
                                                        <Check className="h-4 w-4 text-primary/50 mt-0.5 shrink-0" />
                                                        <span>{feature}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>

                                        <CardFooter className="pt-6">
                                            <Button
                                                className="w-full h-11"
                                                variant="outline"
                                                size="lg"
                                                disabled
                                            >
                                                Em breve
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

                <GradientBackground variant="vibrant" className="py-20">
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
