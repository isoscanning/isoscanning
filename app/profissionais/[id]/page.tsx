"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MapPin,
  Star,
  Instagram,
  Linkedin,
  Globe,
  Play,
} from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/api-service";
import type { Professional } from "@/lib/data-service";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import {
  getMockAvatar,
  generateMockPortfolioItems,
  getMockPortfolioImage,
} from "@/lib/mock-data";

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
      // Fetch professional profile
      const profResponse = await apiClient.get(`/profiles/${professionalId}`);
      setProfessional(profResponse.data);

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
            imageUrls:
              item.imageUrls && item.imageUrls.length > 0
                ? item.imageUrls
                : [getMockPortfolioImage(item.id)],
            category: item.category,
          })
        );
        // If portfolio is empty, generate mock items
        if (portfolioData.length === 0) {
          setPortfolio(generateMockPortfolioItems(6));
        } else {
          setPortfolio(portfolioData);
        }
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
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-5xl space-y-12">
          {/* Profile Header */}
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Avatar */}
            <div className="relative h-40 w-40 rounded-full p-1 bg-gradient-to-tr from-amber-200 to-amber-100 shadow-lg flex items-center justify-center">
              <Avatar className="h-full w-full border-4 border-white shadow-inner">
                <AvatarImage
                  src={professional.avatarUrl || undefined}
                  alt={professional.displayName}
                  className="object-cover"
                />
                <AvatarFallback className="text-4xl bg-white text-gray-400">
                  {professional.displayName?.charAt(0).toUpperCase() || "P"}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Info */}
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                {professional.artisticName || professional.displayName}
              </h1>

              {/* Specialties */}
              <div className="flex flex-wrap justify-center gap-2">
                {professional.specialties && professional.specialties.length > 0 ? (
                  professional.specialties.map((spec) => (
                    <Badge
                      key={spec}
                      variant="secondary"
                      className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100 px-3 py-1 font-semibold"
                    >
                      {spec}
                    </Badge>
                  ))
                ) : (
                  <p className="text-lg text-gray-600 font-medium">
                    {professional.specialty || "Profissional"}
                  </p>
                )}
              </div>

              {/* Location */}
              {(professional.city || professional.state) && (
                <div className="flex items-center justify-center gap-1.5 text-gray-600 bg-gray-50 px-4 py-2 rounded-full w-fit mx-auto border border-gray-100 shadow-sm">
                  <MapPin className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold">
                    {professional.city}
                    {professional.city && professional.state && ", "}
                    {professional.state}
                  </span>
                </div>
              )}
            </div>

            {/* Social Icons */}
            <div className="flex gap-4">
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full h-10 w-10 bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                <Instagram className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full h-10 w-10 bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                <Linkedin className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full h-10 w-10 bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                <Globe className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="portfolio" className="w-full">
            <div className="flex justify-center mb-12 border-b border-gray-100">
              <TabsList className="bg-transparent h-auto p-0 gap-8">
                <TabsTrigger
                  value="portfolio"
                  className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 data-[state=active]:text-gray-900"
                >
                  Portfólio
                </TabsTrigger>
                <TabsTrigger
                  value="avaliacoes"
                  className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 data-[state=active]:text-gray-900"
                >
                  Avaliações
                </TabsTrigger>
                <TabsTrigger
                  value="disponibilidade"
                  className="bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 data-[state=active]:text-gray-900"
                >
                  Disponibilidade
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="portfolio" className="mt-0 space-y-12">
              {portfolio.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {portfolio.map((item) => (
                    <div
                      key={item.id}
                      className="group relative aspect-square bg-gray-100 rounded-2xl overflow-hidden cursor-pointer"
                    >
                      <img
                        src={item.imageUrls?.[0] || "/placeholder.svg"}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {/* Video Overlay Mock - Assuming some items might be videos based on category or just visual style */}
                      {(item.category === "Vídeo" ||
                        item.category === "Videomaker") && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                            <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                              <Play className="h-5 w-5 text-gray-900 fill-gray-900 ml-1" />
                            </div>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Nenhum item no portfólio.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="avaliacoes" className="mt-0 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Avaliações</h2>
                <div className="flex items-center gap-2 text-blue-600 font-bold">
                  <span className="text-xl">
                    {professional.averageRating?.toFixed(1)}
                  </span>
                  <Star className="h-5 w-5 fill-blue-600 text-blue-600" />
                  <span className="text-sm text-gray-400 font-normal">
                    ({professional.totalReviews} reviews)
                  </span>
                </div>
              </div>

              {reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-lg">
                          {review.clientName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">
                            {review.clientName}
                          </h3>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mt-1">
                            HÁ{" "}
                            {Math.floor(
                              (new Date().getTime() -
                                review.createdAt.getTime()) /
                              (1000 * 60 * 60 * 24 * 30)
                            )}{" "}
                            MESES
                          </p>
                        </div>
                        <div className="ml-auto flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${star <= review.rating
                                ? "fill-blue-500 text-blue-500"
                                : "text-gray-200"
                                }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-600 italic leading-relaxed">
                        "{review.comment}"
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Nenhuma avaliação ainda.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="disponibilidade" className="mt-0 space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">
                  Disponibilidade
                </h2>
              </div>
              <AvailabilityCalendar />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}

