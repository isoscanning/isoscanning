"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LpHeader } from "@/components/lp-header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FullPageScroller } from "@/components/full-page-scroller";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ScrollReveal, SplitWordReveal, BlurReveal, TiltCard } from "@/components/scroll-reveal";
import { ParticleBackground } from "@/components/particle-background";
import { FloatingParticles } from "@/components/video-background";
import { MouseGlow } from "@/components/mouse-glow";
import { HeroImageReveal } from "@/components/hero-image-reveal";
import { InteractiveFeatures } from "@/components/interactive-features";
import {
  ArrowRight,
  CheckCircle2,
  Camera,
  Video,
  Wind,
  Star,
  Calendar,
  Package,
  DollarSign,
  FileText,
  Users,
  Shield,
  Briefcase,
  TrendingUp,
  MapPin,
  Zap,
  MessageSquare,
  Check,
  X,
  Crown,
  Quote,
} from "lucide-react";

const fluxos = [
  {
    badge: "PARA FOTÓGRAFOS",
    title: "Construa sua autoridade visual.",
    description: "Conquiste clientes com um visual impecável. Centralize seu portfólio, agendamentos e contratos em um só lugar.",
    bullets: [
      "Portfólio online sem limites de upload",
      "Agenda integrada para ensaios e eventos",
      "Contratos digitais com validade legal",
      "Aluguel de câmeras e lentes no Marketplace",
    ],
    link: "Ver ferramentas para fotografia",
    bgClass: "bg-blue-950/20",
    borderClass: "border-blue-500/20",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    linkClass: "text-blue-400 hover:text-blue-300",
  },
  {
    badge: "PARA VIDEOMAKERS",
    title: "Projetos de vídeo sob controle.",
    description: "Aumente sua credibilidade com grandes clientes corporativos. Profissionalize seus orçamentos e garanta seus recebimentos.",
    bullets: [
      "Busca inteligente por clientes corporativos",
      "Contratos de serviço blindados e seguros",
      "Marketplace para locação de drones e luz",
      "Gestão Financeira completa dos projetos",
    ],
    link: "Ver ferramentas para vídeo",
    bgClass: "bg-indigo-950/20",
    borderClass: "border-indigo-500/20",
    badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    linkClass: "text-indigo-400 hover:text-indigo-300",
  },
  {
    badge: "PARA CRIADORES",
    title: "Destaque digital e monetização.",
    description: "Story makers e criadores digitais precisam de agilidade. Tenha seu link na bio focado em converter seguidores em clientes pagantes.",
    bullets: [
      "Portfólio otimizado para mobile (Link na Bio)",
      "Gestão FinMEI para não perder limite anual",
      "Construção de avaliações e reputação",
      "Acesso a vagas e oportunidades recorrentes",
    ],
    link: "Ver ferramentas para criadores",
    bgClass: "bg-cyan-950/20",
    borderClass: "border-cyan-500/20",
    badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    linkClass: "text-cyan-400 hover:text-cyan-300",
  }
];

