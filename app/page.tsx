"use client"

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Search, Calendar, Package, Users, Star, Zap, Shield, ArrowRight, CheckCircle2, Play, Camera, Video, Image as ImageIcon } from "lucide-react";
import { ParticleBackground } from "@/components/particle-background";
import { ScrollReveal, StaggerReveal } from "@/components/scroll-reveal";
import { TypingText, CountUp, GlowText } from "@/components/typing-text";
import { GradientBackground, FloatingParticles } from "@/components/video-background";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* ===== HERO SECTION ===== */}
        <section className="relative min-h-[100vh] flex items-center justify-center py-20 md:py-0 overflow-hidden">
          <ParticleBackground />

          {/* Gradient orbs for visual interest */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 dark:bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-5xl mx-auto text-center space-y-8">
              <ScrollReveal delay={0.2}>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-sm font-medium mb-4">
                  <Zap className="h-4 w-4" />
                  A plataforma que conecta talentos
                </span>
              </ScrollReveal>

              <ScrollReveal delay={0.4}>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
                  <span className="text-foreground">Onde a </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400">
                    criatividade
                  </span>
                  <br className="hidden sm:block" />
                  <span className="text-foreground"> encontra </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400">
                    oportunidade
                  </span>
                </h1>
              </ScrollReveal>

              <ScrollReveal delay={0.6}>
                <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed">
                  Conectamos fotógrafos, videomakers e editores aos melhores projetos.
                  <br className="hidden md:block" />
                  <span className="font-medium text-foreground">
                    Sua próxima grande oportunidade começa aqui.
                  </span>
                </p>
              </ScrollReveal>

              <ScrollReveal delay={0.8}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Link href="/cadastro">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 group"
                    >
                      Começar Gratuitamente
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link href="/profissionais">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto h-14 px-8 text-lg rounded-full bg-background/50 backdrop-blur-sm border-2 hover:bg-background/80 transition-all duration-300"
                    >
                      <Search className="mr-2 h-5 w-5" />
                      Explorar Profissionais
                    </Button>
                  </Link>
                </div>
              </ScrollReveal>

              {/* Quick stats */}
              <ScrollReveal delay={1.0}>
                <div className="flex flex-wrap justify-center gap-8 pt-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>100% Gratuito</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span>Perfis Verificados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>Avaliações Reais</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
              <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
            </div>
          </motion.div>
        </section>

        {/* ===== PROBLEM/SOLUTION SECTION ===== */}
        <section className="py-20 md:py-32 bg-muted/30 dark:bg-muted/10">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-12">
              <ScrollReveal>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
                  <span className="text-muted-foreground">Cansado de </span>
                  <span className="text-foreground">perder oportunidades</span>
                  <span className="text-muted-foreground">?</span>
                </h2>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
                  Sabemos como é difícil encontrar os profissionais certos ou
                  conseguir visibilidade para o seu trabalho.
                </p>
              </ScrollReveal>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
                <ScrollReveal delay={0.3}>
                  <Card className="border-2 border-dashed border-muted-foreground/20 bg-transparent">
                    <CardContent className="pt-6 text-center space-y-3">
                      <div className="text-4xl">😤</div>
                      <p className="text-muted-foreground">
                        Buscas intermináveis por profissionais qualificados
                      </p>
                    </CardContent>
                  </Card>
                </ScrollReveal>

                <ScrollReveal delay={0.4}>
                  <Card className="border-2 border-dashed border-muted-foreground/20 bg-transparent">
                    <CardContent className="pt-6 text-center space-y-3">
                      <div className="text-4xl">📉</div>
                      <p className="text-muted-foreground">
                        Talento incrível sem visibilidade no mercado
                      </p>
                    </CardContent>
                  </Card>
                </ScrollReveal>

                <ScrollReveal delay={0.5}>
                  <Card className="border-2 border-dashed border-muted-foreground/20 bg-transparent">
                    <CardContent className="pt-6 text-center space-y-3">
                      <div className="text-4xl">⏰</div>
                      <p className="text-muted-foreground">
                        Tempo perdido com contatos que não dão retorno
                      </p>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              </div>

              <ScrollReveal delay={0.6}>
                <div className="pt-8">
                  <p className="text-2xl md:text-3xl font-semibold text-foreground">
                    A ISO Scanning resolve isso.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ===== FEATURES SECTION ===== */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center mb-16">
                <span className="text-primary font-semibold text-sm uppercase tracking-wider">
                  Nossos Serviços
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-4 mb-6">
                  Tudo que você precisa.{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                    Em um só lugar.
                  </span>
                </h2>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <ScrollReveal delay={0.1}>
                <Card className="group border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 h-full">
                  <CardContent className="pt-8 pb-8 space-y-6">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-3">
                        Encontre Profissionais
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Busque fotógrafos, videomakers e editores qualificados por
                        localização, especialidade e disponibilidade.
                      </p>
                    </div>
                    <Link href="/profissionais" className="inline-flex items-center text-primary font-semibold group-hover:gap-3 gap-2 transition-all">
                      Explorar
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <Card className="group border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 h-full">
                  <CardContent className="pt-8 pb-8 space-y-6">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:scale-110 transition-transform duration-300">
                      <Package className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-3">
                        Marketplace de Equipamentos
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Alugue ou anuncie câmeras, lentes, iluminação e outros
                        equipamentos profissionais.
                      </p>
                    </div>
                    <Link href="/equipamentos" className="inline-flex items-center text-primary font-semibold group-hover:gap-3 gap-2 transition-all">
                      Ver Equipamentos
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              </ScrollReveal>

              <ScrollReveal delay={0.3}>
                <Card className="group border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 h-full">
                  <CardContent className="pt-8 pb-8 space-y-6">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-lg shadow-pink-500/25 group-hover:scale-110 transition-transform duration-300">
                      <Calendar className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-3">
                        Agendamento Integrado
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Sistema de agendamento com calendário de disponibilidade
                        e confirmação automática.
                      </p>
                    </div>
                    <Link href="/como-funciona" className="inline-flex items-center text-primary font-semibold group-hover:gap-3 gap-2 transition-all">
                      Saiba Mais
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ===== FOR PROFESSIONALS SECTION ===== */}
        <GradientBackground variant="vibrant" className="py-20 md:py-32">
          <FloatingParticles count={15} />
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
              <ScrollReveal direction="left">
                <div className="space-y-6">
                  <span className="text-primary font-semibold text-sm uppercase tracking-wider">
                    Para Profissionais
                  </span>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
                    Mostre seu talento.{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400">
                      Conquiste clientes.
                    </span>
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Crie seu portfólio profissional, defina sua disponibilidade e
                    seja encontrado por clientes que precisam do seu talento.
                  </p>

                  <ul className="space-y-4">
                    {[
                      "Portfólio online profissional",
                      "Gestão de agenda integrada",
                      "Visibilidade para clientes locais",
                      "Avaliações que constroem reputação",
                      "Anúncio de equipamentos para aluguel",
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-green-500/20 dark:bg-green-500/30 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-4">
                    <Link href="/cadastro?tipo=profissional">
                      <Button size="lg" className="h-14 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
                        Criar Meu Perfil Grátis
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="right" delay={0.2}>
                <div className="relative">
                  {/* Mock portfolio cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <Card className="overflow-hidden shadow-xl group">
                        <div className="aspect-[4/5] relative">
                          <img
                            src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=500&fit=crop"
                            alt="Fotógrafo profissional"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Card>
                      <Card className="overflow-hidden shadow-xl group">
                        <div className="aspect-square relative">
                          <img
                            src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=400&fit=crop"
                            alt="Ensaio fotográfico"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Card>
                    </div>
                    <div className="space-y-4 pt-8">
                      <Card className="overflow-hidden shadow-xl group">
                        <div className="aspect-square relative">
                          <img
                            src="https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&h=400&fit=crop"
                            alt="Videomaker trabalhando"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute bottom-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            Vídeo
                          </div>
                        </div>
                      </Card>
                      <Card className="overflow-hidden shadow-xl group">
                        <div className="aspect-[4/5] relative">
                          <img
                            src="https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=400&h=500&fit=crop"
                            alt="Casamento fotografia"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </Card>
                    </div>
                  </div>

                  {/* Floating badge */}
                  <div className="absolute -top-4 -right-4 bg-background rounded-2xl shadow-xl p-4 border-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Verificado</p>
                        <p className="text-xs text-muted-foreground">Perfil Premium</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </GradientBackground>

        {/* ===== HOW IT WORKS ===== */}
        <section className="py-20 md:py-32 bg-muted/30 dark:bg-muted/10">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center mb-16">
                <span className="text-primary font-semibold text-sm uppercase tracking-wider">
                  Simples e Rápido
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-4">
                  Como Funciona
                </h2>
              </div>
            </ScrollReveal>

            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                  { step: 1, title: "Busque", desc: "Encontre profissionais ou equipamentos usando filtros avançados", icon: Search },
                  { step: 2, title: "Compare", desc: "Veja portfólios, avaliações e disponibilidade em tempo real", icon: Star },
                  { step: 3, title: "Conecte", desc: "Entre em contato diretamente e solicite orçamentos", icon: Users },
                  { step: 4, title: "Contrate", desc: "Agende o serviço e avalie sua experiência", icon: CheckCircle2 },
                ].map((item, i) => (
                  <ScrollReveal key={item.step} delay={i * 0.15}>
                    <div className="relative text-center group">
                      {/* Connector line */}
                      {i < 3 && (
                        <div className="hidden md:block absolute top-10 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-primary/10" />
                      )}

                      <div className="relative z-10">
                        <div className="h-20 w-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform duration-300">
                          <item.icon className="h-10 w-10 text-primary-foreground" />
                        </div>
                        <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-background border-2 border-primary flex items-center justify-center font-bold text-primary">
                          {item.step}
                        </div>
                      </div>

                      <h3 className="text-xl font-bold mt-6 mb-2">{item.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== LAUNCH CTA SECTION ===== */}
        <section className="py-20 md:py-24 bg-gradient-to-r from-primary via-purple-600 to-pink-600 dark:from-primary dark:via-purple-700 dark:to-pink-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-white/5 mix-blend-overlay"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center text-white space-y-8">
              <ScrollReveal>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-medium mb-4">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  Oferta de Lançamento
                </div>
                <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                  A Revolução do Audiovisual Começou
                </h2>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto leading-relaxed">
                  Estamos no ar! Aproveite nossas condições especiais de lançamento e garanta acesso a todos os recursos da plataforma por tempo limitado.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={0.4}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Link href="/precos">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto h-14 px-8 text-lg rounded-full bg-white text-primary hover:bg-white/90 shadow-xl transition-all duration-300 font-bold"
                    >
                      Resgatar Plano VIP Grátis
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
                <p className="text-white/70 text-sm mt-4">
                  * Oferta por tempo limitado para os primeiros membros
                </p>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ===== TESTIMONIALS ===== */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center mb-16">
                <span className="text-primary font-semibold text-sm uppercase tracking-wider">
                  Depoimentos
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-4">
                  O que dizem sobre nós
                </h2>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                {
                  quote: "Encontrei o fotógrafo perfeito para meu casamento em menos de uma hora. Recomendo demais!",
                  name: "Mariana Silva",
                  role: "Noiva",
                  avatar: "M",
                },
                {
                  quote: "Como fotógrafo, minha visibilidade aumentou muito. Já fechei 5 contratos pela plataforma.",
                  name: "Lucas Mendes",
                  role: "Fotógrafo",
                  avatar: "L",
                },
                {
                  quote: "O marketplace de equipamentos me salvou! Aluguei uma lente profissional por um preço justo.",
                  name: "Ana Costa",
                  role: "Videomaker",
                  avatar: "A",
                },
              ].map((testimonial, i) => (
                <ScrollReveal key={i} delay={i * 0.15}>
                  <Card className="h-full border-2 hover:border-primary/30 transition-colors">
                    <CardContent className="pt-8 pb-8 space-y-6">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <p className="text-muted-foreground leading-relaxed italic">
                        "{testimonial.quote}"
                      </p>
                      <div className="flex items-center gap-3 pt-4 border-t">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {testimonial.avatar}
                        </div>
                        <div>
                          <p className="font-semibold">{testimonial.name}</p>
                          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="py-24 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-600 to-pink-600 dark:from-primary/90 dark:via-purple-700 dark:to-pink-700" />
          <FloatingParticles count={25} />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center text-white space-y-8">
              <ScrollReveal>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                  Pronto para transformar{" "}
                  <br className="hidden sm:block" />
                  sua carreira criativa?
                </h2>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
                  Junte-se a centenas de profissionais que já estão construindo
                  seu futuro na ISO Scanning.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={0.4}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Link href="/cadastro">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="w-full sm:w-auto h-14 px-10 text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-300"
                    >
                      Criar Conta Gratuita
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto h-14 px-10 text-lg rounded-full bg-transparent border-2 border-white/50 text-white hover:bg-white/10 transition-all duration-300"
                    >
                      Já tenho conta
                    </Button>
                  </Link>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.6}>
                <p className="text-white/70 text-sm pt-4">
                  Sem cartão de crédito • Configuração em 2 minutos • Cancele quando quiser
                </p>
              </ScrollReveal>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
