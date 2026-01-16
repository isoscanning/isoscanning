"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Search,
  Package,
  Calendar,
  CheckCircle,
  Users,
  Camera,
  Star,
  ArrowRight,
  Clock,
  Shield,
  Zap,
} from "lucide-react";

export default function ComoFuncionaPage() {
  const steps = [
    {
      step: 1,
      title: "Busque e Compare",
      description:
        "Encontre profissionais ou equipamentos usando nossos filtros avançados de localização, preço e especialidade.",
      icon: Search,
      color: "bg-blue-50 dark:bg-blue-950/20",
      iconColor: "text-blue-600",
    },
    {
      step: 2,
      title: "Solicite Orçamento",
      description:
        "Entre em contato diretamente pela plataforma e receba propostas personalizadas para seu projeto.",
      icon: Package,
      color: "bg-green-50 dark:bg-green-950/20",
      iconColor: "text-green-600",
    },
    {
      step: 3,
      title: "Agende o Serviço",
      description:
        "Confirme data, horário e detalhes do serviço através do nosso sistema de agendamento integrado.",
      icon: Calendar,
      color: "bg-purple-50 dark:bg-purple-950/20",
      iconColor: "text-purple-600",
    },
    {
      step: 4,
      title: "Avalie a Experiência",
      description:
        "Após o serviço, deixe sua avaliação e ajude outros clientes a encontrarem os melhores profissionais.",
      icon: Star,
      color: "bg-orange-50 dark:bg-orange-950/20",
      iconColor: "text-orange-600",
    },
  ];

  const features = [
    {
      icon: Users,
      title: "Rede de Profissionais",
      description:
        "Acesse uma comunidade de fotógrafos, videomakers e editores verificados.",
    },
    {
      icon: Package,
      title: "Marketplace de Equipamentos",
      description:
        "Alugue câmeras, lentes, iluminação e acessórios profissionais.",
    },
    {
      icon: Calendar,
      title: "Agendamento Inteligente",
      description:
        "Sistema integrado de agendamento com confirmação automática.",
    },
    {
      icon: Shield,
      title: "Garantia de Qualidade",
      description:
        "Todos os profissionais são verificados e avaliados pela comunidade.",
    },
    {
      icon: Zap,
      title: "Processo Simplificado",
      description: "Da busca ao agendamento, tudo em uma única plataforma.",
    },
    {
      icon: Clock,
      title: "Suporte 24/7",
      description:
        "Equipe especializada pronta para ajudar em qualquer momento.",
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
                Como Funciona
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
                Simples, rápido e eficiente
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
                Descubra como nossa plataforma conecta profissionais de
                fotografia e audiovisual com clientes que precisam de seus
                serviços. Em poucos passos, você encontra exatamente o que
                precisa.
              </p>
            </div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                4 passos para o sucesso
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Nosso processo foi projetado para ser simples e intuitivo,
                permitindo que você foque no que realmente importa: seus
                projetos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step) => (
                <Card
                  key={step.step}
                  className="text-center border-0 shadow-lg"
                >
                  <CardHeader className="pb-4">
                    <div
                      className={`w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center mx-auto mb-4`}
                    >
                      <step.icon className={`h-8 w-8 ${step.iconColor}`} />
                    </div>
                    <div className="text-3xl font-bold text-primary mb-2">
                      {step.step}
                    </div>
                    <CardTitle className="text-xl">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Por que escolher nossa plataforma?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Desenvolvida por profissionais para profissionais, nossa
                plataforma oferece tudo que você precisa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  className="border-0 shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg">
                          {feature.title}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20 bg-primary/5">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Pronto para começar?
              </h2>
              <p className="text-lg text-muted-foreground">
                Junte-se a milhares de profissionais e clientes que já confiam
                na nossa plataforma para realizar seus projetos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/cadastro">
                  <Button size="lg" className="w-full sm:w-auto">
                    <Camera className="mr-2 h-5 w-5" />
                    Criar Conta Grátis
                  </Button>
                </Link>
                <Link href="/profissionais">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <Search className="mr-2 h-5 w-5" />
                    Buscar Profissionais
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

