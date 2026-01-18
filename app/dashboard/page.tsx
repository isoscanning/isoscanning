"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Camera, Package, Calendar, Star, User, Settings } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const [googleName, setGoogleName] = useState("");

  useEffect(() => {
    if (!loading && !userProfile) {
      router.push("/login");
    }
  }, [userProfile, loading, router]);

  useEffect(() => {
    // Fallback to get name from Supabase local storage if profile name is empty
    if (userProfile && !userProfile.displayName) {
      try {
        // Search for Supabase auth token in localStorage
        const keys = Object.keys(localStorage);
        const sbKey = keys.find(key => key.startsWith("sb-") && key.endsWith("-auth-token"));

        if (sbKey) {
          const sessionData = localStorage.getItem(sbKey);
          if (sessionData) {
            const session = JSON.parse(sessionData);
            const name = session.user?.user_metadata?.full_name || session.user?.user_metadata?.name; // Some providers might map differently, but full_name is standard
            if (name && typeof name === 'string') {
              setGoogleName(name);
            }
          }
        }
      } catch (error) {
        console.error("Error parsing user metadata from localStorage", error);
      }
    }
  }, [userProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userProfile) {
    return null;
  }

  const isProfessional = userProfile.userType === "professional";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          {/* Welcome Section */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">
              Olá, {userProfile.displayName || googleName}!
            </h1>
            <p className="text-muted-foreground">
              {isProfessional
                ? "Gerencie seus serviços, equipamentos e agendamentos."
                : "Encontre profissionais e equipamentos para seus projetos."}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isProfessional ? (
              <>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <Link href="/dashboard/perfil">
                    <CardHeader>
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle>Meu Perfil</CardTitle>
                      <CardDescription>
                        Edite suas informações profissionais e portfólio
                      </CardDescription>
                    </CardHeader>
                  </Link>
                </Card>

                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <Link href="/dashboard/portfolio">
                    <CardHeader>
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                        <Camera className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle>Portfólio</CardTitle>
                      <CardDescription>
                        Adicione e gerencie seus trabalhos
                      </CardDescription>
                    </CardHeader>
                  </Link>
                </Card>

                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <Link href="/dashboard/equipamentos">
                    <CardHeader>
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle>Meus Equipamentos</CardTitle>
                      <CardDescription>
                        Cadastre equipamentos para venda ou aluguel
                      </CardDescription>
                    </CardHeader>
                  </Link>
                </Card>

                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <Link href="/dashboard/agenda">
                    <CardHeader>
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle>Agenda</CardTitle>
                      <CardDescription>
                        Gerencie sua disponibilidade e agendamentos
                      </CardDescription>
                    </CardHeader>
                  </Link>
                </Card>

                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <Link href="/dashboard/avaliacoes">
                    <CardHeader>
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                        <Star className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle>Avaliações</CardTitle>
                      <CardDescription>
                        Veja o que seus clientes estão dizendo sobre você
                      </CardDescription>
                    </CardHeader>
                  </Link>
                </Card>

                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <Link href="/dashboard/solicitacoes">
                    <CardHeader>
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle>Solicitações</CardTitle>
                      <CardDescription>
                        Visualize e responda solicitações de orçamento
                      </CardDescription>
                    </CardHeader>
                  </Link>
                </Card>
              </>
            ) : (
              <>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <Link href="/profissionais">
                    <CardHeader>
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                        <Camera className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle>Buscar Profissionais</CardTitle>
                      <CardDescription>
                        Encontre fotógrafos e videomakers
                      </CardDescription>
                    </CardHeader>
                  </Link>
                </Card>

                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <Link href="/equipamentos">
                    <CardHeader>
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle>Equipamentos</CardTitle>
                      <CardDescription>
                        Alugue ou compre equipamentos
                      </CardDescription>
                    </CardHeader>
                  </Link>
                </Card>

                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <Link href="/dashboard/solicitacoes">
                    <CardHeader>
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle>Minhas Solicitações</CardTitle>
                      <CardDescription>
                        Acompanhe seus orçamentos e agendamentos
                      </CardDescription>
                    </CardHeader>
                  </Link>
                </Card>
              </>
            )}

            <Card className="hover:border-primary transition-colors cursor-pointer">
              <Link href="/dashboard/perfil">
                <CardHeader>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>Meu Perfil</CardTitle>
                  <CardDescription>
                    Gerencie seus dados e preferências
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
              <CardDescription>
                Suas últimas interações na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma atividade recente</p>
                <p className="text-sm mt-2">
                  {isProfessional
                    ? "Complete seu perfil para começar a receber solicitações"
                    : "Comece buscando profissionais ou equipamentos"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
