import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Search, Calendar, Package, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pb-16">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
                Conectando criatividade, cultura e crescimento
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground text-balance">
                A plataforma completa para profissionais de fotografia e
                audiovisual. Encontre profissionais talentosos, alugue
                equipamentos e agende serviços com facilidade.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/profissionais">
                  <Button size="lg" className="w-full sm:w-auto">
                    <Search className="mr-2 h-5 w-5" />
                    Buscar Profissionais
                  </Button>
                </Link>
                <Link href="/cadastro?tipo=profissional">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto bg-transparent"
                  >
                    Sou Profissional
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Nossos Serviços
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Tudo que você precisa em um só lugar
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-2 hover:border-primary transition-colors">
                <CardContent className="pt-6 space-y-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">
                    Encontre Profissionais
                  </h3>
                  <p className="text-muted-foreground">
                    Busque fotógrafos, videomakers e editores qualificados por
                    localização, especialidade e disponibilidade.
                  </p>
                  <Link href="/profissionais">
                    <Button
                      variant="link"
                      className="p-0 text-primary hover:text-primary/80 dark:text-primary dark:hover:text-primary/70"
                    >
                      Explorar profissionais →
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary transition-colors">
                <CardContent className="pt-6 space-y-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">
                    Marketplace de Equipamentos
                  </h3>
                  <p className="text-muted-foreground">
                    Alugue ou compre câmeras, lentes, iluminação e outros
                    equipamentos profissionais de qualidade.
                  </p>
                  <Link href="/equipamentos">
                    <Button
                      variant="link"
                      className="p-0 text-primary hover:text-primary/80 dark:text-primary dark:hover:text-primary/70"
                    >
                      Ver equipamentos →
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary transition-colors">
                <CardContent className="pt-6 space-y-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">Agendamento Fácil</h3>
                  <p className="text-muted-foreground">
                    Sistema integrado de agendamento com calendário de
                    disponibilidade e confirmação automática.
                  </p>
                  <Link href="/como-funciona">
                    <Button
                      variant="link"
                      className="p-0 text-primary hover:text-primary/80 dark:text-primary dark:hover:text-primary/70"
                    >
                      Saiba mais →
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Como Funciona
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Busque e Compare
                    </h3>
                    <p className="text-muted-foreground">
                      Encontre profissionais ou equipamentos usando nossos
                      filtros avançados de localização, preço e especialidade.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Solicite Orçamento
                    </h3>
                    <p className="text-muted-foreground">
                      Entre em contato diretamente pela plataforma e receba
                      propostas personalizadas para seu projeto.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Agende o Serviço
                    </h3>
                    <p className="text-muted-foreground">
                      Confirme data, horário e detalhes do serviço através do
                      nosso sistema de agendamento integrado.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Avalie a Experiência
                    </h3>
                    <p className="text-muted-foreground">
                      Após o serviço, deixe sua avaliação e ajude outros
                      clientes a encontrarem os melhores profissionais.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20 bg-primary/5 dark:bg-primary text-foreground dark:text-primary-foreground">
          <div className="container mx-auto px-4 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Pronto para começar?
            </h2>
            <p className="text-lg max-w-2xl mx-auto opacity-90">
              Cadastre-se agora e faça parte da maior comunidade de
              profissionais de fotografia e audiovisual do Brasil.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/cadastro">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  Criar Conta Grátis
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary dark:border-primary-foreground dark:text-primary-foreground dark:hover:bg-primary-foreground dark:hover:text-primary"
                >
                  Já tenho conta
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
