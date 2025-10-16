"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, MapPin, Filter, X, Package } from "lucide-react"
import Link from "next/link"
import { fetchEquipments } from "@/lib/data-service"

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
  ownerId: string
  ownerName: string
  available: boolean
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
  "Todos",
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
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
      setEquipments(data as any)
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Marketplace de Equipamentos</h1>
            <p className="text-muted-foreground">Encontre câmeras, lentes e equipamentos para venda ou aluguel</p>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar equipamentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Negociação</Label>
                    <Select value={selectedNegotiation} onValueChange={setSelectedNegotiation}>
                      <SelectTrigger>
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
                    <Label>Condição</Label>
                    <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                      <SelectTrigger>
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
                    <Label>Estado</Label>
                    <Select value={selectedState} onValueChange={setSelectedState}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS.map((estado) => (
                          <SelectItem key={estado} value={estado}>
                            {estado}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input
                      placeholder="Digite a cidade"
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <Button variant="ghost" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Limpar filtros
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          <div className="mb-4 text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${filteredEquipments.length} equipamentos encontrados`}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-video bg-muted"></div>
                  <CardContent className="pt-4">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredEquipments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum equipamento encontrado com os filtros aplicados.</p>
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Limpar filtros
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEquipments.map((equip) => (
                <Card key={equip.id} className="hover:border-primary transition-colors overflow-hidden">
                  <Link href={`/equipamentos/${equip.id}`}>
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      {equip.imageUrl ? (
                        <img
                          src={equip.imageUrl || "/placeholder.svg"}
                          alt={equip.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Package className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge variant={equip.negotiationType === "free" ? "secondary" : "default"}>
                          {getNegotiationLabel(equip.negotiationType)}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="pt-4 space-y-2">
                      <h3 className="font-semibold text-lg line-clamp-1">{equip.name}</h3>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{equip.category}</Badge>
                        <Badge variant="outline">{getConditionLabel(equip.condition)}</Badge>
                      </div>

                      {equip.price && equip.price > 0 && (
                        <p className="text-lg font-bold text-primary">
                          R$ {equip.price.toFixed(2)}
                          {equip.negotiationType === "rent" && equip.rentPeriod && (
                            <span className="text-sm font-normal text-muted-foreground">
                              /{equip.rentPeriod === "day" ? "dia" : equip.rentPeriod === "week" ? "semana" : "mês"}
                            </span>
                          )}
                        </p>
                      )}

                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>
                          {equip.city}, {equip.state}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground">Por: {equip.ownerName}</p>

                      <Button className="w-full mt-2">Ver Detalhes</Button>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
