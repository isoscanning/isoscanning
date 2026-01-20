"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context"; // Import useAuth
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReviewModal } from "@/components/review-modal"; // Import ReviewModal
import {
  MapPin,
  Star,
  Instagram,
  Linkedin,
  Globe,
  Play,
  ChevronLeft,
  ChevronRight,
  X,
  MessageCircle,
  Plus // Import Plus
} from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/api-service";
import { type Professional, type AvailabilitySlot, fetchAvailability } from "@/lib/data-service";
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
  qualities?: string[]; // Add qualities
  createdAt: Date;
}

interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  imageUrls?: string[];
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  category?: string;
}

export default function ProfessionalProfilePage() {
  const params = useParams();
  const professionalId = params.id as string;
  const { userProfile: currentUser } = useAuth(); // Get currentUser

  const [professional, setProfessional] = useState<Professional | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModalOpen, setReviewModalOpen] = useState(false); // Modal state
  const [hasUserReviewed, setHasUserReviewed] = useState(false); // Checking state

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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
            mediaUrl: item.mediaUrl,
            mediaType: item.mediaType,
            imageUrls:
              item.imageUrls && item.imageUrls.length > 0
                ? item.imageUrls
                : item.mediaUrl
                  ? [item.mediaUrl]
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
            qualities: review.qualities || [],
            createdAt: new Date(review.createdAt),
            clientId: review.clientId // Need this to check ownership
          })
        );
        setReviews(reviewsData);

        // Calculate average rating and total from actual reviews
        if (reviewsData.length > 0) {
          const totalRating = reviewsData.reduce((sum: number, r: any) => sum + r.rating, 0);
          const avgRating = totalRating / reviewsData.length;

          // Update professional object with calculated values
          setProfessional(prev => prev ? {
            ...prev,
            averageRating: avgRating,
            totalReviews: reviewsData.length
          } : null);
        }

        // Check if current user has reviewed
        if (currentUser) {
          const userReview = reviewsData.find((r: any) => r.clientId === currentUser.id);
          if (userReview) {
            setHasUserReviewed(true);
          }
        }

      } catch (error) {
        console.error("[profissional-detail] Error fetching reviews:", error);
      }

      // Fetch availability
      try {
        const availabilityData = await fetchAvailability(professionalId);
        setAvailability(availabilityData);
      } catch (error) {
        console.error("[profissional-detail] Error fetching availability:", error);
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

  // Re-check hasUserReviewed when currentUser changes (in case of deep link login etc)
  useEffect(() => {
    if (currentUser && reviews.length > 0) {
      const userReview = reviews.find((r: any) => r.clientId === currentUser.id);
      if (userReview) setHasUserReviewed(true);
    }
  }, [currentUser, reviews]);

  // Lightbox functions
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const goToPrevious = () => {
    setLightboxIndex((prev) => (prev === 0 ? portfolio.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setLightboxIndex((prev) => (prev === portfolio.length - 1 ? 0 : prev + 1));
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;

      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, portfolio.length]);

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

              {/* Biography */}
              {professional.description && (
                <div className="max-w-2xl mx-auto pt-2">
                  <p className="text-gray-600 text-center leading-relaxed">
                    {professional.description}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col items-center gap-4">
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

              {/* WhatsApp Button */}
              {professional.phone && (
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white rounded-full px-8 h-12 gap-2 shadow-lg shadow-green-200"
                  onClick={() => {
                    let phone = professional.phone || '';
                    // Remove non-digits and non-plus
                    // Actually for wa.me we need clean digits.

                    // Logic:
                    // If phoneCountryCode exists, use it + phone.
                    // Else fallback to legacy logic.

                    let cleanNumber = '';

                    if (professional.phoneCountryCode && professional.phone) {
                      // New format: We have separate code and number.
                      const code = professional.phoneCountryCode.replace(/\D/g, '');
                      const num = professional.phone.replace(/\D/g, '');
                      cleanNumber = `${code}${num}`;
                    } else {
                      // Legacy fallback
                      const phone = professional.phone || '';
                      const isInternational = phone.startsWith('+');
                      let cleanPhone = phone.replace(/\D/g, '');

                      if (!isInternational && cleanPhone.length <= 11) {
                        // Likely a legacy Brazilian number without DDI
                        cleanNumber = `55${cleanPhone}`;
                      } else {
                        cleanNumber = cleanPhone;
                      }
                    }

                    if (cleanNumber) {
                      window.open(`https://wa.me/${cleanNumber}`, '_blank');
                    }
                  }}
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="font-bold">Entrar em contato</span>
                </Button>
              )}
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
                  {portfolio.map((item, index) => {
                    const mediaUrl = item.mediaUrl || item.imageUrls?.[0] || "/placeholder.svg";
                    const isVideo = item.mediaType === 'video';

                    return (
                      <div
                        key={item.id}
                        className="group relative aspect-square bg-gray-100 rounded-2xl overflow-hidden cursor-pointer"
                        onClick={() => openLightbox(index)}
                      >
                        {isVideo ? (
                          <>
                            <video
                              src={mediaUrl}
                              className="h-full w-full object-cover"
                              muted
                              loop
                              onMouseEnter={(e) => e.currentTarget.play()}
                              onMouseLeave={(e) => {
                                e.currentTarget.pause();
                                e.currentTarget.currentTime = 0;
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors pointer-events-none">
                              <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                                <Play className="h-5 w-5 text-gray-900 fill-gray-900 ml-1" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <img
                            src={mediaUrl}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                      </div>
                    );
                  })}
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
                <div className="flex items-center gap-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Avaliações</h2>
                    <p className="text-muted-foreground text-sm">O que outros profissionais dizem</p>
                  </div>

                  {/* Review Button - Only for other professionals who haven't reviewed yet */}
                  {currentUser &&
                    (currentUser.userType?.toLowerCase() === 'professional') &&
                    currentUser.id !== professional.id &&
                    !hasUserReviewed && (
                      <Button onClick={() => setReviewModalOpen(true)} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Avaliar Profissional
                      </Button>
                    )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2 text-blue-600 font-bold">
                    <span className="text-3xl">
                      {professional.averageRating ? professional.averageRating.toFixed(1) : "—"}
                    </span>
                    <div className="flex flex-col items-start">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${star <= Math.round(professional.averageRating || 0)
                              ? "fill-blue-600 text-blue-600"
                              : "text-gray-200"
                              }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-400 font-normal">
                        {professional.totalReviews} avaliações
                      </span>
                    </div>
                  </div>

                  {/* Review Button Logic */}
                  {/* Review Button Logic - DEBUG INFO */}
                  {/*
                  <div className="text-xs text-red-500 flex flex-col items-end">
                      <p>MyID: {currentUser?.id?.substring(0,5)}...</p>
                      <p>ProfID: {professional.id?.substring(0,5)}...</p>
                      <p>Type: {currentUser?.userType}</p>
                      <p>Reviewed: {hasUserReviewed ? 'Yes' : 'No'}</p>
                  </div>
                  */}

                  {currentUser &&
                    currentUser.userType === 'professional' &&
                    currentUser.id !== professional.id &&
                    !hasUserReviewed && (
                      <Button onClick={() => setReviewModalOpen(true)} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Avaliar Profissional
                      </Button>
                    )}
                </div>
              </div>

              {reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-amber-700 font-bold text-lg shadow-inner border border-white">
                          {review.clientName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold text-gray-900">
                                {review.clientName}
                              </h3>
                              <p className="text-xs text-gray-400 uppercase tracking-wide">
                                {new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(review.createdAt)}
                              </p>
                            </div>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${star <= review.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-gray-200"
                                    }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Qualities Tags */}
                      {review.qualities && review.qualities.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {review.qualities.map((q: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-100 font-normal">
                              {q}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <p className="text-gray-600 italic leading-relaxed text-sm bg-gray-50/50 p-3 rounded-lg border border-gray-100/50">
                        "{review.comment}"
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                  <div className="flex flex-col items-center justify-center text-gray-400 space-y-3">
                    <MessageCircle className="h-12 w-12 text-gray-200" />
                    <p className="text-muted-foreground">
                      Este profissional ainda não possui avaliações.
                    </p>
                    {currentUser && currentUser.userType === 'professional' && currentUser.id !== professional.id && (
                      <Button variant="link" onClick={() => setReviewModalOpen(true)}>
                        Seja o primeiro a avaliar
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="disponibilidade" className="mt-0 space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">
                  Disponibilidade
                </h2>
              </div>
              <AvailabilityCalendar availabilitySlots={availability} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />

      {/* Lightbox Modal */}
      {lightboxOpen && portfolio[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50"
            aria-label="Fechar"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Previous Button */}
          {portfolio.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-10 w-10" />
            </button>
          )}

          {/* Next Button */}
          {portfolio.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50"
              aria-label="Próximo"
            >
              <ChevronRight className="h-10 w-10" />
            </button>
          )}

          {/* Media Content */}
          <div
            className="max-w-[90vw] max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {portfolio[lightboxIndex].mediaType === 'video' ? (
              <video
                src={portfolio[lightboxIndex].mediaUrl || portfolio[lightboxIndex].imageUrls?.[0]}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
                controls
                autoPlay
              />
            ) : (
              <img
                src={portfolio[lightboxIndex].mediaUrl || portfolio[lightboxIndex].imageUrls?.[0]}
                alt={portfolio[lightboxIndex].title}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            )}

            {/* Title and Counter */}
            <div className="mt-4 text-center">
              <p className="text-white text-lg font-medium">{portfolio[lightboxIndex].title}</p>
              <p className="text-white/60 text-sm mt-1">
                {lightboxIndex + 1} de {portfolio.length}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Review Modal */}
      {professional && (
        <ReviewModal
          open={reviewModalOpen}
          onOpenChange={setReviewModalOpen}
          professionalId={professional.id}
          professionalName={professional.displayName}
          onSuccess={() => {
            // Refresh data
            fetchProfessionalData();
          }}
        />
      )}
    </div>
  );
}

