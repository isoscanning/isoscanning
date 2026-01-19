"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Package, MessageSquare, User, ChevronLeft, ChevronRight, X, Maximize2, MessageCircle } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import apiClient from "@/lib/api-service"

interface EquipmentDetails {
  id: string
  name: string
  category: string
  negotiationType: "sale" | "rent" | "free"
  condition: "new" | "used" | "refurbished"
  description: string
  brand?: string
  model?: string
  price?: number
  rentPeriod?: "day" | "week" | "month"
  city: string
  state: string
  imageUrl?: string
  imageUrls?: string[]
  ownerId: string
  ownerName: string
  ownerPhone?: string
  ownerPhoneCountryCode?: string
  available: boolean
  additionalConditions?: string
}

export default function EquipmentDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { userProfile } = useAuth()
  const equipmentId = params.id as string

  const [equipment, setEquipment] = useState<EquipmentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index)
    setIsLightboxOpen(true)
  }

  const closeLightbox = () => {
    setIsLightboxOpen(false)
  }

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setCurrentImageIndex((prev) => (prev === (equipment?.imageUrls?.length || 1) - 1 ? 0 : prev + 1))
  }

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setCurrentImageIndex((prev) => (prev === 0 ? (equipment?.imageUrls?.length || 1) - 1 : prev - 1))
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return
      if (e.key === "Escape") closeLightbox()
      if (e.key === "ArrowRight") nextImage()
      if (e.key === "ArrowLeft") prevImage()
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isLightboxOpen])

  useEffect(() => {
    fetchEquipment()
  }, [equipmentId])

  async function fetchEquipment() {
    try {
      setLoading(true)
      // Chamada ao Backend API
      const response = await apiClient.get(`/equipments/${equipmentId}`)
      console.log("[EquipmentDetails] Fetched data:", response.data);
      setEquipment(response.data)
    } catch (error) {
      console.error("Erro ao buscar equipamento:", error)
      setEquipment(null)
    } finally {
      setLoading(false)
    }
  }

  const getNegotiationLabel = (type: string) => {
    switch (type) {
      case "sale":
        return "Venda"
      case "rent":
        return "Aluguel"
      case "free":
        return "Gratuito"
      default:
        return type
    }
  }

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case "new":
        return "Novo"
      case "used":
        return "Usado"
      case "refurbished":
        return "Seminovo"
      default:
        return condition
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!equipment) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">Equipamento não encontrado</p>
              <Link href="/equipamentos">
                <Button>Voltar para busca</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  const displayImages = equipment.imageUrls && equipment.imageUrls.length > 0 ? equipment.imageUrls : (equipment.imageUrl ? [equipment.imageUrl] : [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Images */}
            <div className="space-y-4">
              <div
                className="aspect-video bg-muted rounded-lg overflow-hidden relative cursor-pointer group"
                onClick={() => openLightbox(currentImageIndex)}
              >
                {displayImages[currentImageIndex] ? (
                  <>
                    <img
                      src={displayImages[currentImageIndex] || "/placeholder.svg"}
                      alt={equipment.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 bg-black/50 text-white p-2 rounded-full transition-opacity">
                        <Maximize2 className="h-6 w-6" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package className="h-24 w-24 text-muted-foreground" />
                  </div>
                )}
              </div>

              {displayImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {displayImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`aspect-video bg-muted rounded overflow-hidden border-2 ${idx === currentImageIndex ? "border-primary" : "border-transparent"
                        }`}
                    >
                      <img
                        src={img || "/placeholder.svg"}
                        alt={`${equipment.name} ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-6">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h1 className="text-3xl font-bold">{equipment.name}</h1>
                  <Badge variant={equipment.negotiationType === "free" ? "secondary" : "default"} className="text-sm">
                    {getNegotiationLabel(equipment.negotiationType)}
                  </Badge>
                </div>

                {(equipment.brand || equipment.model) && (
                  <p className="text-muted-foreground">
                    {equipment.brand} {equipment.model}
                  </p>
                )}
              </div>

              {/* Price */}
              {equipment.price && equipment.price > 0 && (
                <div>
                  <p className="text-3xl font-bold text-primary">
                    R$ {equipment.price.toFixed(2)}
                    {equipment.negotiationType === "rent" && equipment.rentPeriod && (
                      <span className="text-lg font-normal text-muted-foreground">
                        /{equipment.rentPeriod === "day" ? "dia" : equipment.rentPeriod === "week" ? "semana" : "mês"}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Info */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{equipment.category}</Badge>
                <Badge variant="outline">{getConditionLabel(equipment.condition)}</Badge>
                <Badge variant={equipment.available ? "default" : "secondary"}>
                  {equipment.available ? "Disponível" : "Indisponível"}
                </Badge>
              </div>

              {/* Location */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {equipment.city}, {equipment.state}
                </span>
              </div>

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Descrição</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{equipment.description}</p>
                </CardContent>
              </Card>

              {/* Additional Conditions */}
              {equipment.additionalConditions && (
                <Card>
                  <CardHeader>
                    <CardTitle>Condições Adicionais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{equipment.additionalConditions}</p>
                  </CardContent>
                </Card>
              )}

              {/* Owner Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Vendedor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{equipment.ownerName}</span>
                  </div>
                  {equipment.ownerPhone && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" /> {/* Just aligning icons */}
                        <span className="text-sm">Contato disponível</span>
                      </div>

                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                        onClick={() => {
                          let cleanNumber = '';
                          if (equipment.ownerPhoneCountryCode && equipment.ownerPhone) {
                            const code = equipment.ownerPhoneCountryCode.replace(/\D/g, '');
                            const num = equipment.ownerPhone.replace(/\D/g, '');
                            cleanNumber = `${code}${num}`;
                          } else {
                            // Legacy fallback
                            const phone = equipment.ownerPhone || '';
                            const isInternational = phone.startsWith('+');
                            let cleanPhone = phone.replace(/\D/g, '');

                            if (!isInternational && cleanPhone.length <= 11) {
                              cleanNumber = `55${cleanPhone}`;
                            } else {
                              cleanNumber = cleanPhone;
                            }
                          }
                          window.open(`https://wa.me/${cleanNumber}`, '_blank');
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                        Conversar no WhatsApp
                      </Button>
                    </div>
                  )}
                  <Link href={`/profissionais/${equipment.ownerId}`}>
                    <Button variant="outline" className="w-full bg-transparent">
                      Ver perfil do vendedor
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Actions */}
              {userProfile && userProfile.id !== equipment.ownerId && equipment.available && (
                <div className="space-y-3">
                  <Link href={`/negociar-equipamento/${equipment.id}`}>
                    <Button className="w-full" size="lg">
                      <MessageSquare className="h-5 w-5 mr-2" />
                      {equipment.negotiationType === "sale"
                        ? "Fazer Proposta"
                        : equipment.negotiationType === "rent"
                          ? "Solicitar Aluguel"
                          : "Solicitar Equipamento"}
                    </Button>
                  </Link>
                </div>
              )}

              {!userProfile && (
                <Card className="bg-muted">
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground mb-3">Faça login para negociar este equipamento</p>
                    <Link href="/login">
                      <Button>Entrar</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50"
          >
            <X className="h-8 w-8" />
          </button>

          <img
            src={displayImages[currentImageIndex] || "/placeholder.svg"}
            alt={equipment.name}
            className="max-w-full max-h-[90vh] object-contain select-none"
            onClick={(e) => e.stopPropagation()}
          />

          {displayImages.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <ChevronRight className="h-8 w-8" />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
                {currentImageIndex + 1} / {displayImages.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
