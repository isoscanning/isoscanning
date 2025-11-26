"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Star,
  Phone,
  LinkIcon,
  Calendar,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import apiClient from "@/lib/api-service";
import type { Professional } from "@/lib/data-service";

interface Review {
  id: string;
  clientName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  imageUrls?: string[];
  category?: string;
}

export default function ProfessionalProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile } = useAuth();
  const professionalId = params.id as string;

  const [professional, setProfessional] = useState<Professional | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfessionalData();
  }, [professionalId]);

  const fetchProfessionalData = async () => {
    setLoading(true);
    try {
      console.log(
        "[profissional-detail] Fetching professional data for id:",
        professionalId
      );

      // Fetch professional profile
      const profResponse = await apiClient.get(`/profiles/${professionalId}`);
      setProfessional(profResponse.data);
      console.log(
        "[profissional-detail] Professional loaded:",
        profResponse.data
      );

      // Fetch portfolio for this professional
      try {
        const portfolioResponse = await apiClient.get(
          `/portfolio?professionalId=${professionalId}`
        );
        const portfolioData = (portfolioResponse.data.data || []).map(
          (item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            imageUrls: item.imageUrls || [],
            category: item.category,
          })
        );
        setPortfolio(portfolioData);
        console.log("[profissional-detail] Portfolio loaded:", portfolioData);
      } catch (error) {
        console.error("[profissional-detail] Error fetching portfolio:", error);
      }

      // Fetch reviews for this professional
      try {
        const reviewsResponse = await apiClient.get(
          `/reviews?professionalId=${professionalId}`
        );
        const reviewsData = (reviewsResponse.data.data || []).map(
          (review: any) => ({
            id: review.id,
            clientName: review.clientName,
            rating: review.rating,
            comment: review.comment,
            createdAt: new Date(review.createdAt),
          })
        );
        setReviews(reviewsData);
        console.log("[profissional-detail] Reviews loaded:", reviewsData);
      } catch (error) {
        console.error("[profissional-detail] Error fetching reviews:", error);
      }
    } catch (error) {
      console.error(
        "[profissional-detail] Error fetching professional data:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">
                Profissional não encontrado
              </p>
              <Link href="/profissionais">
                <Button>Voltar para busca</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          {/* Profile Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="relative h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {professional.avatarUrl ? (
                      <img
                        src={professional.avatarUrl || "/placeholder.svg"}
                        alt={professional.displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-5xl font-bold text-primary">
                        {professional.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h1 className="text-3xl font-bold">
                      {professional.artisticName || professional.displayName}
                    </h1>
                    {professional.specialty && (
                      <p className="text-lg text-muted-foreground mt-1">
                        {professional.specialty}
                      </p>
                    )}
                  </div>

                  {/* Rating */}
                  {professional.totalReviews &&
                  professional.totalReviews > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-5 w-5 ${
                              star <= (professional.averageRating || 0)
                                ? "fill-primary text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-medium">
                        {professional.averageRating?.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">
                        ({professional.totalReviews} avaliações)
                      </span>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Sem avaliações ainda
                    </p>
                  )}

                  {/* Location & Contact */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {(professional.city || professional.state) && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {professional.city}
                          {professional.city && professional.state && ", "}
                          {professional.state}
                        </span>
                      </div>
                    )}
                    {professional.phone && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{professional.phone}</span>
                      </div>
                    )}
                    {professional.portfolioLink && (
                      <a
                        href={professional.portfolioLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <LinkIcon className="h-4 w-4" />
                        <span>Portfólio externo</span>
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/orcamento/${professional.id}`}>
                      <Button>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Solicitar Orçamento
                      </Button>
                    </Link>
                    <Link href={`/agendar/${professional.id}`}>
                      <Button variant="outline">
                        <Calendar className="h-4 w-4 mr-2" />
                        Ver Disponibilidade
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="sobre" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sobre">Sobre</TabsTrigger>
              <TabsTrigger value="portfolio">
                Portfólio ({portfolio.length})
              </TabsTrigger>
              <TabsTrigger value="avaliacoes">
                Avaliações ({reviews.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sobre" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sobre o profissional</CardTitle>
                </CardHeader>
                <CardContent>
                  {professional.description ? (
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {professional.description}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic">
                      Nenhuma descrição disponível
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="portfolio" className="mt-6">
              {portfolio.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {portfolio.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="aspect-video bg-muted relative overflow-hidden">
                        <img
                          src={item.imageUrls?.[0] || "/placeholder.svg"}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <CardContent className="pt-4">
                        <h3 className="font-semibold mb-1">{item.title}</h3>
                        {item.category && (
                          <Badge variant="secondary">{item.category}</Badge>
                        )}
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      Nenhum trabalho no portfólio ainda
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="avaliacoes" className="mt-6">
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold">{review.clientName}</p>
                            <div className="flex items-center gap-1 mt-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= review.rating
                                      ? "fill-primary text-primary"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {review.createdAt && (
                            <span className="text-sm text-muted-foreground">
                              {review.createdAt.toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground">
                          {review.comment}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      Nenhuma avaliação ainda
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