const allFeatures = [
  {
    icon: Camera,
    title: "Portfólio Profissional",
    description:
      "Mostre seu trabalho com um portfólio online bonito e organizado. Upload ilimitado de fotos, vídeos e projetos para impressionar seus futuros clientes.",
    color: "from-blue-500 to-blue-600",
    shadow: "shadow-blue-500/25",
  },
  {
    icon: Calendar,
    title: "Agenda Integrada",
    description:
      "Gerencie sua disponibilidade com um calendário inteligente. Defina seus horários, receba solicitações de agendamento e confirme serviços com poucos cliques.",
    color: "from-blue-500 to-blue-600",
    shadow: "shadow-blue-500/25",
  },
  {
    icon: Briefcase,
    title: "Vagas e Oportunidades",
    description:
      "Acesse oportunidades de trabalho publicadas por clientes diretos e empresas. Candidate-se a jobs que combinam com o seu perfil e especialidade.",
    color: "from-blue-500 to-blue-600",
    shadow: "shadow-blue-500/25",
  },
  {
    icon: Package,
    title: "Marketplace de Equipamentos",
    description:
      "Anuncie seus equipamentos para locação e também alugue o que precisa para cada projeto. Câmeras, drones, iluminação e muito mais.",
    color: "from-blue-500 to-blue-600",
    shadow: "shadow-blue-500/25",
  },
  {
    icon: DollarSign,
    title: "Gestão Financeira e FinMEI",
    description:
      "Controle receitas, valores a receber e acompanhe o limite do MEI em tempo real. Chega de planilhas — tudo centralizado na plataforma.",
    color: "from-blue-500 to-blue-600",
    shadow: "shadow-blue-500/25",
  },
  {
    icon: FileText,
    title: "Contratos Digitais",
    description:
      "Crie e assine contratos profissionais digitalmente com validade legal. Proteja seu trabalho e garanta segurança em cada negociação.",
    color: "from-blue-500 to-blue-600",
    shadow: "shadow-blue-500/25",
  },
  {
    icon: MessageSquare,
    title: "Comunidade Criativa",
    description:
      "Conecte-se com outros fotógrafos, videomakers e criadores. Compartilhe experiências, dicas e oportunidades nessa rede exclusiva.",
    color: "from-blue-500 to-blue-600",
    shadow: "shadow-blue-500/25",
  },
  {
    icon: Star,
    title: "Avaliações e Reputação",
    description:
      "Construa sua reputação com avaliações reais de clientes satisfeitos. Um bom histórico de feedbacks gera muito mais contratos.",
    color: "from-blue-500 to-blue-600",
    shadow: "shadow-blue-500/25",
  },
];

const competitors = [
  { platform: "Banlek", focus: "Venda de fotos de eventos (stock)", comission: "10%", portfolio: "Parcial", fin: "Não", highlight: false },
  { platform: "Fotto", focus: "Fotos de esportes e eventos", comission: "10%", portfolio: "Parcial", fin: "Não", highlight: false },
  { platform: "99Freelas / Workana", focus: "Freelance geral", comission: "Sobre contrato", portfolio: "Não", fin: "Não", highlight: false },
  { platform: "Freelancer.com.br", focus: "Freelance geral", comission: "Comissão + assinatura", portfolio: "Não", fin: "Não", highlight: false },
  { platform: "IsoScanning", focus: "Portfolio + Serviços + Equipamentos + FinMEI", comission: "0%", portfolio: "Nativo", fin: "Nativo", highlight: true },
];

const steps = [
  {
    step: 1,
    title: "Crie seu Perfil",
    description:
      "Cadastre-se gratuitamente, preencha suas informações e faça upload do seu portfólio em minutos.",
    icon: Users,
  },
  {
    step: 2,
    title: "Configure sua Agenda",
    description:
      "Defina sua disponibilidade, localização de atuação e tipo de serviços que você oferece.",
    icon: Calendar,
  },
  {
    step: 3,
    title: "Seja Encontrado",
    description:
      "Clientes buscam profissionais na plataforma e encontram você com base na localização e especialidade.",
    icon: MapPin,
  },
  {
    step: 4,
    title: "Feche Contratos",
    description:
      "Receba solicitações, negocie valores, assine contratos digitais e comece a trabalhar.",
    icon: CheckCircle2,
  },
];

const testimonials = [
  {
    quote:
      "Antes eu ficava dependendo de indicações. Com a ISO Scanning, já fechei 5 contratos em dois meses — clientes que me encontraram diretamente na plataforma.",
    name: "Anderson Larcher Franco",
    role: "Fotógrafo",
    initial: "A",
  },
  {
    quote:
      "O marketplace de equipamentos me salvou numa semana de edição pesada. Aluguei um setup de iluminação por um preço justo e entregou o projeto no prazo.",
    name: "Gutemberg Silva",
    role: "Videomaker",
    initial: "G",
  },
  {
    quote:
      "A gestão financeira integrada é incrível. Consigo ver tudo que recebi, o que está pendente e ainda fico de olho no meu limite de MEI sem precisar de planilha.",
    name: "Rafael Mendes",
    role: "Piloto de Drone",
    initial: "R",
  },
];

