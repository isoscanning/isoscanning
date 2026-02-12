"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { AuthAwareLink } from "@/components/auth-aware-link";
import {
  Search,
  Package,
  Calendar,
  Users,
  Star,
  ArrowRight,
  Shield,
  Zap,
  Briefcase,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Camera,
  Video,
  PenTool
} from "lucide-react";
import { ParticleBackground } from "@/components/particle-background";
import { ScrollReveal, StaggerReveal } from "@/components/scroll-reveal";
import { GlowText } from "@/components/typing-text";
import { GradientBackground, FloatingParticles } from "@/components/video-background";
import { motion } from "framer-motion";

export default function ComoFuncionaPage() {
  const steps = [
    {
      step: 1,
      title: "Crie seu Perfil",
      description:
        "Cadastre-se como cliente ou profissional. Complete seu perfil com portfólio, habilidades e equipamentos.",
      icon: Users,
      color: "bg-blue-500",
    },
    {
      step: 2,
      title: "Conecte-se",
      description:
        "Publique vagas ou encontre o profissional ideal usando nossos filtros avançados de busca.",
      icon: Search,
      color: "bg-purple-500",
    },
    {
      step: 3,
      title: "Gerencie",
      description:
        "Aprove ou reprove candidaturas, agende serviços e negocie orçamentos diretamente pela plataforma.",
      icon: Briefcase,
      color: "bg-pink-500",
    },
    {
      step: 4,
      title: "Avalie",
      description:
        "Após o trabalho, avalie a experiência para ajudar a construir uma comunidade confiável.",
      icon: Star,
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      <Header />

      <main className="flex-1 overflow-x-hidden">
        {/* ===== HERO SECTION ===== */}
        <section className="relative py-24 md:py-32 overflow-hidden flex items-center justify-center min-h-[60vh]">
          <ParticleBackground />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80 pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10 text-center space-y-8">
            <ScrollReveal>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-sm font-medium mb-4">
                <CheckCircle2 className="h-4 w-4" />
                Entenda o Processo
              </span>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
                <span className="text-foreground">Como a </span>
                <GlowText className="text-primary">ISO Scanning</GlowText>
                <span className="text-foreground"> Funciona</span>
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={0.4}>
              <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto leading-relaxed">
                Uma plataforma completa para conectar criativos e oportunidades.
                <br className="hidden md:inline" /> Do cadastro à avaliação final, simplificamos cada etapa.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.6}>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <AuthAwareLink href="/cadastro">
                  <Button size="lg" className="rounded-full px-8 h-12 shadow-lg hover:shadow-primary/20">
                    Começar Agora <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </AuthAwareLink>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ===== 4 STEPS SECTION ===== */}
        <section className="py-20 bg-muted/30 relative">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <ScrollReveal>
                <h2 className="text-3xl md:text-4xl font-bold">O Caminho para o Sucesso</h2>
                <p className="text-muted-foreground text-lg">
                  Seja você um profissional buscando jobs ou um cliente procurando talentos,
                  nosso fluxo é transparente e eficiente.
                </p>
              </ScrollReveal>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {/* Connecting Line (Desktop) */}
              <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-muted-foreground/20 via-muted-foreground/40 to-muted-foreground/20 -z-10" />

              {steps.map((item, index) => (
                <ScrollReveal key={index} delay={index * 0.1}>
                  <div className="flex flex-col items-center text-center group">
                    <div className={`w-24 h-24 rounded-3xl ${item.color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center mb-6 relative transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg`}>
                      <item.icon className={`h-10 w-10 text-${item.color.replace('bg-', '')}-600 dark:text-${item.color.replace('bg-', '')}-400`} />
                      <div className="absolute -bottom-3 -right-3 w-8 h-8 rounded-full bg-background border-2 border-muted flex items-center justify-center font-bold text-sm shadow-sm">
                        {item.step}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-[250px]">
                      {item.description}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== DEEP DIVE: FEATURES ===== */}
        <section className="py-0">

          {/* Feature 1: Jobs Management */}
          <div className="py-24 overflow-hidden border-t bg-background">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <ScrollReveal direction="left">
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium">
                      <Briefcase className="h-4 w-4" /> Gestão de Vagas
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                      Contrate com <span className="text-blue-600 dark:text-blue-400">Controle Total</span>
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      Esqueça e-mails perdidos e planilhas confusas. Na ISO Scanning, você tem um painel completo para gerenciar suas vagas.
                    </p>

                    <ul className="space-y-4 pt-4">
                      {[
                        { title: "Publique Vagas Detalhadas", desc: "Defina orçamento, datas, e requisitos técnicos." },
                        { title: "Aprovação Simplificada", desc: "Visualize candidatos e aprove ou reprove com um clique." },
                        { title: "Status em Tempo Real", desc: "Acompanhe quem visualizou e quem se candidatou." }
                      ].map((feat, i) => (
                        <li key={i} className="flex gap-4">
                          <div className="mt-1 bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg h-fit">
                            <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{feat.title}</h4>
                            <p className="text-sm text-muted-foreground">{feat.desc}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </ScrollReveal>

                <ScrollReveal direction="right">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" />
                    <Card className="relative border-2 border-muted/50 shadow-2xl overflow-hidden aspect-video flex flex-col">
                      <div className="bg-muted/50 p-3 border-b flex gap-2 items-center">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                        <div className="ml-4 h-4 w-40 bg-muted-foreground/20 rounded-full" />
                      </div>
                      <div className="p-6 flex-1 bg-background/50 backdrop-blur-sm space-y-4">
                        {/* Mock UI for Job Management */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center bg-card border p-4 rounded-xl shadow-sm">
                            <div className="flex gap-3 items-center">
                              <div className="w-10 h-10 rounded-full bg-gray-200" />
                              <div>
                                <div className="font-semibold">João Silva</div>
                                <div className="text-xs text-muted-foreground">Videomaker - R$ 1.200</div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="border-red-200 text-red-600 bg-red-50 hover:bg-red-100 cursor-pointer">Rejeitar</Badge>
                              <Badge className="bg-green-600 hover:bg-green-700 cursor-pointer">Aprovar</Badge>
                            </div>
                          </div>
                          <div className="flex justify-between items-center bg-card border p-4 rounded-xl shadow-sm opacity-60">
                            <div className="flex gap-3 items-center">
                              <div className="w-10 h-10 rounded-full bg-gray-200" />
                              <div>
                                <div className="font-semibold">Maria Costa</div>
                                <div className="text-xs text-muted-foreground">Fotógrafa - R$ 900</div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="secondary">Pendente</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Floating elements */}
                      <div className="absolute top-10 right-10 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
                        Nova Candidatura!
                      </div>
                    </Card>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </div>

          {/* Feature 2: Professional Search */}
          <div className="py-24 overflow-hidden bg-muted/20">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <ScrollReveal direction="left" className="order-2 lg:order-1">
                  <div className="relative group perspective-1000">
                    <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />

                    <div className="grid grid-cols-2 gap-4 relative">
                      <Card className="p-4 space-y-3 border-l-4 border-l-purple-500 shadow-xl transform group-hover:-translate-y-2 transition-transform duration-500">
                        <div className="flex justify-between">
                          <Camera className="text-purple-500" />
                          <Star className="text-yellow-400 fill-yellow-400 w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold">Fotógrafos</div>
                          <div className="text-xs text-muted-foreground">Especialistas em luz e composição</div>
                        </div>
                      </Card>
                      <Card className="p-4 space-y-3 border-l-4 border-l-pink-500 shadow-xl mt-8 transform group-hover:translate-y-2 transition-transform duration-500">
                        <div className="flex justify-between">
                          <Video className="text-pink-500" />
                          <Star className="text-yellow-400 fill-yellow-400 w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold">Videomakers</div>
                          <div className="text-xs text-muted-foreground">Produção e edição de vídeo</div>
                        </div>
                      </Card>
                      <Card className="p-4 space-y-3 border-l-4 border-l-blue-500 shadow-xl transform group-hover:-translate-x-2 transition-transform duration-500">
                        <div className="flex justify-between">
                          <PenTool className="text-blue-500" />
                          <Star className="text-yellow-400 fill-yellow-400 w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold">Editores</div>
                          <div className="text-xs text-muted-foreground">Pós-produção e VFX</div>
                        </div>
                      </Card>
                      <Card className="p-4 space-y-3 border-l-4 border-l-orange-500 shadow-xl mt-8 transform group-hover:translate-x-2 transition-transform duration-500">
                        <div className="flex justify-between">
                          <Package className="text-orange-500" />
                          <div className="text-xs font-bold text-green-500">Disp.</div>
                        </div>
                        <div>
                          <div className="font-bold">Equipamentos</div>
                          <div className="text-xs text-muted-foreground">Câmeras, drones e luzes</div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </ScrollReveal>

                <ScrollReveal direction="right" className="order-1 lg:order-2">
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-sm font-medium">
                      <Search className="h-4 w-4" /> Busca Inteligente
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                      Encontre exatamente <span className="text-purple-600 dark:text-purple-400">quem você precisa</span>
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      Nossa ferramenta de busca vai muito além do básico. Filtre por habilidades específicas, equipamentos que o profissional possui e avaliação da comunidade.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-background shadow-sm p-2 rounded-lg border">
                          <Zap className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div>
                          <h5 className="font-bold text-sm">Skills Verificadas</h5>
                          <p className="text-xs text-muted-foreground">Garantia de capacidade técnica</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="bg-background shadow-sm p-2 rounded-lg border">
                          <Users className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <h5 className="font-bold text-sm">Portfólio Rico</h5>
                          <p className="text-xs text-muted-foreground">Veja trabalhos anteriores</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="bg-background shadow-sm p-2 rounded-lg border">
                          <Package className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                          <h5 className="font-bold text-sm">Equipamento Próprio</h5>
                          <p className="text-xs text-muted-foreground">Saiba o que eles usam</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="bg-background shadow-sm p-2 rounded-lg border">
                          <Shield className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <h5 className="font-bold text-sm">Segurança</h5>
                          <p className="text-xs text-muted-foreground">Perfis validados</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </div>

          {/* Feature 3: Evaluation System */}
          <GradientBackground variant="subtle" className="py-24">
            <div className="container mx-auto px-4 text-center max-w-4xl space-y-12">
              <ScrollReveal>
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-yellow-500/10 mb-6">
                  <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                </div>
                <h2 className="text-3xl md:text-5xl font-bold mb-6">Confiança é a base de tudo</h2>
                <p className="text-xl text-muted-foreground">
                  Nosso sistema de avaliação 360º garante que tanto profissionais quanto contratantes mantenham um alto nível de profissionalismo.
                </p>
              </ScrollReveal>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
                <ScrollReveal delay={0.2}>
                  <Card className="bg-background/80 backdrop-blur border-0 shadow-lg p-6">
                    <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                      <ThumbsUp className="text-green-600 h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Avalie o Profissional</h3>
                    <p className="text-sm text-muted-foreground">Pontualidade, qualidade técnica e comunicação.</p>
                  </Card>
                </ScrollReveal>
                <ScrollReveal delay={0.3}>
                  <Card className="bg-background/80 backdrop-blur border-0 shadow-lg p-6 transform scale-105 border-primary/20">
                    <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-4">
                      <Star className="text-yellow-600 h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Construa Reputação</h3>
                    <p className="text-sm text-muted-foreground">Boas avaliações destacam seu perfil nas buscas.</p>
                  </Card>
                </ScrollReveal>
                <ScrollReveal delay={0.4}>
                  <Card className="bg-background/80 backdrop-blur border-0 shadow-lg p-6">
                    <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                      <Shield className="text-blue-600 h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Transparência</h3>
                    <p className="text-sm text-muted-foreground">Histórico visível para tomadas de decisão seguras.</p>
                  </Card>
                </ScrollReveal>
              </div>
            </div>
          </GradientBackground>

        </section>

        {/* ===== CTA SECTION ===== */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 -z-10" />
          <FloatingParticles count={20} />
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto space-y-8">
              <ScrollReveal>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Pronto para começar?</h2>
                <p className="text-xl text-muted-foreground">
                  Junte-se a milhares de membros que estão transformando o mercado audiovisual.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <AuthAwareLink href="/cadastro">
                    <Button size="lg" className="w-full sm:w-auto px-8 h-12 text-lg rounded-full shadow-xl">
                      Criar Conta Gratuita
                    </Button>
                  </AuthAwareLink>
                  <Link href="/vagas">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 h-12 text-lg rounded-full border-2">
                      Ver Vagas Disponíveis
                    </Button>
                  </Link>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
