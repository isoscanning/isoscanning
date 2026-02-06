"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context"; // Import useAuth
import { trackEvent } from "@/lib/analytics";
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

        trackEvent({
          action: 'view_professional',
          category: 'Professionals',
          label: profResponse.data.displayName || profResponse.data.artisticName,
          value: reviewsData.length // sending review count as value
        });

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
    trackEvent({ action: 'open_lightbox', category: 'Professionals', label: `Item: ${index}` });
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md bg-card border-border">
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
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-5xl space-y-12">
          {/* Profile Header */}
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Avatar */}
            <div className="relative h-40 w-40 rounded-full p-1 bg-gradient-to-tr from-primary/20 to-primary/5 shadow-2xl flex items-center justify-center">
              <Avatar className="h-full w-full border-4 border-background shadow-inner">
                <AvatarImage
                  src={professional.avatarUrl || undefined}
                  alt={professional.displayName}
                  className="object-cover"
                />
                <AvatarFallback className="text-4xl bg-muted text-muted-foreground">
                  {professional.displayName?.charAt(0).toUpperCase() || "P"}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Info */}
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-foreground tracking-tight">
                {professional.artisticName || professional.displayName}
              </h1>

              {/* Specialties */}
              <div className="flex flex-wrap justify-center gap-2">
                {professional.specialties && professional.specialties.length > 0 ? (
                  professional.specialties.map((spec) => (
                    <Badge
                      key={spec}
                      variant="secondary"
                      className="bg-primary/10 text-primary border-primary/20 px-3 py-1 font-semibold hover:bg-primary/20"
                    >
                      {spec}
                    </Badge>
                  ))
                ) : (
                  <p className="text-lg text-muted-foreground font-medium">
                    {professional.specialty || "Profissional"}
                  </p>
                )}
              </div>

              {/* Location */}
              {(professional.city || professional.state) && (
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground bg-muted/50 px-4 py-2 rounded-full w-fit mx-auto border border-border shadow-sm">
                  <MapPin className="h-4 w-4 text-primary" />
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
                  <p className="text-muted-foreground text-center leading-relaxed">
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
                  variant="outline"
                  size="icon"
                  className="rounded-full h-11 w-11 border-border bg-background/50 hover:bg-primary/10 hover:text-primary hover:scale-110 hover:border-primary/50 transition-all duration-300 shadow-sm"
                  onClick={() => trackEvent({ action: 'click_social', category: 'Professionals', label: 'Instagram', value: 0 })}
                >
                  <Instagram className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full h-11 w-11 border-border bg-background/50 hover:bg-primary/10 hover:text-primary hover:scale-110 hover:border-primary/50 transition-all duration-300 shadow-sm"
                  onClick={() => trackEvent({ action: 'click_social', category: 'Professionals', label: 'LinkedIn', value: 0 })}
                >
                  <Linkedin className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full h-11 w-11 border-border bg-background/50 hover:bg-primary/10 hover:text-primary hover:scale-110 hover:border-primary/50 transition-all duration-300 shadow-sm"
                  onClick={() => trackEvent({ action: 'click_social', category: 'Professionals', label: 'Website', value: 0 })}
                >
                  <Globe className="h-5 w-5" />
                </Button>
              </div>

              {/* WhatsApp Button */}
              {professional.phone && (
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white rounded-full px-8 h-12 gap-2 shadow-lg shadow-green-900/20 hover:shadow-green-900/40 hover:-translate-y-0.5 transition-all duration-300"
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
                      trackEvent({
                        action: 'contact_professional',
                        category: 'Professionals',
                        label: professional.displayName,
                      });
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
            <div className="flex justify-center mb-10">
              <TabsList className="bg-muted/50 p-1.5 h-auto rounded-full gap-2 border border-border/50">
                <TabsTrigger
                  value="portfolio"
                  className="rounded-full px-6 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm hover:text-primary/80"
                  onClick={() => trackEvent({ action: 'tab_change', category: 'Professionals', label: 'Portfolio' })}
                >
                  Portfólio
                </TabsTrigger>
                <TabsTrigger
                  value="avaliacoes"
                  className="rounded-full px-6 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm hover:text-primary/80"
                  onClick={() => trackEvent({ action: 'tab_change', category: 'Professionals', label: 'Reviews' })}
                >
                  Avaliações
                </TabsTrigger>
                <TabsTrigger
                  value="disponibilidade"
                  className="rounded-full px-6 py-2.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm hover:text-primary/80"
                  onClick={() => trackEvent({ action: 'tab_change', category: 'Professionals', label: 'Availability' })}
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
                        className="group relative aspect-square bg-muted rounded-2xl overflow-hidden cursor-pointer border border-border/50"
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
                              <div className="h-12 w-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm">
                                <Play className="h-5 w-5 text-black ml-1" />
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
                    <h2 className="text-2xl font-bold text-foreground">Avaliações</h2>
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
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <span className="text-3xl">
                      {professional.averageRating ? professional.averageRating.toFixed(1) : "—"}
                    </span>
                    <div className="flex flex-col items-start">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${star <= Math.round(professional.averageRating || 0)
                              ? "fill-primary text-primary"
                              : "text-muted"
                              }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground font-normal">
                        {professional.totalReviews} avaliações
                      </span>
                    </div>
                  </div>

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
                      className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shadow-inner border border-primary/20">
                          {review.clientName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold text-foreground">
                                {review.clientName}
                              </h3>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                                {new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(review.createdAt)}
                              </p>
                            </div>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${star <= review.rating
                                    ? "fill-primary text-primary"
                                    : "text-muted"
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
                            <Badge key={i} variant="outline" className="text-xs bg-muted text-muted-foreground border-border font-normal">
                              {q}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <p className="text-muted-foreground italic leading-relaxed text-sm bg-muted/30 p-3 rounded-lg border border-border/50">
                        "{review.comment}"
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/20">
                  <div className="flex flex-col items-center justify-center text-muted-foreground space-y-3">
                    <MessageCircle className="h-12 w-12 text-muted-foreground/50" />
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
                <h2 className="text-2xl font-bold text-foreground">
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