const faqs = [
  {
    q: "A plataforma cobra alguma taxa ou comissão sobre os meus serviços?",
    a: "Não! Na IsoScanning, o dinheiro é inteiramente seu. Nós somos a única plataforma que não cobra comissões sobre os trabalhos e serviços fechados, garantindo que 100% do valor vá para o seu bolso.",
  },
  {
    q: "É totalmente gratuito para se cadastrar?",
    a: "Sim! O cadastro é 100% gratuito. Você pode criar seu perfil, adicionar seu portfólio e explorar a plataforma sem custo algum. Oferecemos planos pagos para quem quer visibilidade máxima e uploads ilimitados, mas você pode começar gratuitamente.",
  },
  {
    q: "Como funciona a Gestão Financeira (FinMEI)?",
    a: "Nosso módulo FinMEI permite controlar todas as suas receitas diretamente na plataforma. Você monitora seu faturamento, tem previsibilidade de caixa e acompanha em tempo real o limite do seu MEI para não ter surpresas na declaração anual.",
  },
  {
    q: "Posso alugar meus próprios equipamentos pelo sistema?",
    a: "Com certeza! Temos um Marketplace de Equipamentos integrado. Você pode listar suas câmeras, lentes, luzes e drones para aluguel, transformando seus itens ociosos em renda extra, além de poder alugar para aquele job especial.",
  },
  {
    q: "Existe algum limite para as imagens e vídeos do meu portfólio?",
    a: "O Portfólio Profissional nativo da IsoScanning foi feito para impressionar clientes. Enquanto o plano Free possui envios limitados, ao assinar planos como Pro ou Ultra, você não tem restrições: faça uploads ilimitados para expor todo o seu potencial criativo.",
  },
  {
    q: "Como encontro e me candidato a novas oportunidades e vagas?",
    a: "A plataforma possui um painel exclusivo de 'Vagas e Oportunidades', onde clientes publicam jobs na sua região. Você pode visualizar a descrição, orçamento, e enviar sua candidatura ou até mesmo fazer uma contraproposta de forma direta.",
  },
  {
    q: "Como funciona o agendamento da Agenda Integrada?",
    a: "Você configura seus dias e horários de disponibilidade no calendário. Clientes interessados solicitarão agendamento para as datas livres, e você apenas confirma. O sistema cuida da organização para você nunca mais esquecer de um compromisso.",
  },
  {
    q: "Os Contratos Digitais possuem validade legal?",
    a: "Sim. Nossos contratos gerados e assinados na plataforma contam com assinaturas digitais rastreáveis (via e-mail e hash criptográfico), conferindo plena validade jurídica para proteger o seu trabalho e trazer mais profissionalismo nas negociações.",
  },
  {
    q: "Como meu perfil aparece nas buscas inteligentes?",
    a: "Os clientes filtram criadores por localização, avaliação e especialidade (ex: piloto de drone para casamento). Ter um portfólio completo, agenda atualizada e boas avaliações coloca seu perfil nas primeiras posições organicamente.",
  },
  {
    q: "Quem pode participar da Comunidade Criativa?",
    a: "Todos os profissionais cadastrados têm acesso! A Comunidade Criativa é nosso espaço exclusivo para fotógrafos, videomakers, story makers e pilotos de drone se conectarem, trocarem conhecimentos, indicarem clientes e formarem equipes (crews).",
  },
];

const LightRays = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div 
      className="absolute -top-[50%] left-[10%] w-[150px] h-[200%] bg-gradient-to-r from-transparent via-blue-500/10 to-transparent -rotate-45 transform-gpu blur-[20px]" 
      animate={{
        opacity: [0.3, 0.8, 0.2, 0.6, 0.3],
        x: [0, 40, -30, 20, 0],
        scale: [1, 1.2, 0.9, 1.1, 1],
      }}
      transition={{
        duration: 12,
        ease: "easeInOut",
        repeat: Infinity,
      }}
    />
    <motion.div 
      className="absolute -top-[50%] right-[20%] w-[100px] h-[200%] bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -rotate-45 transform-gpu blur-[15px]" 
      animate={{
        opacity: [0.2, 0.7, 0.3, 0.9, 0.2],
        x: [0, -60, 40, -20, 0],
        scale: [1, 1.3, 0.8, 1.2, 1],
      }}
      transition={{
        duration: 15,
        ease: "easeInOut",
        repeat: Infinity,
      }}
    />
    <motion.div 
      className="absolute -top-[50%] left-[50%] w-[250px] h-[200%] bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent -rotate-45 transform-gpu blur-[30px]" 
      animate={{
        opacity: [0.4, 0.9, 0.5, 0.8, 0.4],
        x: [0, 70, -40, 50, 0],
        scale: [1, 1.1, 0.95, 1.15, 1],
      }}
      transition={{
        duration: 18,
        ease: "easeInOut",
        repeat: Infinity,
      }}
    />
  </div>
);

