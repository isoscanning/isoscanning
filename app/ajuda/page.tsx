"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import {
  Search,
  HelpCircle,
  MessageCircle,
  FileText,
  Users,
  Package,
  Calendar,
  Star,
  Mail,
  Clock,
  Shield,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ParticleBackground } from "@/components/particle-background";
import { ScrollReveal } from "@/components/scroll-reveal";

export default function AjudaPage() {
  const faqCategories = [
    {
      title: "Para Clientes",
      icon: Users,
      items: [
        {
          question: "Como encontrar profissionais?",
          answer:
            "Você pode utilizar a nossa busca avançada na página 'Encontrar Profissionais'. Filtre por especialidade, localização e avaliações para encontrar o talento ideal para o seu projeto.",
        },
        {
          question: "Como solicitar um orçamento?",
          answer:
            "Acesse o perfil do profissional desejado e clique no botão 'Solicitar Orçamento'. Preencha os detalhes do seu projeto e aguarde o retorno com a proposta.",
        },
        {
          question: "Como agendar um serviço?",
          answer:
            "Após aprovar o orçamento, você poderá selecionar as datas disponíveis diretamente na agenda do profissional e confirmar o serviço pela plataforma.",
        },
        {
          question: "Como avaliar um profissional?",
          answer:
            "Após a conclusão do serviço, você receberá uma notificação para avaliar o profissional. Sua avaliação é fundamental para manter a qualidade da nossa comunidade.",
        },
      ],
    },
    {
      title: "Para Profissionais",
      icon: Briefcase,
      items: [
        {
          question: "Como criar meu perfil?",
          answer:
            "Clique em 'Criar Conta' e selecione a opção 'Profissional'. Preencha seus dados, adicione seu portfólio e defina suas áreas de atuação.",
        },
        {
          question: "Como adicionar meu portfólio?",
          answer:
            "No seu painel de controle, acesse a aba 'Portfólio'. Você pode fazer upload de fotos e vídeos, organizando-os por categorias ou projetos.",
        },
        {
          question: "Como gerenciar agendamentos?",
          answer:
            "Todas as solicitações de serviço aparecem no seu 'Painel de Agendamentos'. Você pode aceitar, recusar ou propor novas datas diretamente por lá.",
        },
        {
          question: "Como cadastrar equipamentos?",
          answer:
            "Acesse a seção 'Meus Equipamentos' no dashboard para listar câmeras, lentes e acessórios que você deseja disponibilizar para aluguel.",
        },
      ],
    },
    {
      title: "Conta e Segurança",
      icon: Shield,
      items: [
        {
          question: "Como alterar minha senha?",
          answer:
            "Vá até as 'Configurações da Conta' e selecione 'Segurança'. Lá você poderá definir uma nova senha seguindo nossos requisitos de segurança.",
        },
        {
          question: "Como editar meu perfil?",
          answer:
            "No menu principal, clique na sua foto e escolha 'Editar Perfil'. Você pode atualizar sua foto, bio, dados de contato e preferências a qualquer momento.",
        },
        {
          question: "Como excluir minha conta?",
          answer:
            "Se desejar encerrar sua conta, entre em contato com nosso suporte ou acesse a opção de exclusão nas configurações avançadas do perfil.",
        },
      ],
    },
  ];

  const quickHelp = [
    {
      icon: Calendar,
      title: "Agendamentos",
      description: "Gerencie sua agenda",
      link: "/dashboard/agenda",
    },
    {
      icon: Package,
      title: "Equipamentos",
      description: "Aluguel e venda",
      link: "/equipamentos",
    },
    {
      icon: Star,
      title: "Avaliações",
      description: "Sistema de reputação",
      link: "#",
    },
    {
      icon: FileText,
      title: "Documentação",
      description: "Guias da plataforma",
      link: "#",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background relative selection:bg-primary/20">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden items-center flex justify-center flex-col">
          <ParticleBackground />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50 pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <ScrollReveal>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary w-fit mx-auto border border-primary/20 backdrop-blur-sm">
                  <HelpCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Central de Ajuda</span>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
                  <span className="text-foreground">Como podemos </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400">
                    ajudar você?
                  </span>
                </h1>
              </ScrollReveal>

              <ScrollReveal delay={0.4}>
                <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
                  Encontre respostas rápidas, explore nossos guias ou entre em
                  contato com nossa equipe de suporte especializada.
                </p>
              </ScrollReveal>

              {/* Search Bar */}
              <ScrollReveal delay={0.6}>
                <div className="max-w-md mx-auto relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Busque por dúvidas (ex: pagamento, perfil)"
                      className="pl-12 h-12 bg-background/80 backdrop-blur-xl border-primary/20 shadow-xl rounded-lg focus-visible:ring-primary"
                    />
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* Quick Help */}
        <section className="py-16 bg-muted/30 relative">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">Acesso Rápido</h2>
                <p className="text-muted-foreground">Navegue pelos tópicos mais populares</p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickHelp.map((item, index) => (
                <ScrollReveal key={index} delay={index * 0.1}>
                  <Link href={item.link}>
                    <Card className="text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer border-muted/60 bg-background/50 backdrop-blur-sm group">
                      <CardContent className="pt-8 pb-6">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                          <item.icon className="h-7 w-7 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Categories */}
        <section className="py-20 md:py-24">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Perguntas Frequentes</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Respostas claras para que você aproveite ao máximo a plataforma.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {faqCategories.map((category, index) => (
                <ScrollReveal key={index} delay={index * 0.1} className="h-full">
                  <div className="h-full space-y-4">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <category.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold">{category.title}</h3>
                    </div>

                    <Accordion type="single" collapsible className="w-full space-y-4">
                      {category.items.map((item, itemIndex) => (
                        <AccordionItem
                          key={itemIndex}
                          value={`item-${index}-${itemIndex}`}
                          className="border rounded-xl px-4 data-[state=open]:bg-muted/50 transition-colors"
                        >
                          <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-20 md:py-24 bg-muted/20 relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-5xl mx-auto">
              <ScrollReveal>
                <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">Ainda precisa de ajuda?</h2>
                  <p className="text-muted-foreground">
                    Nossa equipe de suporte está disponível para resolver qualquer questão.
                  </p>
                </div>
              </ScrollReveal>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                {/* Contact Info */}
                <ScrollReveal className="lg:col-span-2 space-y-8">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-background border shadow-sm">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <Mail className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Email</h3>
                        <p className="text-xs text-muted-foreground mb-1">Resposta em até 24h</p>
                        <a href="mailto:suporte@isoscanning.com" className="text-sm font-medium text-primary hover:underline">
                          suporte@isoscanning.com
                        </a>
                      </div>
                    </div>



                    <div className="flex items-start gap-4 p-4 rounded-xl bg-background border shadow-sm">
                      <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                        <Clock className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Horário</h3>
                        <p className="text-sm text-muted-foreground">
                          09:00 - 18:00 (Dias úteis)
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>

                {/* Contact Form */}
                <ScrollReveal className="lg:col-span-3" delay={0.2}>
                  <Card className="border-0 shadow-2xl bg-background/80 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle>Envie sua mensagem</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Nome</label>
                          <Input placeholder="Seu nome completo" className="bg-muted/30" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Email</label>
                          <Input type="email" placeholder="seu@email.com" className="bg-muted/30" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Assunto</label>
                        <Input placeholder="Sobre o que você quer falar?" className="bg-muted/30" />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Mensagem</label>
                        <Textarea
                          placeholder="Descreva detalhadamente sua dúvida ou problema..."
                          className="min-h-[120px] bg-muted/30 resize-none"
                        />
                      </div>

                      <div className="pt-2">
                        <Button className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-primary/25 transition-all">
                          Enviar Mensagem <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
