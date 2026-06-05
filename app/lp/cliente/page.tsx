"use client";

import Link from "next/link";
import { LpHeader } from "@/components/lp-header";
import { Footer } from "@/components/footer";
import { FullPageScroller } from "@/components/full-page-scroller";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollReveal } from "@/components/scroll-reveal";
import { ParticleBackground } from "@/components/particle-background";
import { FloatingParticles } from "@/components/video-background";
import { MouseGlow } from "@/components/mouse-glow";
import { HeroImageReveal } from "@/components/hero-image-reveal";
import {
  ArrowRight,
  CheckCircle2,
  Search,
  Star,
  Calendar,
  Package,
  Shield,
  Users,
  MapPin,
  Zap,
  MessageSquare,
  SlidersHorizontal,
  BadgeCheck,
  HeartHandshake,
  FileText,
  Clock,
  ThumbsUp,
  Check,
  X,
  Crown,
} from "lucide-react";

const features = [
  {
    icon: SlidersHorizontal,
    title: "Busca com Filtros Avançados",
    description:
      "Encontre o profissional ideal filtrando por tipo de serviço, localização, disponibilidade, faixa de preço e avaliações. Resultados precisos em segundos.",
    color: "from-blue-500 to-blue-600",
    shadow: "shadow-blue-500/25",
  },
  {
    icon: BadgeCheck,
    title: "Portfólios Verificados",
    description:
      "Cada profissional tem um portfólio completo com fotos, vídeos e projetos anteriores. Veja o trabalho real antes de contratar.",
    color: "from-green-500 to-emerald-600",
    shadow: "shadow-green-500/25",
  },
  {
    icon: Calendar,
    title: "Agendamento Simplificado",
    description:
      "Visualize a disponibilidade do profissional em tempo real e solicite um agendamento diretamente pela plataforma, sem trocas intermináveis de mensagens.",
    color: "from-purple-500 to-indigo-600",
    shadow: "shadow-purple-500/25",
  },
  {
    icon: MessageSquare,
    title: "Comunicação Direta",
    description:
      "Converse diretamente com o profissional, discuta detalhes do projeto, envie referências e alinhe tudo antes de fechar o contrato.",
    color: "from-indigo-500 to-blue-600",
    shadow: "shadow-indigo-500/25",
  },
  {
    icon: FileText,
    title: "Contratos com Segurança",
    description:
      "Contratos digitais assinados eletronicamente com validade legal. Você e o profissional têm proteção jurídica em cada negociação.",
    color: "from-orange-500 to-amber-500",
    shadow: "shadow-orange-500/25",
  },
  {
    icon: Package,
    title: "Marketplace de Equipamentos",
    description:
      "Além de profissionais, você também pode alugar câmeras, drones e equipamentos de iluminação diretamente na plataforma.",
    color: "from-teal-500 to-cyan-600",
    shadow: "shadow-teal-500/25",
  },
  {
    icon: Star,
    title: "Avaliações Reais",
    description:
      "Todas as avaliações são feitas por clientes que realmente contrataram o profissional. Nenhuma avaliação falsa — só experiências genuínas.",
    color: "from-yellow-500 to-amber-500",
    shadow: "shadow-yellow-500/25",
  },
  {
    icon: HeartHandshake,
    title: "Orçamentos Transparentes",
    description:
      "Receba propostas detalhadas, compare valores e negocie condições diretamente. Sem surpresas no final do projeto.",
    color: "from-pink-500 to-rose-500",
    shadow: "shadow-pink-500/25",
  },
];

const steps = [
  {
    step: 1,
    title: "Busque Profissionais",
    description:
      "Use os filtros de localização, especialidade e disponibilidade para encontrar quem você precisa.",
    icon: Search,
  },
  {
    step: 2,
    title: "Veja os Portfólios",
    description:
      "Explore o trabalho real de cada profissional, leia avaliações de outros clientes e compare.",
    icon: BadgeCheck,
  },
  {
    step: 3,
    title: "Solicite um Orçamento",
    description:
      "Entre em contato, descreva seu projeto e receba propostas detalhadas para tomar a melhor decisão.",
    icon: MessageSquare,
  },
  {
    step: 4,
    title: "Agende e Contrate",
    description:
      "Confirme o agendamento, assine o contrato digital e deixe sua ideia nas mãos de quem entende.",
    icon: CheckCircle2,
  },
];