export default function LpProfissional() {
  return (
    <div className="md:h-screen md:overflow-hidden flex flex-col bg-background">
      <LpHeader ctaHref="/cadastro?tipo=profissional" ctaLabel="Criar Perfil Grátis" produtoHref="/lp/profissional" />

      <main className="flex-1 flex flex-col">
        <FullPageScroller sectionsCount={10}>
        {/* ===== HERO ===== */}
        <section className="relative h-[100vh] md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex items-center justify-center overflow-hidden">
          <HeroImageReveal src="/camera-exploded.png" radius={400} opacity={0.2} />
          <MouseGlow color="99, 102, 241" size={600} opacity={0.13} />
          <ParticleBackground />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-blue-500/15 dark:bg-blue-500/8 rounded-full blur-3xl animate-pulse" />
            <div
              className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/15 dark:bg-purple-500/8 rounded-full blur-3xl animate-pulse"
              style={{ animationDelay: "1.5s" }}
            />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <ScrollReveal delay={0.1}>
                <Badge
                  variant="secondary"
                  className="px-4 py-1.5 text-sm gap-2 bg-primary/10 text-primary border-primary/20"
                >
                  <Camera className="h-4 w-4" />
                  Para Fotógrafos, Videomakers, Story Makers e Pilotos de Drone
                </Badge>
              </ScrollReveal>

              <ScrollReveal delay={0.25}>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
                  <span className="text-foreground">Saia da </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-600 dark:from-blue-400 dark:via-indigo-400 dark:to-cyan-400">
                    invisibilidade
                  </span>
                  <br className="hidden sm:block" />
                  <span className="text-foreground"> e pare de perder dinheiro com </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-600 dark:from-blue-400 dark:via-indigo-400 dark:to-cyan-400">
                    comissões
                  </span>
                </h1>
              </ScrollReveal>

              <ScrollReveal delay={0.4}>
                <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed">
                  A plataforma que valoriza seu trabalho de verdade: sem taxas ocultas, 
                  com portfólio nativo e{" "}
                  <span className="font-medium text-foreground">
                    gestão financeira completa (FinMEI).
                  </span>
                </p>
              </ScrollReveal>

              <ScrollReveal delay={0.55}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Link href="/cadastro?tipo=profissional">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 group"
                    >
                      Criar Meu Portfólio Grátis
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link href="/como-funciona">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto h-14 px-8 text-lg rounded-full bg-background/50 backdrop-blur-sm border-2 hover:bg-background/80 transition-all duration-300"
                    >
                      Como Funciona
                    </Button>
                  </Link>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.7}>
                <div className="flex flex-wrap justify-center gap-6 pt-8 text-sm md:text-base font-semibold text-foreground">
                  <div className="flex items-center gap-2 bg-muted/50 backdrop-blur px-6 py-3 rounded-full border border-border/50">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span>+ 500 profissionais cadastrados</span>
                  </div>
                  <div className="flex items-center gap-2 bg-muted/50 backdrop-blur px-6 py-3 rounded-full border border-border/50">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    <span>R$ 0 em comissões cobradas</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ===== QUAL A SUA ESPECIALIDADE ===== */}
        <section className="h-[100vh] md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center bg-slate-950 relative overflow-hidden py-10 md:py-0">
          <LightRays />
          <div className="container mx-auto px-4 relative z-10">
            <ScrollReveal>
              <div className="text-center mb-6 md:mb-8 space-y-2 md:space-y-3">
                <Badge className="bg-white/5 text-white/50 border-white/10 px-3 py-1 text-[10px] font-semibold tracking-widest uppercase">
                  Feito para criadores visuais
                </Badge>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                  Qual é a sua{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400">
                    especialidade?
                  </span>
                </h2>
                <p className="text-base text-white/60 max-w-2xl mx-auto">
                  Cada nicho criativo exige ferramentas específicas.<br className="hidden sm:block" />
                  Descubra as soluções ideais para o seu perfil profissional:
                </p>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {fluxos.map((item, i) => (
                <ScrollReveal key={i} delay={i * 0.1} className="h-full">
                  <Card className={`h-full flex flex-col p-5 md:p-6 rounded-3xl border ${item.borderClass} ${item.bgClass} backdrop-blur-sm shadow-2xl`}>
                    <div className="mb-3 md:mb-4">
                      <Badge className={`${item.badgeClass} px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider`}>
                        {item.badge}
                      </Badge>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-white mb-2 leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-white/60 text-xs md:text-sm leading-relaxed mb-4">
                      {item.description}
                    </p>
                    <ul className="space-y-2 md:space-y-3 mb-4 md:mb-6 flex-1">
                      {item.bullets.map((bullet, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs md:text-sm text-white/80 font-medium">
                          <Check className={`w-4 h-4 mt-0.5 shrink-0 ${item.linkClass.split(' ')[0]}`} />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href="#planos" className={`mt-auto font-semibold text-xs md:text-sm flex items-center group transition-colors ${item.linkClass}`}>
                      {item.link}
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FUNCIONALIDADES (INTERACTIVE SECTION) ===== */}
        <InteractiveFeatures />

        {/* ===== MÓDULOS (DEMO VISUAL) ===== */}
        <section className="h-[100vh] md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center relative overflow-hidden py-10 md:py-0">
          {/* Ambient glow orbs */}
          <div className="absolute -top-32 -left-32 w-72 h-72 bg-blue-500/6 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-500/6 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="container mx-auto px-4 relative">
            <div className="text-center mb-16 space-y-4">
              <ScrollReveal direction="up" distance={16} delay={0}>
                <span className="text-primary font-semibold text-sm uppercase tracking-wider">
                  A Solução Definitiva
                </span>
              </ScrollReveal>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
                <SplitWordReveal text="Tudo que você precisa" delay={0.1} />
                {" "}
                <BlurReveal
                  delay={0.52}
                  className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400"
                >
                  para escalar
                </BlurReveal>
              </h2>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-4 py-4">
                  {allFeatures.map((feature, i) => (
                    <CarouselItem key={i} className="pl-4 basis-full md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                      <ScrollReveal
                        delay={(i % 4) * 0.1}
                        direction="up"
                        distance={40}
                        className="h-full"
                      >
                        <div className="p-1 h-full">
                          <TiltCard intensity={8}>
                            <Card className="group border-2 hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 h-full">
                              <CardContent className="pt-8 pb-8 space-y-6 text-center flex flex-col items-center h-full">
                                <div
                                  className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg ${feature.shadow} group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}
                                >
                                  <feature.icon className="h-8 w-8 text-white" />
                                </div>
                                <div className="flex-1 flex flex-col">
                                  <h3 className="font-bold text-lg mb-3">{feature.title}</h3>
                                  <p className="text-muted-foreground leading-relaxed text-sm flex-1">
                                    {feature.description}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </TiltCard>
                        </div>
                      </ScrollReveal>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="hidden lg:block">
                  <CarouselPrevious className="-left-12" />
                  <CarouselNext className="-right-12" />
                </div>
              </Carousel>
            </div>
          </div>
        </section>

        {/* ===== COMPARATIVO VS CONCORRENTES ===== */}
        <section className="h-[100vh] md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center bg-muted/30 dark:bg-muted/10 border-y border-border/40 py-10 md:py-0">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center mb-16 space-y-4 max-w-3xl mx-auto">
                <span className="text-primary font-semibold text-sm uppercase tracking-wider">
                  Benchmarking Completo
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold">
                  Mapa de Concorrentes
                </h2>
                <p className="text-muted-foreground">
                  Uma análise comparativa real: nenhum concorrente combina todos os módulos que a IsoScanning propõe e ainda com zero comissão.
                </p>
              </div>
            </ScrollReveal>

            <div className="max-w-6xl mx-auto overflow-x-auto pb-4">
              <table className="w-full min-w-[800px] border-collapse bg-background rounded-2xl overflow-hidden shadow-sm border border-border">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-left">
                    <th className="p-4 font-semibold text-foreground">Plataforma</th>
                    <th className="p-4 font-semibold text-foreground">Foco</th>
                    <th className="p-4 font-semibold text-foreground">Comissão</th>
                    <th className="p-4 font-semibold text-foreground">Portfolio</th>
                    <th className="p-4 font-semibold text-foreground">Gestão Financeira</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((comp, i) => (
                    <tr key={i} className={`border-b border-border/50 transition-colors ${comp.highlight ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"}`}>
                      <td className="p-4 font-medium">
                        {comp.highlight ? (
                          <span className="flex items-center gap-2 text-primary font-bold">
                            <Zap className="h-4 w-4" /> {comp.platform}
                          </span>
                        ) : (
                          comp.platform
                        )}
                      </td>
                      <td className="p-4 text-muted-foreground text-sm">{comp.focus}</td>
                      <td className={`p-4 font-semibold ${comp.highlight ? "text-green-500 text-lg" : "text-muted-foreground text-sm"}`}>
                        {comp.comission}
                      </td>
                      <td className="p-4 text-muted-foreground text-sm">{comp.portfolio}</td>
                      <td className="p-4 text-muted-foreground text-sm">{comp.fin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ScrollReveal delay={0.2}>
              <div className="text-center mt-8">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium bg-green-500/10 inline-block px-6 py-3 rounded-full border border-green-500/20">
                  <CheckCircle2 className="inline-block h-5 w-5 mr-2 -mt-0.5" />
                  Na IsoScanning, todo o dinheiro do seu trabalho é única e exclusivamente seu.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="h-[100vh] md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center bg-muted/30 dark:bg-muted/10 py-10 md:py-0">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center mb-16 space-y-4">
                <span className="text-primary font-semibold text-sm uppercase tracking-wider">
                  Simples e Rápido
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                  Comece em minutos
                </h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                  Da criação do perfil até receber seu primeiro cliente, o processo é direto e sem complicação.
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
                <Link href="/cadastro?tipo=profissional">
                  <Button
                    size="lg"
                    className="h-14 px-10 text-lg rounded-full shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300 group"
                  >
                    Começar Agora — É Grátis
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ===== TESTIMONIALS ===== */}
        <section className="h-[100vh] md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center bg-slate-950 py-10 md:py-0">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center mb-16 space-y-4">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
                  Quem cria, confia.
                </h2>
                <p className="text-lg text-white/70 max-w-xl mx-auto">
                  Veja o que criadores profissionais estão dizendo
                </p>
              </div>
            </ScrollReveal>

            <div className="max-w-4xl mx-auto relative px-4 md:px-12">
              <Carousel
                opts={{
                  align: "center",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent>
                  {testimonials.map((t, i) => (
                    <CarouselItem key={i}>
                      <div className="p-2">
                        <Card className="bg-[#0f0f13] border-indigo-500/20 shadow-2xl overflow-hidden relative">
                          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                            <Quote className="w-48 h-48 text-indigo-400 rotate-180" />
                          </div>
                          <CardContent className="p-8 md:p-12 flex flex-col justify-center min-h-[300px] relative z-10">
                            <div className="bg-indigo-500/20 w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                              <Quote className="h-6 w-6 text-indigo-400" />
                            </div>
                            
                            <p className="text-lg md:text-xl font-medium text-white/90 leading-relaxed mb-8">
                              "{t.quote}"
                            </p>
                            
                            <div className="flex gap-1 mb-8">
                              {[...Array(5)].map((_, j) => (
                                <Star key={j} className="h-5 w-5 fill-purple-500 text-purple-500" />
                              ))}
                            </div>

                            <div className="flex items-center gap-4 pt-6 border-t border-white/10">
                              <div className="h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-[0_0_10px_rgba(168,85,247,0.4)]">
                                {t.initial}
                              </div>
                              <div>
                                <p className="font-bold text-white text-lg">{t.name}</p>
                                <p className="text-sm text-white/50">{t.role}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="absolute -left-2 md:-left-12 border-white/10 bg-black/50 text-white hover:bg-white/10 hover:text-white" />
                <CarouselNext className="absolute -right-2 md:-right-12 border-white/10 bg-black/50 text-white hover:bg-white/10 hover:text-white" />
              </Carousel>
            </div>
          </div>
        </section>

        {/* ===== PRICING ===== */}
        <section className="h-[100vh] md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center py-10 md:py-0">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center mb-4 md:mb-6 space-y-1 md:space-y-2">
                <span className="text-primary font-semibold text-xs md:text-sm uppercase tracking-wider">
                  Planos e Preços
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                  Comece grátis.{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-400 dark:to-cyan-400">
                    Cresça no seu ritmo.
                  </span>
                </h2>
                <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
                  Sem contratos de longo prazo. Cancele quando quiser.
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
                  name: "Pro",
                  description: "Perfeito para profissionais ativos e demandas regulares",
                  price: "R$ 59,90",
                  period: "/mês",
                  cta: "Assinar Pro",
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
                  ],
                  notIncluded: [
                    "Candidaturas ilimitadas",
                    "Destaque ouro nas buscas",
                  ],
                },
                {
                  name: "Ultra",
                  description: "Sem limites para agências e power users",
                  price: "R$ 149,90",
                  period: "/mês",
                  cta: "Ser Profissional Ultra",
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
                        <div>
                          <h3 className="font-bold text-base md:text-lg">{plan.name}</h3>
                        </div>
                      </div>

                      <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-2 min-h-[32px] md:min-h-[36px]">
                        {plan.description}
                      </p>

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
              <p className="text-center text-xs md:text-sm text-muted-foreground mt-4 md:mt-6">
                Quer ver todos os detalhes?{" "}
                <Link href="/precos" className="text-primary font-semibold hover:underline">
                  Consulte a página completa de preços →
                </Link>
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="h-[100vh] md:h-[calc(100vh-64px)] w-full flex-shrink-0 flex flex-col justify-center bg-muted/30 dark:bg-muted/10 py-10 md:py-0">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-10 space-y-2">
                  <span className="text-primary font-semibold text-sm uppercase tracking-wider">
                    FAQ
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-bold">
                    Dúvidas Frequentes
                  </h2>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <Card className="border-2 shadow-xl bg-background/50 backdrop-blur">
                  <CardContent className="p-6 md:p-10 flex flex-col md:flex-row gap-6 md:gap-12">
                    <Accordion type="single" collapsible className="w-full flex-1">
                      {faqs.slice(0, 5).map((faq, i) => (
                        <AccordionItem key={i} value={`item-${i}`} className="py-1">
                          <AccordionTrigger className="text-base font-medium hover:no-underline hover:text-primary text-left">
                            {faq.q}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground text-sm md:text-base leading-relaxed">
                            {faq.a}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                    <Accordion type="single" collapsible className="w-full flex-1">
                      {faqs.slice(5).map((faq, i) => (
                        <AccordionItem key={i} value={`item-${i + 5}`} className="py-1">
                          <AccordionTrigger className="text-base font-medium hover:no-underline hover:text-primary text-left">
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
                  Pronto pra transformar seu{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400">
                    fluxo criativo?
                  </span>
                </h2>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto font-light">
                  Junte-se a milhares de criadores que já entregam com estilo,
                  segurança e velocidade.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={0.35}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                  <Link href="/cadastro?tipo=profissional">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto h-14 px-8 text-base rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white shadow-xl transition-all duration-300 group"
                    >
                      Começar teste grátis
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link href="#demonstracao">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto h-14 px-8 text-base rounded-xl bg-black/40 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-sm"
                    >
                      Ver meu fluxo rodando
                    </Button>
                  </Link>
                </div>
                
                <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 mt-10">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-white/70 text-xs font-medium">Setup em menos de 5 minutos</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span className="text-white/70 text-xs font-medium">Cancele quando quiser</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-white/70 text-xs font-medium">Teste grátis por 7 dias</span>
                  </div>
                </div>

                <p className="text-white/40 text-xs mt-6 font-light">
                  Sem compromisso. Sem cartão de crédito para começar.
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
