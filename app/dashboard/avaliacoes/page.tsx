"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, TrendingUp, Users, Award, Loader2, MessageSquareQuote } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import apiClient from "@/lib/api-service";

interface Review {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

interface Stats {
  averageRating: number;
  totalReviews: number;
}

/**
 * Avaliações recebidas pelo profissional logado — dados reais de
 * GET /reviews?professionalId=me e GET /reviews/stats/:id. É o destino da
 * notificação "review_received".
 */
export default function AvaliacoesPage() {
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats>({ averageRating: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !userProfile) router.push("/login");
  }, [authLoading, userProfile, router]);

  useEffect(() => {
    if (!userProfile) return;
    (async () => {
      try {
        const [listRes, statsRes] = await Promise.all([
          apiClient.get(`/reviews?professionalId=${userProfile.id}&limit=100`),
          apiClient.get(`/reviews/stats/${userProfile.id}`).catch(() => null),
        ]);
        const list: Review[] = listRes.data?.data ?? [];
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setReviews(list);
        const s = statsRes?.data as Stats | undefined;
        setStats({
          averageRating: Number(s?.averageRating ?? (list.length ? list.reduce((acc, r) => acc + r.rating, 0) / list.length : 0)),
          totalReviews: Number(s?.totalReviews ?? list.length),
        });
      } catch {
        setError("Não foi possível carregar suas avaliações agora.");
      } finally {
        setLoading(false);
      }
    })();
  }, [userProfile]);

  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // índice 0 = 1 estrela
    reviews.forEach((r) => {
      const idx = Math.min(5, Math.max(1, Math.round(r.rating))) - 1;
      counts[idx] += 1;
    });
    return counts;
  }, [reviews]);

  const recommendRate = useMemo(() => {
    if (reviews.length === 0) return 0;
    return Math.round((reviews.filter((r) => r.rating >= 4).length / reviews.length) * 100);
  }, [reviews]);

  const last30 = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return reviews.filter((r) => new Date(r.createdAt).getTime() >= cutoff).length;
  }, [reviews]);

  if (authLoading || !userProfile) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-5xl space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">Minhas Avaliações</h1>
              <p className="text-muted-foreground mt-1">
                O que clientes e contratantes disseram sobre o seu trabalho. As avaliações aparecem no seu perfil público.
              </p>
            </div>
            <Link href={`/profissionais/${userProfile.id}`}>
              <Button variant="outline" size="sm">Ver meu perfil público</Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando avaliações...
            </div>
          ) : error ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">{error}</CardContent></Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<Star className="h-5 w-5 text-amber-500" />} label="Nota média"
                  value={stats.totalReviews ? stats.averageRating.toFixed(1) : "—"} hint={stats.totalReviews ? "de 5 estrelas" : "sem avaliações ainda"} />
                <StatCard icon={<Users className="h-5 w-5 text-sky-500" />} label="Total de avaliações"
                  value={String(stats.totalReviews)} hint="desde o início" />
                <StatCard icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} label="Últimos 30 dias"
                  value={String(last30)} hint={last30 === 1 ? "nova avaliação" : "novas avaliações"} />
                <StatCard icon={<Award className="h-5 w-5 text-violet-500" />} label="Recomendação"
                  value={reviews.length ? `${recommendRate}%` : "—"} hint="notas 4 e 5" />
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-base">Distribuição</CardTitle>
                    <CardDescription>Quantidade por nota</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = distribution[star - 1];
                      const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-sm">
                          <span className="w-8 flex items-center gap-0.5 tabular-nums">{star}<Star className="h-3 w-3 text-amber-500 fill-amber-500" /></span>
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-8 text-right text-muted-foreground tabular-nums">{count}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <div className="lg:col-span-2 space-y-3">
                  {reviews.length === 0 ? (
                    <Card>
                      <CardContent className="py-14 text-center space-y-2">
                        <MessageSquareQuote className="h-10 w-10 mx-auto text-muted-foreground/60" />
                        <p className="font-medium">Você ainda não recebeu avaliações</p>
                        <p className="text-sm text-muted-foreground">
                          Ao concluir um serviço com contrato, o contratante recebe um pedido de avaliação na plataforma.
                          Clientes também podem avaliar direto no seu perfil público.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    reviews.map((r) => (
                      <Card key={r.id}>
                        <CardContent className="pt-5 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={r.clientAvatar ?? undefined} alt={r.clientName} />
                                <AvatarFallback>{(r.clientName || "?").charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{r.clientName || "Cliente"}</p>
                                <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("pt-BR")}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0" aria-label={`${r.rating} de 5 estrelas`}>
                              {[1, 2, 3, 4, 5].map((i) => (
                                <Star key={i} className={`h-4 w-4 ${i <= Math.round(r.rating) ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`} />
                              ))}
                            </div>
                          </div>
                          {r.comment && <p className="text-sm leading-relaxed">{r.comment}</p>}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          {icon}
        </div>
        <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
