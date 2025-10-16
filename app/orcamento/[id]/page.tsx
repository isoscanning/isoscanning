"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AlertCircle, CheckCircle2, CalendarIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const TIPOS_SERVICO = [
  "Ensaio Fotográfico",
  "Vídeo de Casamento",
  "Vídeo Institucional",
  "Fotografia de Eventos",
  "Fotografia de Produtos",
  "Edição de Vídeo",
  "Edição de Fotos",
  "Filmagem com Drone",
  "Outro",
]

export default function SolicitarOrcamentoPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const professionalId = params.id as string

  const [professional, setProfessional] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const [serviceType, setServiceType] = useState("")
  const [serviceDate, setServiceDate] = useState<Date>()
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [budget, setBudget] = useState("")

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    fetchProfessional()
  }, [user, professionalId])

  const fetchProfessional = async () => {
    try {
      if (!db) {
        console.error("[v0] Firebase not configured")
        return
      }

      const profRef = doc(db, "users", professionalId)
      const profSnap = await getDoc(profRef)

      if (profSnap.exists()) {
        setProfessional({ uid: profSnap.id, ...profSnap.data() })
      }
    } catch (error) {
      console.error("[v0] Error fetching professional:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)

    if (!db) {
      setError("Firebase não está configurado")
      setSubmitting(false)
      return
    }

    try {
      await addDoc(collection(db, "quoteRequests"), {
        professionalId,
        professionalName: professional.artisticName || professional.displayName,
        clientId: user?.uid || "",
        clientName: userProfile?.displayName || user?.displayName || "Cliente",
        clientEmail: userProfile?.email || user?.email || "",
        serviceType,
        serviceDate: serviceDate?.toISOString() || new Date().toISOString(),
        location,
        description,
        budget: budget ? Number.parseFloat(budget) : null,
        status: "pending",
        createdAt: serverTimestamp(),
      })

      setSuccess(true)
      setTimeout(() => {
        router.push("/dashboard/solicitacoes")
      }, 2000)
    } catch (err: any) {
      console.error("[v0] Error creating quote request:", err)
      setError(err.message || "Erro ao enviar solicitação.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!professional) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Profissional não encontrado</p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-2xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Solicitar Orçamento</h1>
            <p className="text-muted-foreground mt-2">
              Envie uma solicitação para {professional.artisticName || professional.displayName}
            </p>
          </div>

          {success && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Solicitação enviada com sucesso! Redirecionando...</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Serviço</CardTitle>
                <CardDescription>Preencha as informações sobre o serviço desejado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceType">Tipo de Serviço *</Label>
                  <Select value={serviceType} onValueChange={setServiceType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_SERVICO.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data Desejada *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {serviceDate ? format(serviceDate, "PPP", { locale: ptBR }) : "Selecione uma data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={serviceDate}
                        onSelect={setServiceDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Local do Serviço *</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Endereço ou cidade"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição Detalhada *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o que você precisa, quantas pessoas, duração estimada, etc..."
                    rows={5}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Mínimo 30 caracteres</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Orçamento Máximo (opcional)</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="R$ 0,00"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">Apenas como referência</p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting || success}>
                    {submitting ? "Enviando..." : "Enviar Solicitação"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  )
}