const testimonials = [
  {
    quote:
      "Precisava de um fotógrafo para o lançamento do meu produto com apenas 3 dias de antecedência. Encontrei um profissional incrível na plataforma em menos de 1 hora.",
    name: "Sophia Lima",
    role: "Social Media Manager",
    initial: "S",
  },
  {
    quote:
      "Contratei um videomaker para um evento corporativo e o resultado superou todas as expectativas. A facilidade de ver o portfólio antes fez toda a diferença.",
    name: "Ricardo Alves",
    role: "Gerente de Marketing",
    initial: "R",
  },
  {
    quote:
      "Precisava de um piloto de drone para captação aérea de um empreendimento. Encontrei um certificado na minha cidade em minutos. Serviço impecável.",
    name: "Fernanda Costa",
    role: "Gestora Imobiliária",
    initial: "F",
  },
];

const faqs = [
  {
    q: "Como encontro o profissional certo para o meu projeto?",
    a: "Use os filtros de busca para selecionar o tipo de serviço que precisa (foto, vídeo, drone, etc.), sua cidade e data desejada. A plataforma retorna profissionais disponíveis na sua região com seus portfólios e avaliações para você comparar.",
  },
  {
    q: "Os profissionais são verificados?",
    a: "Sim. Todos os profissionais passam por um processo de verificação de cadastro e os que optam pelo plano pago recebem o selo de 'Perfil Verificado'. Além disso, avaliações de clientes reais ajudam a garantir a qualidade dos serviços.",
  },
  {
    q: "Preciso criar uma conta para contratar?",
    a: "Você pode navegar e visualizar portfólios sem conta. Para solicitar orçamentos, entrar em contato e agendar serviços, é necessário um cadastro gratuito.",
  },
  {
    q: "Como funciona o contrato digital?",
    a: "Após combinar o serviço com o profissional, você pode assinar um contrato digital diretamente na plataforma. O documento é autenticado com verificação por e-mail e hash criptográfico, tendo validade legal para ambas as partes.",
  },
  {
    q: "E se eu não ficar satisfeito com o serviço?",
    a: "A plataforma oferece um canal de comunicação direta entre clientes e profissionais para resolução de eventuais problemas. Recomendamos sempre alinhar todas as expectativas antes do serviço via contrato e conversa prévia pela plataforma.",
  },
];

