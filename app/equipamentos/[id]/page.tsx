"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Package, MessageSquare, User, ChevronLeft, ChevronRight, X, Maximize2, MessageCircle, Star, Shield, Calendar, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import apiClient from "@/lib/api-service"
import { ScrollReveal } from "@/components/scroll-reveal"
import { motion, AnimatePresence } from "framer-motion"

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
      case "sale": return "Venda"
      case "rent": return "Aluguel"
      case "free": return "Gratuito"
      default: return type
    }
  }

  const getNegotiationColor = (type: string) => {
    switch (type) {
      case "sale": return "bg-green-500 hover:bg-green-600"
      case "rent": return "bg-blue-500 hover:bg-blue-600"
      case "free": return "bg-purple-500 hover:bg-purple-600"
      default: return "bg-gray-500 hover:bg-gray-600"
    }
  }

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case "new": return "Novo"
      case "used": return "Usado"
      case "refurbished": return "Seminovo"
      default: return condition
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Carregando detalhes...</p>
        </div>
      </div>
    )
  }

  if (!equipment) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-2 shadow-2xl">
            <CardContent className="pt-10 pb-10 text-center space-y-6">
              <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Package className="h-10 w-10 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">Equipamento não encontrado</h2>
                <p className="text-muted-foreground">Este item pode ter sido removido ou não existe.</p>
              </div>
              <Link href="/equipamentos">
                <Button className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para busca
                </Button>
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
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-12 px-4">
        {/* Breadcrumb / Back Navigation */}
        <div className="container mx-auto max-w-7xl mb-6">
          <Link href="/equipamentos" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Marketplace
          </Link>
        </div>

        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

            {/* Left Column: Images (7 columns) */}
            <div className="lg:col-span-7 space-y-6">
              <ScrollReveal>
                <div
                  className="aspect-[4/3] bg-muted rounded-2xl overflow-hidden relative cursor-pointer group shadow-lg border-2"
                  onClick={() => openLightbox(currentImageIndex)}
                >
                  {displayImages[currentImageIndex] ? (
                    <motion.div
                      key={currentImageIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="h-full w-full"
                    >
                      <img
                        src={displayImages[currentImageIndex] || "/placeholder.svg"}
                        alt={equipment.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="scale-75 opacity-0 group-hover:opacity-100 group-hover:scale-100 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full transition-all duration-300 flex items-center gap-2">
                          <Maximize2 className="h-4 w-4" />
                          <span className="text-sm font-medium">Expandir</span>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-muted/50">
                      <Package className="h-24 w-24 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Status Badge Overlay */}
                  <div className="absolute top-4 left-4 z-10">
                    {!equipment.available && (
                      <Badge variant="destructive" className="text-sm px-3 py-1 shadow-lg">Indisponível</Badge>
                    )}
                  </div>
                </div>
              </ScrollReveal>

              {/* Thumbnails */}
              {displayImages.length > 1 && (
                <ScrollReveal delay={0.1}>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                    {displayImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`aspect-square bg-muted rounded-xl overflow-hidden border-2 transition-all relative ${idx === currentImageIndex
                            ? "border-primary shadow-md ring-2 ring-primary/20"
                            : "border-transparent hover:border-primary/50 opacity-70 hover:opacity-100"
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
                </ScrollReveal>
              )}

              {/* Description & Details for Mobile (hidden on desktop, shown on mobile) */}
              <div className="block lg:hidden space-y-6">
                <DescriptionSection equipment={equipment} />
              </div>

              {/* Description & Details for Desktop */}
              <div className="hidden lg:block space-y-8">
                <DescriptionSection equipment={equipment} />
              </div>
            </div>

            {/* Right Column: Key Info & Actions (5 columns) */}
            <div className="lg:col-span-5 space-y-6">
              <ScrollReveal delay={0.2}>
                <div className="bg-card rounded-3xl border-2 shadow-xl p-6 md:p-8 space-y-8 sticky top-24">
                  {/* Title & Price */}
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <Badge className={`${getNegotiationColor(equipment.negotiationType)} text-white border-0 px-3 py-1 mb-3`}>
                          {getNegotiationLabel(equipment.negotiationType)}
                        </Badge>
                        <h1 className="text-3xl font-bold leading-tight">{equipment.name}</h1>
                      </div>
                    </div>

                    {(equipment.brand || equipment.model) && (
                      <div className="text-lg text-muted-foreground mb-6">
                        {equipment.brand} {equipment.model}
                      </div>
                    )}

                    {equipment.price && equipment.price > 0 && (
                      <div className="p-4 bg-muted/50 rounded-2xl border mb-6">
                        <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider mb-1">Valor</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-primary">
                            R$ {equipment.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          {equipment.negotiationType === "rent" && equipment.rentPeriod && (
                            <span className="text-lg text-muted-foreground font-medium">
                              /{equipment.rentPeriod === "day" ? "dia" : equipment.rentPeriod === "week" ? "semana" : "mês"}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Specs Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="p-3 rounded-xl bg-muted/30 border">
                        <span className="text-xs text-muted-foreground block mb-1">Categoria</span>
                        <span className="font-medium">{equipment.category}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/30 border">
                        <span className="text-xs text-muted-foreground block mb-1">Condição</span>
                        <span className="font-medium">{getConditionLabel(equipment.condition)}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/30 border col-span-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-xs text-muted-foreground block">Localização</span>
                          <span className="font-medium">{equipment.city}, {equipment.state}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seller Info */}
                  <div className="pt-8 border-t">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Vendedor</h3>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {equipment.ownerName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-lg">{equipment.ownerName}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Shield className="h-3 w-3 text-green-500" />
                          Perfil Verificado
                        </p>
                      </div>
                      <Link href={`/profissionais/${equipment.ownerId}`} className="ml-auto">
                        <Button variant="ghost" size="sm" className="rounded-full">
                          Ver Perfil
                        </Button>
                      </Link>
                    </div>

                    <div className="space-y-3">
                      {equipment.ownerPhone && (
                        <Button
                          className="w-full h-12 text-base rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg hover:shadow-[#25D366]/20 transition-all duration-300"
                          onClick={() => {
                            let cleanNumber = '';
                            if (equipment.ownerPhoneCountryCode && equipment.ownerPhone) {
                              const code = equipment.ownerPhoneCountryCode.replace(/\D/g, '');
                              const num = equipment.ownerPhone.replace(/\D/g, '');
                              cleanNumber = `${code}${num}`;
                            } else {
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
                          <MessageCircle className="h-5 w-5 mr-2" />
                          Conversar no WhatsApp
                        </Button>
                      )}

                      {userProfile && userProfile.id !== equipment.ownerId && equipment.available ? (
                        <Link href={`/negociar-equipamento/${equipment.id}`} className="block">
                          <Button className="w-full h-12 text-base rounded-xl" variant="outline" size="lg">
                            <MessageSquare className="h-5 w-5 mr-2" />
                            {equipment.negotiationType === "sale" ? "Fazer Proposta na Plataforma" : "Solicitar Pela Plataforma"}
                          </Button>
                        </Link>
                      ) : !userProfile ? (
                        <Link href="/login" className="block">
                          <Button variant="secondary" className="w-full h-12 rounded-xl">
                            Faça login para negociar
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>

          </div>
        </div>
      </main>

      <Footer />

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-6 right-6 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-50"
            >
              <X className="h-8 w-8" />
            </button>

            <motion.img
              key={currentImageIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={displayImages[currentImageIndex] || "/placeholder.svg"}
              alt={equipment.name}
              className="max-w-full max-h-[90vh] object-contain select-none shadow-2xl rounded-sm"
              onClick={(e) => e.stopPropagation()}
            />

            {displayImages.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-6 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <ChevronLeft className="h-10 w-10" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <ChevronRight className="h-10 w-10" />
                </button>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full text-white/90 text-sm font-medium backdrop-blur-md">
                  {currentImageIndex + 1} / {displayImages.length}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DescriptionSection({ equipment }: { equipment: EquipmentDetails }) {
  return (
    <>
      <ScrollReveal delay={0.2}>
        <div className="bg-card rounded-2xl border shadow-sm p-6 md:p-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-primary rounded-full" />
            Descrição
          </h2>
          <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {equipment.description}
          </div>
        </div>
      </ScrollReveal>

      {equipment.additionalConditions && (
        <ScrollReveal delay={0.3}>
          <div className="bg-card rounded-2xl border shadow-sm p-6 md:p-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-orange-500 rounded-full" />
              Condições e Observações
            </h2>
            <div className="p-4 bg-orange-500/10 text-orange-700 dark:text-orange-300 rounded-xl border border-orange-500/20">
              <p className="whitespace-pre-wrap leading-relaxed">{equipment.additionalConditions}</p>
            </div>
          </div>
        </ScrollReveal>
      )}
    </>
  )
}
