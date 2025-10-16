"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, DollarSign } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore"

export default function NegociarEquipamentoPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [equipment, setEquipment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    message: "",
    proposedPrice: "",
    startDate: "",
    endDate: "",
    contactPhone: "",
  })

  useEffect(() => {
    loadEquipment()
  }, [params.id])

  const loadEquipment = async () => {
    try {
      if (!db) {
        console.error("[v0] Firebase not configured")
        return
      }

      const equipRef = doc(db, "equipments", params.id as string)
      const equipSnap = await getDoc(equipRef)

      if (equipSnap.exists()) {
        setEquipment({ id: equipSnap.id, ...equipSnap.data() })
      }
    } catch (error) {
      console.error("[v0] Error loading equipment:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      alert("Você precisa estar logado para fazer uma proposta")
      router.push("/login")
      return
    }

    if (!db) {
      alert("Firebase não está configurado")
      return
    }

    setSubmitting(true)

    try {
      await addDoc(collection(db, "equipmentProposals"), {
        equipmentId: params.id as string,
        equipmentName: equipment.name,
        buyerId: user.uid,
        buyerName: user.displayName || user.email || "Usuário",
        sellerId: equipment.ownerId,
        message: formData.message,
        proposedPrice: formData.proposedPrice ? Number.parseFloat(formData.proposedPrice) : null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        contactPhone: formData.contactPhone,
        status: "pending",
        createdAt: serverTimestamp(),
      })

      alert("Proposta enviada com sucesso! O vendedor entrará em contato.")
      router.push("/dashboard/solicitacoes")
    } catch (error) {
      console.error("[v0] Error submitting proposal:", error)
      alert("Erro ao enviar proposta. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando equipamento...</p>
        </div>
      </div>
    )
  }

  if (!equipment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Equipamento não encontrado</CardTitle>
            <CardDescription>O equipamento que você está procurando não existe.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/equipamentos">Voltar para Equipamentos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const negotiationType =
    equipment.negotiationType === "sale" ? "Compra" : equipment.negotiationType === "rent" ? "Aluguel" : "Disponível"

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link href={`/equipamentos/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Detalhes
          </Link>
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Equipment Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Equipamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video relative bg-muted rounded-lg overflow-hidden">
                <img
                  src={equipment.images?.[0] || "/placeholder.svg?height=300&width=400"}
                  alt={equipment.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h3 className="font-semibold text-lg">{equipment.name}</h3>
                <p className="text-sm text-muted-foreground">{equipment.category}</p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary">{negotiationType}</Badge>
                <Badge variant="outline">{equipment.condition}</Badge>
              </div>

              {equipment.price && (
                <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                  <DollarSign className="h-5 w-5" />
                  R$ {equipment.price.toLocaleString("pt-BR")}
                  {equipment.negotiationType === "rent" && "/dia"}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {equipment.location}
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-1">Vendedor</p>
                <p className="text-sm text-muted-foreground">{equipment.ownerName}</p>
              </div>
            </CardContent>
          </Card>

          {/* Proposal Form */}
          <Card>
            <CardHeader>
              <CardTitle>Fazer Proposta</CardTitle>
              <CardDescription>Preencha os detalhes da sua proposta. O vendedor entrará em contato.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem *</Label>
                  <Textarea
                    id="message"
                    placeholder="Descreva seu interesse e detalhes da proposta..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={4}
                  />
                </div>

                {equipment.negotiationType === "sale" && (
                  <div className="space-y-2">
                    <Label htmlFor="proposedPrice">Valor Proposto (opcional)</Label>
                    <Input
                      id="proposedPrice"
                      type="number"
                      placeholder="R$ 0,00"
                      value={formData.proposedPrice}
                      onChange={(e) => setFormData({ ...formData, proposedPrice: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Deixe em branco para aceitar o preço anunciado</p>
                  </div>
                )}

                {equipment.negotiationType === "rent" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Data Início</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">Data Fim</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Telefone para Contato *</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    required
                  />
                </div>

                <div className="pt-4">
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Enviando..." : "Enviar Proposta"}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Ao enviar, você concorda em compartilhar suas informações de contato com o vendedor.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
