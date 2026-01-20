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
import {
  Camera,
  Package,
  Calendar,
  Star,
  User,
  Settings,
  MessageSquare,
  ArrowRight,
  UserPlus,
  Briefcase
} from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/api-service";
import { ScrollReveal } from "@/components/scroll-reveal";

export default function DashboardPage() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const [googleName, setGoogleName] = useState("");

  // Dashboard Stats
  const [stats, setStats] = useState({
    rating: 0,
    reviews: 0,
    requests: 0,
    equipments: 0
  });

  useEffect(() => {
    if (!loading && !userProfile) {
      router.push("/login");
    }
  }, [userProfile, loading, router]);

  useEffect(() => {
    // 1. Get Name from local storage if missing
    if (userProfile && !userProfile.displayName) {
      try {
        const keys = Object.keys(localStorage);
        const sbKey = keys.find(key => key.startsWith("sb-") && key.endsWith("-auth-token"));
        if (sbKey) {
          const sessionData = localStorage.getItem(sbKey);
          if (sessionData) {
            const session = JSON.parse(sessionData);
            const name = session.user?.user_metadata?.full_name || session.user?.user_metadata?.name;
            if (name && typeof name === 'string') {
              setGoogleName(name);
            }
          }
        }
      } catch (error) {
        console.error("Error parsing user metadata", error);
      }
    }

    // 2. Fetch Dashboard Data
    const fetchDashboardData = async () => {
      if (!userProfile) return;

      try {
        // Set profile stats
        const rating = userProfile.averageRating || 0; // The average rating is stored in profile but often dependent on separate sync in some systems. Using profile data for now.
        const reviews = userProfile.totalReviews || 0;

        // Fetch requests count
        let requestsCount = 0;
        try {
          const requestsRes = await apiClient.get(`/quotes?clientId=${userProfile.id}`);
          const requestsData = requestsRes.data.data || requestsRes.data || [];
          requestsCount = requestsData.length;
        } catch (e) {
          console.error("Error fetching requests count", e);
        }

        // Fetch equipments count
        let equipmentsCount = 0;
        try {
          const equipRes = await apiClient.get(`/equipments?ownerId=${userProfile.id}`);
          const equipData = equipRes.data.data || equipRes.data || [];
          equipmentsCount = equipData.length;
        } catch (e) {
          console.error("Error fetching equipments count", e);
        }

        setStats({
          rating,
          reviews,
          requests: requestsCount,
          equipments: equipmentsCount
        });

      } catch (error) {
        console.error("Error fetching dashboard data", error);
      }
    };

    fetchDashboardData();

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
    <div className="min-h-screen flex flex-col bg-background/50">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-10">

          {/* Welcome Section with Gradient */}
          <ScrollReveal>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 p-8 md:p-12 border border-primary/10">
              <div className="relative z-10 space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                  Olá, {userProfile.displayName || googleName}!
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl text-foreground/80">
                  {isProfessional
                    ? "Bem-vindo ao seu painel de controle. Acompanhe suas métricas e gerencie seus serviços."
                    : "Bem-vindo ao ISO Scanning. Encontre os melhores profissionais e equipamentos para o seu projeto."}
                </p>
              </div>
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl"></div>
            </div>
          </ScrollReveal>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Rating Stat */}
            <ScrollReveal delay={0.1}>
              <Card className="hover:shadow-md transition-all duration-300 border-primary/10 h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Nota Média</CardTitle>
                  <Star className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-end gap-2">
                    {stats.rating > 0 ? stats.rating.toFixed(1) : "—"}
                    {stats.rating > 0 && <span className="text-sm font-normal text-muted-foreground mb-1">/ 5.0</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Baseado nas avaliações
                  </p>
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* Reviews Stat */}
            <ScrollReveal delay={0.2}>
              <Card className="hover:shadow-md transition-all duration-300 border-primary/10 h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avaliações</CardTitle>
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.reviews}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total de feedbacks recebidos
                  </p>
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* Requests Stat */}
            <ScrollReveal delay={0.3}>
              <Card className="hover:shadow-md transition-all duration-300 border-primary/10 h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Solicitações</CardTitle>
                  <Briefcase className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.requests}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Orçamentos e contatos
                  </p>
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* Equipments Stat */}
            <ScrollReveal delay={0.4}>
              <Card className="hover:shadow-md transition-all duration-300 border-primary/10 h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Equipamentos</CardTitle>
                  <Package className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.equipments}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Itens cadastrados
                  </p>
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>

          {/* Quick Actions Grid */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="w-1 h-8 bg-primary rounded-full"></span>
              Acesso Rápido
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* START: Profile Card (Highlight) */}
              <ScrollReveal delay={0.5}>
                <Link href="/dashboard/perfil" className="block h-full group">
                  <Card className="h-full border-2 border-primary/5 hover:border-primary/30 transition-all duration-300 hover:shadow-lg dark:hover:shadow-primary/5 bg-gradient-to-br from-background to-primary/5">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-4 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                        <User className="h-6 w-6" />
                      </div>
                      <CardTitle className="group-hover:text-primary transition-colors">Meu Perfil</CardTitle>
                      <CardDescription>
                        Gerencie seus dados pessoais, foto de perfil e configurações da conta.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-end">
                      <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </ScrollReveal>
              {/* END: Profile Card */}

              {/* START: Equipments Card */}
              <ScrollReveal delay={0.6}>
                <Link href="/dashboard/equipamentos" className="block h-full group">
                  <Card className="h-full border-border hover:border-green-500/50 transition-all duration-300 hover:shadow-lg bg-card">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Package className="h-6 w-6" />
                      </div>
                      <CardTitle className="group-hover:text-green-500 transition-colors">Meus Equipamentos</CardTitle>
                      <CardDescription>
                        Adicione, edite ou remova seus equipamentos anunciados para venda ou aluguel.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-end">
                      <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center group-hover:bg-green-500 group-hover:text-white group-hover:border-green-500 transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </ScrollReveal>
              {/* END: Equipments Card */}

              {/* START: Requests Card */}
              <ScrollReveal delay={0.7}>
                <Link href="/dashboard/solicitacoes" className="block h-full group">
                  <Card className="h-full border-border hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg bg-card">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <CardTitle className="group-hover:text-purple-500 transition-colors">Solicitações e Agenda</CardTitle>
                      <CardDescription>
                        Acompanhe pedidos de orçamento, mensagens de clientes e sua agenda.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-end">
                      <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white group-hover:border-purple-500 transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </ScrollReveal>
              {/* END: Requests Card */}

              {/* START: Portfolio Card (Only Professional) */}
              {isProfessional && (
                <ScrollReveal delay={0.8}>
                  <Link href="/dashboard/portfolio" className="block h-full group">
                    <Card className="h-full border-border hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg bg-card">
                      <CardHeader>
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                          <Camera className="h-6 w-6" />
                        </div>
                        <CardTitle className="group-hover:text-blue-500 transition-colors">Portfólio</CardTitle>
                        <CardDescription>
                          Gerencie a vitrine do seu trabalho. Adicione fotos e vídeos para atrair clientes.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex justify-end">
                        <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500 transition-colors">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </ScrollReveal>
              )}
              {/* END: Portfolio Card */}

              {/* START: Find Professionals (Only Client) */}
              {!isProfessional && (
                <ScrollReveal delay={0.8}>
                  <Link href="/profissionais" className="block h-full group">
                    <Card className="h-full border-border hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg bg-card">
                      <CardHeader>
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                          <UserPlus className="h-6 w-6" />
                        </div>
                        <CardTitle className="group-hover:text-blue-500 transition-colors">Buscar Profissionais</CardTitle>
                        <CardDescription>
                          Encontre os melhores fotógrafos e videomakers para o seu evento ou projeto.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex justify-end">
                        <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500 transition-colors">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </ScrollReveal>
              )}
              {/* END: Find Professionals */}

              {/* START: Jobs Card */}
              <ScrollReveal delay={0.9}>
                <Link href="/vagas" className="block h-full group">
                  <Card className="h-full border-border hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg bg-card">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Briefcase className="h-6 w-6" />
                      </div>
                      <CardTitle className="group-hover:text-orange-500 transition-colors">Minhas Vagas</CardTitle>
                      <CardDescription>
                        Encontre oportunidades de trabalho e gerencie suas candidaturas.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-end">
                      <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500 transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </ScrollReveal>
              {/* END: Jobs Card */}

              {/* START: My Applications Card */}
              <ScrollReveal delay={1.0}>
                <Link href="/dashboard/candidaturas" className="block h-full group">
                  <Card className="h-full border-border hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg bg-card">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Briefcase className="h-6 w-6" />
                      </div>
                      <CardTitle className="group-hover:text-cyan-500 transition-colors">Minhas Candidaturas</CardTitle>
                      <CardDescription>
                        Acompanhe o status das suas candidaturas e gerencie suas aplicações a vagas.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-end">
                      <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white group-hover:border-cyan-500 transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </ScrollReveal>
              {/* END: My Applications Card */}

            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
