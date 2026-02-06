"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { trackEvent } from "@/lib/analytics"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, MapPin, Filter, X, Package, Camera, Sparkles, ArrowRight, ShoppingBag, Tag, Zap } from "lucide-react"
import Link from "next/link"
import { fetchEquipments } from "@/lib/data-service"
import { ScrollReveal } from "@/components/scroll-reveal"
import { CountUp } from "@/components/typing-text"
import { motion, AnimatePresence } from "framer-motion"

interface Equipment {
  id: string
  name: string
  category: string
  negotiationType: "sale" | "rent" | "free"
  condition: "new" | "used" | "refurbished"
  price?: number
  rentPeriod?: "day" | "week" | "month"
  city: string
  state: string
  imageUrl?: string
  imageUrls?: string[]
  ownerId: string
  ownerName: string
  isAvailable: boolean
}

const CATEGORIAS = [
  "Todas",
  "Câmeras",
  "Lentes",
  "Iluminação",
  "Áudio",
  "Drones",
  "Tripés e Suportes",
  "Acessórios",
  "Edição",
]

const ESTADOS = [
  "Todos", "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]

export default function EquipamentosPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Todas")
  const [selectedNegotiation, setSelectedNegotiation] = useState("all")
  const [selectedCondition, setSelectedCondition] = useState("all")
  const [selectedState, setSelectedState] = useState("Todos")
  const [selectedCity, setSelectedCity] = useState("")

  useEffect(() => {
    loadEquipments()
  }, [])

  const loadEquipments = async () => {
    setLoading(true)
    try {
      const data = await fetchEquipments()
      const mappedData = data.map((item: any) => ({
        ...item,
        imageUrl: item.imageUrls?.[0] || item.imageUrl,
      }))
      setEquipments(mappedData as any)
    } catch (error) {
      console.error("[v0] Error loading equipments:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEquipments = equipments.filter((equip) => {
    const matchesSearch =
      searchTerm === "" ||
      equip.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equip.category?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "Todas" || equip.category === selectedCategory
    const matchesNegotiation = selectedNegotiation === "all" || equip.negotiationType === selectedNegotiation
    const matchesCondition = selectedCondition === "all" || equip.condition === selectedCondition
    const matchesState = selectedState === "Todos" || equip.state === selectedState
    const matchesCity = selectedCity === "" || equip.city?.toLowerCase().includes(selectedCity.toLowerCase())
    return matchesSearch && matchesCategory && matchesNegotiation && matchesCondition && matchesState && matchesCity
  })

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedCategory("Todas")
    setSelectedNegotiation("all")
    setSelectedCondition("all")
    setSelectedState("Todos")
    setSelectedCity("")
    trackEvent({ action: "filter", category: "Equipment", label: "Clear Filters" })
  }

  const hasActiveFilters = selectedCategory !== "Todas" || selectedNegotiation !== "all" || selectedCondition !== "all" || selectedState !== "Todos" || selectedCity !== ""

  useEffect(() => {
    if (selectedCategory !== "Todas") trackEvent({ action: "filter", category: "Equipment", label: `Category: ${selectedCategory}` })
  }, [selectedCategory])

  useEffect(() => {
    if (selectedNegotiation !== "all") trackEvent({ action: "filter", category: "Equipment", label: `Type: ${selectedNegotiation}` })
  }, [selectedNegotiation])

  useEffect(() => {
    if (selectedCondition !== "all") trackEvent({ action: "filter", category: "Equipment", label: `Condition: ${selectedCondition}` })
  }, [selectedCondition])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) trackEvent({ action: "search", category: "Equipment", label: searchTerm })
    }, 1000)
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

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
      case "sale": return "bg-green-500"
      case "rent": return "bg-blue-500"
      case "free": return "bg-purple-500"
      default: return "bg-gray-500"
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-28 overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50/50 to-orange-50 dark:from-purple-950/30 dark:via-pink-950/20 dark:to-orange-950/30" />

          {/* Animated gradient orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-pink-400/20 dark:bg-pink-500/10 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 max-w-5xl relative z-10">
            <ScrollReveal>
              <div className="text-center mb-12">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-sm font-medium mb-6">
                  <ShoppingBag className="h-4 w-4" />
                  Marketplace de Equipamentos
                </span>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
                  <span className="text-foreground">Equipamentos </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 dark:from-purple-400 dark:via-pink-400 dark:to-orange-400">
                    profissionais
                  </span>
                  <br />
                  <span className="text-foreground">para seu projeto</span>
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                  Encontre câmeras, lentes e equipamentos para venda ou aluguel.
                  Negocie diretamente com outros profissionais.
                </p>
              </div>
            </ScrollReveal>

            {/* Search Bar */}
            <ScrollReveal delay={0.2}>
              <div className="bg-background/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-primary/10 border-2 p-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar equipamentos... (ex: Sony A7III, Canon 50mm)"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 h-12 text-base rounded-xl border-2"
                    />
                  </div>
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    onClick={() => setShowFilters(!showFilters)}
                    className="h-12 px-6 rounded-xl"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                    {hasActiveFilters && (
                      <span className="ml-2 w-2 h-2 bg-primary rounded-full" />
                    )}
                  </Button>
                </div>
              </div>
            </ScrollReveal>

            {/* Quick Stats */}
            <ScrollReveal delay={0.4}>
              <div className="flex flex-wrap justify-center gap-8 mt-10 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-purple-500" />
                  <span><CountUp end={1200} duration={1.5} />+ Equipamentos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-green-500" />
                  <span>Vendas e Aluguéis</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <span>Negociação Direta</span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-b bg-muted/30"
            >
              <div className="container mx-auto max-w-7xl px-4 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Categoria</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tipo</Label>
                    <Select value={selectedNegotiation} onValueChange={setSelectedNegotiation}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="sale">Venda</SelectItem>
                        <SelectItem value="rent">Aluguel</SelectItem>
                        <SelectItem value="free">Gratuito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Condição</Label>
                    <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="new">Novo</SelectItem>
                        <SelectItem value="refurbished">Seminovo</SelectItem>
                        <SelectItem value="used">Usado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estado</Label>
                    <Select value={selectedState} onValueChange={setSelectedState}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS.map((estado) => (
                          <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cidade</Label>
                    <Input
                      placeholder="Digite a cidade"
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="flex justify-end mt-4">
                    <Button variant="ghost" onClick={clearFilters} size="sm" className="text-muted-foreground">
                      <X className="h-4 w-4 mr-2" />
                      Limpar filtros
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-7xl">
            {/* Results Header */}
            <ScrollReveal>
              <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    Equipamentos Disponíveis
                  </h2>
                  <p className="text-muted-foreground">
                    {loading ? "Carregando..." : `${filteredEquipments.length} equipamentos encontrados`}
                  </p>
                </div>

                {/* Active Filters Pills */}
                {hasActiveFilters && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedCategory !== "Todas" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full text-sm font-medium">
                        {selectedCategory}
                        <button onClick={() => setSelectedCategory("Todas")} className="ml-1 hover:bg-purple-500/20 rounded-full p-0.5">×</button>
                      </span>
                    )}
                    {selectedNegotiation !== "all" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-sm font-medium">
                        {getNegotiationLabel(selectedNegotiation)}
                        <button onClick={() => setSelectedNegotiation("all")} className="ml-1 hover:bg-green-500/20 rounded-full p-0.5">×</button>
                      </span>
                    )}
                    {selectedState !== "Todos" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                        <MapPin className="h-3.5 w-3.5" />
                        {selectedState}
                        <button onClick={() => setSelectedState("Todos")} className="ml-1 hover:bg-blue-500/20 rounded-full p-0.5">×</button>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </ScrollReveal>

            {/* Loading State */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse border-2 overflow-hidden">
                    <div className="aspect-[4/3] bg-muted" />
                    <CardContent className="pt-4 space-y-3">
                      <div className="h-5 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="h-6 bg-muted rounded w-1/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredEquipments.length === 0 ? (
              /* Empty State */
              <ScrollReveal>
                <div className="text-center py-20">
                  <div className="h-24 w-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                    <Package className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Nenhum equipamento encontrado</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Não encontramos equipamentos com os filtros selecionados.
                    Tente ajustar sua busca.
                  </p>
                  <Button variant="outline" onClick={clearFilters} className="rounded-full">
                    Limpar Filtros
                  </Button>
                </div>
              </ScrollReveal>
            ) : (
              /* Equipment Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEquipments.map((equip, index) => (
                  <motion.div
                    key={equip.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card className="group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-2 hover:border-primary/30 overflow-hidden bg-card h-full">
                      <Link href={`/equipamentos/${equip.id}`}>
                        {/* Image Area */}
                        <div className="aspect-[4/3] bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
                          {equip.imageUrl || (equip.imageUrls && equip.imageUrls.length > 0) ? (
                            <img
                              src={equip.imageUrl || equip.imageUrls?.[0] || "/placeholder.svg"}
                              alt={equip.name}
                              className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Camera className="h-16 w-16 text-muted-foreground/40" />
                            </div>
                          )}

                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                          {/* Negotiation Badge */}
                          <div className="absolute top-4 right-4">
                            <span className={`inline-flex items-center px-3 py-1.5 ${getNegotiationColor(equip.negotiationType)} text-white text-xs font-bold rounded-full uppercase tracking-wide shadow-lg`}>
                              {getNegotiationLabel(equip.negotiationType)}
                            </span>
                          </div>

                          {/* View Details Overlay */}
                          <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                            <span className="inline-flex items-center gap-2 text-white font-medium">
                              Ver Detalhes
                              <ArrowRight className="h-4 w-4" />
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <CardContent className="p-5">
                          <h3 className="font-bold text-lg text-foreground mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                            {equip.name}
                          </h3>

                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="secondary" className="rounded-full text-xs">
                              {equip.category}
                            </Badge>
                            <Badge variant="outline" className="rounded-full text-xs">
                              {getConditionLabel(equip.condition)}
                            </Badge>
                          </div>

                          {equip.price && equip.price > 0 && (
                            <p className="text-2xl font-bold text-primary mb-3">
                              R$ {equip.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              {equip.negotiationType === "rent" && equip.rentPeriod && (
                                <span className="text-sm font-normal text-muted-foreground">
                                  /{equip.rentPeriod === "day" ? "dia" : equip.rentPeriod === "week" ? "semana" : "mês"}
                                </span>
                              )}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-3 border-t text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{equip.city}, {equip.state}</span>
                            </div>
                            <span className="text-xs">Por: {equip.ownerName}</span>
                          </div>
                        </CardContent>
                      </Link>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 dark:from-purple-700 dark:via-pink-700 dark:to-orange-700">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="max-w-3xl mx-auto text-center text-white">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Tem equipamentos para vender ou alugar?
                </h2>
                <p className="text-lg text-white/90 mb-8">
                  Anuncie seus equipamentos gratuitamente e alcance milhares
                  de profissionais interessados.
                </p>
                <Link href="/dashboard/equipamentos" onClick={() => trackEvent({ action: 'click_cta', category: 'Equipment', label: 'Post Equipment Footer' })}>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-14 px-10 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300"
                  >
                    Anunciar Equipamento
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
