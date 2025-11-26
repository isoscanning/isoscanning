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
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Shield,
  ArrowRight,
} from "lucide-react";

export default function AjudaPage() {
  const faqCategories = [
    {
      title: "Para Clientes",
      icon: Users,
      items: [
        "Como encontrar profissionais?",
        "Como solicitar um orçamento?",
        "Como agendar um serviço?",
        "Como avaliar um profissional?",
        "Como funciona o pagamento?",
      ],
    },
    {
      title: "Para Profissionais",
      icon: Package,
      items: [
        "Como criar meu perfil?",
        "Como adicionar meu portfólio?",
        "Como gerenciar agendamentos?",
        "Como cadastrar equipamentos?",
        "Como receber pagamentos?",
      ],
    },
    {
      title: "Conta e Segurança",
      icon: Shield,
      items: [
        "Como alterar minha senha?",
        "Como editar meu perfil?",
        "Como excluir minha conta?",
        "Política de privacidade",
        "Termos de uso",
      ],
    },
    {
      title: "Pagamentos",
      icon: CreditCard,
      items: [
        "Formas de pagamento aceitas",
        "Como funciona o reembolso?",
        "Taxas da plataforma",
        "Nota fiscal",
        "Segurança nas transações",
      ],
    },
  ];

  const quickHelp = [
    {
      icon: Calendar,
      title: "Agendamentos",
      description: "Aprenda a gerenciar seus agendamentos",
      link: "#agendamentos",
    },
    {
      icon: Package,
      title: "Equipamentos",
      description: "Como alugar ou vender equipamentos",
      link: "#equipamentos",
    },
    {
      icon: Star,
      title: "Avaliações",
      description: "Sistema de avaliação e feedback",
      link: "#avaliacoes",
    },
    {
      icon: FileText,
      title: "Documentação",
      description: "Guias completos e tutoriais",
      link: "#documentacao",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <Badge
                variant="secondary"
                className="px-4 py-2 text-sm font-medium"
              >
                Central de Ajuda
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
                Como podemos ajudar?
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
                Encontre respostas para suas dúvidas ou entre em contato com
                nossa equipe. Estamos aqui para tornar sua experiência a melhor
                possível.
              </p>

              {/* Search Bar */}
              <div className="max-w-md mx-auto relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input placeholder="Buscar ajuda..." className="pl-10 h-12" />
              </div>
            </div>
          </div>
        </section>

        {/* Quick Help */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ajuda Rápida
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Acesse os tópicos mais procurados
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickHelp.map((item, index) => (
                <Card
                  key={index}
                  className="text-center hover:shadow-md transition-shadow cursor-pointer"
                >
                  <CardContent className="pt-6">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {item.description}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary/80"
                    >
                      Ver mais
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Categories */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Perguntas Frequentes
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Encontre respostas rápidas para as dúvidas mais comuns
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {faqCategories.map((category, index) => (
                <Card key={index} className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <category.icon className="h-5 w-5 text-primary" />
                      </div>
                      {category.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {category.items.map((item, itemIndex) => (
                        <li key={itemIndex}>
                          <Link
                            href="#"
                            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <HelpCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm">{item}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Não encontrou o que procurava?
                </h2>
                <p className="text-muted-foreground">
                  Nossa equipe está pronta para ajudar
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Contact Info */}
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Email</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Resposta em até 24 horas
                      </p>
                      <a
                        href="mailto:suporte@mpf.com.br"
                        className="text-primary hover:text-primary/80 transition-colors"
                      >
                        suporte@mpf.com.br
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Chat Online</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Atendimento imediato durante horário comercial
                      </p>
                      <Button variant="outline" size="sm">
                        Iniciar Chat
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">
                        Horário de Atendimento
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Segunda a sexta: 8h às 18h
                        <br />
                        Sábado: 8h às 12h
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Form */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Envie sua mensagem</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nome</label>
                        <Input placeholder="Seu nome" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <Input type="email" placeholder="seu@email.com" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Assunto</label>
                      <Input placeholder="Como podemos ajudar?" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Mensagem</label>
                      <Textarea
                        placeholder="Descreva sua dúvida ou problema..."
                        className="min-h-[100px]"
                      />
                    </div>

                    <Button className="w-full">Enviar Mensagem</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