export default function LpCliente() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LpHeader ctaHref="/cadastro" ctaLabel="Criar Conta Grátis" produtoHref="/lp/cliente" />

      <main className="flex-1 flex flex-col">
        <FullPageScroller sectionsCount={8}>
        {/* ===== HERO ===== */}
        <section className="relative h-[100vh] md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex items-center justify-center overflow-hidden">
          <HeroImageReveal src="/camera-exploded.png" radius={400} opacity={0.2} />
          <MouseGlow color="67, 56, 202" size={600} opacity={0.13} />
          <ParticleBackground />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] bg-indigo-500/15 dark:bg-indigo-500/8 rounded-full blur-3xl animate-pulse" />
            <div
              className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-cyan-500/15 dark:bg-cyan-500/8 rounded-full blur-3xl animate-pulse"
              style={{ animationDelay: "1.5s" }}
            />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-8">
              <ScrollReveal delay={0.1}>
                <Badge
                  variant="secondary"
                  className="px-4 py-1.5 text-xs md:text-sm gap-2 bg-primary/10 text-primary border-primary/20"
                >
                  <Search className="h-4 w-4" />
                  Encontre o profissional criativo ideal para o seu projeto
                </Badge>
              </ScrollReveal>

              <ScrollReveal delay={0.25}>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-6xl font-bold tracking-tight leading-tight">
                  <span className="text-foreground">Sua ideia merece </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-600 dark:from-indigo-400 dark:via-blue-400 dark:to-cyan-400">
                    um profissional
                  </span>
                  <br className="hidden sm:block" />
                  <span className="text-foreground"> à </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400">
                    sua altura
                  </span>
                </h1>
              </ScrollReveal>

              <ScrollReveal delay={0.4}>
                <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed">
                  Fotógrafos, videomakers, story makers e pilotos de drone —
                  todos verificados e prontos para{" "}
                  <span className="font-medium text-foreground">
                    transformar suas ideias em realidade.
                  </span>
                </p>
              </ScrollReveal>

              <ScrollReveal delay={0.55}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Link href="/profissionais">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 group"
                    >
                      <Search className="mr-2 h-5 w-5" />
                      Buscar Profissionais
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link href="/cadastro">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto h-14 px-8 text-lg rounded-full bg-background/50 backdrop-blur-sm border-2 hover:bg-background/80 transition-all duration-300"
                    >
                      Criar Conta Grátis
                    </Button>
                  </Link>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.7}>
                <div className="flex flex-wrap justify-center gap-6 pt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Portfólios Reais</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span>Profissionais Verificados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-purple-500" />
                    <span>Perto de Você</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span>Disponibilidade em Tempo Real</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ===== SERVICE TYPES ===== */}
        <section className="h-[100vh] md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center bg-muted/30 dark:bg-muted/10 border-y border-border/40 py-10 md:py-0">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <p className="text-center text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6 md:mb-10">
                Encontre profissionais para qualquer tipo de projeto
              </p>
            </ScrollReveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {[
                { label: "Casamentos", icon: HeartHandshake, desc: "Foto e vídeo do seu grande dia" },
                { label: "Eventos", icon: Users, desc: "Corporativo, festa, show e mais" },
                { label: "Imóveis", icon: MapPin, desc: "Fotos e drone para seu imóvel" },
                { label: "Conteúdo Digital", icon: Zap, desc: "Reels, stories e campanhas" },
              ].map((item, i) => (
                <ScrollReveal key={i} delay={i * 0.1}>
                  <div className="text-center group">
                    <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-primary/50 transition-all duration-300">
                      <item.icon className="h-8 w-8 text-primary" />
                    </div>
                    <p className="font-semibold text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FEATURES ===== */}
        <section className="h-[100vh] md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center py-10 md:py-0">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center mb-8 md:mb-10 space-y-2 md:space-y-3">
                <span className="text-primary font-semibold text-xs md:text-sm uppercase tracking-wider">
                  Por que ISO Scanning
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                  Tudo que você precisa para{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400">
                    contratar com confiança
                  </span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Comparar portfólios, ler avaliações, agendar e assinar contratos — tudo em um
                  único lugar, sem complicação.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {features.map((feature, i) => (
                <ScrollReveal key={i} delay={Math.floor(i / 4) * 0.1 + (i % 4) * 0.1}>
                  <Card className="group border-2 hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 h-full">
                    <CardContent className="p-4 md:p-5 space-y-3 md:space-y-4">
                      <div
                        className={`h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg ${feature.shadow} group-hover:scale-110 transition-transform duration-300`}
                      >
                        <feature.icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm md:text-base mb-1 md:mb-2">{feature.title}</h3>
                        <p className="text-muted-foreground text-[10px] md:text-xs leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="h-[100vh] md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center bg-muted/30 dark:bg-muted/10 py-10 md:py-0">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center mb-8 md:mb-10 space-y-2 md:space-y-4">
                <span className="text-primary font-semibold text-xs md:text-sm uppercase tracking-wider">
                  Simples e Rápido
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                  Da ideia ao projeto realizado
                </h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                  Em poucos passos você encontra, contrata e agenda o profissional ideal para o seu projeto.
                </p>
              </div>
            </ScrollReveal>

            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {steps.map((item, i) => (
                  <ScrollReveal key={item.step} delay={i * 0.15}>
                    <div className="relative text-center group">
                      {i < steps.length - 1 && (
                        <div className="hidden md:block absolute top-10 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-primary/10" />
                      )}
                      <div className="relative z-10">
                        <div className="h-20 w-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform duration-300">
                          <item.icon className="h-10 w-10 text-primary-foreground" />
                        </div>
                        <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-background border-2 border-primary flex items-center justify-center font-bold text-primary text-sm">
                          {item.step}
                        </div>
                      </div>
                      <h3 className="text-lg font-bold mt-6 mb-2">{item.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>

            <ScrollReveal delay={0.5}>
              <div className="text-center mt-16">
                <Link href="/profissionais">
                  <Button
                    size="lg"
                    className="h-14 px-10 text-lg rounded-full shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 group"
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Encontrar um Profissional
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ===== TESTIMONIALS ===== */}
        <section className="h-[100vh] md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center py-10 md:py-0">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center mb-8 md:mb-12 space-y-2 md:space-y-4">
                <span className="text-primary font-semibold text-xs md:text-sm uppercase tracking-wider">
                  Depoimentos
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                  Quem já contratou recomenda
                </h2>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {testimonials.map((t, i) => (
                <ScrollReveal key={i} delay={i * 0.15}>
                  <Card className="h-full border-2 hover:border-primary/30 transition-colors">
                    <CardContent className="pt-8 pb-8 space-y-6">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <p className="text-muted-foreground leading-relaxed italic text-sm">
                        &ldquo;{t.quote}&rdquo;
                      </p>
                      <div className="flex items-center gap-3 pt-4 border-t">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-600 flex items-center justify-center text-white font-bold">
                          {t.initial}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.role}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PRICING ===== */}
        <section id="precos" className="scroll-mt-16 h-[100vh] md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center bg-muted/30 dark:bg-muted/10 py-10 md:py-0">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center mb-6 md:mb-8 space-y-1 md:space-y-2">
                <span className="text-primary font-semibold text-xs md:text-sm uppercase tracking-wider">
                  Planos e Preços
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                  Acesse a plataforma{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400">
                    gratuitamente
                  </span>
                </h2>
                <p className="text-base text-muted-foreground max-w-2xl mx-auto">
                  Cadastre-se de graça e explore a plataforma. Faça upgrade quando precisar de mais.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  name: "Free",
                  description: "Para quem está começando a explorar novas oportunidades",
                  price: "R$ 0",
                  period: "/mês",
                  cta: "Começar Grátis",
                  ctaVariant: "outline" as const,
                  popular: false,
                  icon: Zap,
                  iconColor: "text-muted-foreground",
                  features: [
                    "5 candidaturas em vagas por mês",
                    "Até 10 visualizações de perfil por mês",
                    "Publique até 1 vaga por mês",
                    "Anuncie 1 equipamento",
                    "Envie até 4 arquivos no portfólio",
                  ],
                  notIncluded: [
                    "Envio de contrapropostas",
                    "Destaque no marketplace",
                    "Suporte prioritário",
                  ],
                },
                {
                  name: "Standard",
                  description: "Perfeito para profissionais ativos e demandas regulares",
                  price: "R$ 49,90",
                  period: "/mês",
                  cta: "Assinar Standard",
                  ctaVariant: "default" as const,
                  popular: true,
                  icon: Crown,
                  iconColor: "text-primary",
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
                  ],
                  notIncluded: [
                    "Candidaturas ilimitadas",
                    "Destaque ouro nas buscas",
                  ],
                },
                {
                  name: "Pro",
                  description: "Sem limites para agências e power users",
                  price: "R$ 99,90",
                  period: "/mês",
                  cta: "Ser Profissional Pro",
                  ctaVariant: "outline" as const,
                  popular: false,
                  icon: Shield,
                  iconColor: "text-purple-500",
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
                  ],
                  notIncluded: [],
                },
              ].map((plan, i) => (
                <ScrollReveal key={plan.name} delay={i * 0.1}>
                  <Card
                    className={`relative flex flex-col h-full border-2 transition-all duration-300 hover:shadow-xl ${
                      plan.popular
                        ? "border-primary shadow-lg shadow-primary/10"
                        : "hover:border-primary/40"
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-[9px] font-semibold shadow-md">
                          Mais Popular
                        </Badge>
                      </div>
                    )}
                    <CardContent className="p-4 md:p-5 flex flex-col gap-3 md:gap-4 h-full">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1.5 md:p-2 rounded-lg ${
                            plan.popular ? "bg-primary/10" : "bg-muted"
                          }`}
                        >
                          <plan.icon className={`h-4 w-4 md:h-5 md:w-5 ${plan.iconColor}`} />
                        </div>
                        <h3 className="font-bold text-base md:text-lg">{plan.name}</h3>
                      </div>

                      <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-2 min-h-[32px] md:min-h-[36px]">{plan.description}</p>

                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl md:text-3xl font-bold">{plan.price}</span>
                        <span className="text-[10px] md:text-xs text-muted-foreground">{plan.period}</span>
                      </div>

                      <div className="flex-1 space-y-1.5 md:space-y-2 mt-1 md:mt-2">
                        {plan.features.map((f) => (
                          <div key={f} className="flex items-start gap-2 text-[10px] md:text-xs">
                            <Check className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-500 mt-0.5 shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                        {plan.notIncluded.map((f, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-[10px] md:text-xs text-muted-foreground/60 opacity-60">
                            <X className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>

                      <Link href="/precos" className="mt-auto pt-1">
                        <Button
                          variant={plan.ctaVariant}
                          className={`w-full h-10 md:h-11 text-xs md:text-sm ${
                            plan.popular
                              ? "shadow-md hover:shadow-lg hover:shadow-primary/20"
                              : ""
                          }`}
                        >
                          {plan.cta}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={0.4}>
              <p className="text-center text-sm text-muted-foreground mt-8">
                Quer ver todos os detalhes?{" "}
                <Link href="/precos" className="text-primary font-semibold hover:underline">
                  Consulte a página completa de preços →
                </Link>
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section id="faq" className="scroll-mt-16 h-[100vh] md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center bg-muted/30 dark:bg-muted/10 py-10 md:py-0">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-8 md:mb-10 space-y-2 md:space-y-4">
                  <span className="text-primary font-semibold text-xs md:text-sm uppercase tracking-wider">
                    FAQ
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-bold">
                    Dúvidas Frequentes
                  </h2>
                  <p className="text-muted-foreground">
                    Tudo que você precisa saber antes de contratar.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <Card className="border-2">
                  <CardContent className="p-6">
                    <Accordion type="single" collapsible className="w-full">
                      {faqs.map((faq, i) => (
                        <AccordionItem key={i} value={`item-${i}`} className="py-1">
                          <AccordionTrigger className="text-base font-medium hover:no-underline hover:text-primary">
                            {faq.q}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground text-sm md:text-base leading-relaxed">
                            {faq.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="h-[100vh] md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center relative overflow-hidden bg-slate-950 py-10 md:py-0">
          <FloatingParticles count={15} />
          
          <div className="absolute inset-0 overflow-hidden pointer-events-none flex justify-center items-center">
            <div className="w-[800px] h-[400px] bg-indigo-600/10 dark:bg-indigo-500/10 blur-[120px] rounded-[100%]" />
          </div>

          <div className="container mx-auto px-4 relative z-10 flex-1 flex flex-col justify-center">
            <div className="max-w-4xl mx-auto text-center text-white space-y-8">
              <ScrollReveal>
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight">
                  Encontre agora o profissional{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400">
                    perfeito para seu projeto
                  </span>
                </h2>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto font-light">
                  Centenas de profissionais verificados esperando para transformar
                  sua visão em realidade.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={0.35}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                  <Link href="/profissionais">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto h-14 px-8 text-base rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white shadow-xl transition-all duration-300 group"
                    >
                      <Search className="mr-2 h-4 w-4" />
                      Buscar Profissionais Agora
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link href="/cadastro">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto h-14 px-8 text-base rounded-xl bg-black/40 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-sm"
                    >
                      Criar Conta Grátis
                    </Button>
                  </Link>
                </div>
                <p className="text-white/40 text-xs mt-6">
                  Sem cartão de crédito · Acesso imediato · Cadastro em 2 minutos
                </p>
              </ScrollReveal>
            </div>
          </div>
          
          <div className="w-full mt-auto relative z-20">
            <Footer />
          </div>
        </section>
        </FullPageScroller>
      </main>
    </div>
  );
}
