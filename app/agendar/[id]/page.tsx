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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AlertCircle, CheckCircle2, CalendarIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { doc, getDoc, addDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function AgendarServicoPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const professionalId = params.id as string

  const [professional, setProfessional] = useState<any>(null)
  const [availableDates, setAvailableDates] = useState<Date[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const [selectedDate, setSelectedDate] = useState<Date>()
  const [startTime, setStartTime] = useState("")
  const [serviceType, setServiceType] = useState("")
  const [location, setLocation] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    fetchData()
  }, [user, professionalId])

  const fetchData = async () => {
    try {
      // Fetch professional
      const profDoc = await getDoc(doc(db, "users", professionalId))
      if (profDoc.exists()) {
        setProfessional({ uid: profDoc.id, ...profDoc.data() })
      }

      // Fetch available dates
      const availRef = collection(db, "availability")
      const availQuery = query(
        availRef,
        where("professionalId", "==", professionalId),
        where("type", "==", "available"),
      )
      const availSnapshot = await getDocs(availQuery)
      const dates: Date[] = []
      availSnapshot.forEach((doc) => {
        const data = doc.data()
        dates.push(data.date.toDate())
      })
      setAvailableDates(dates)
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)

    if (!selectedDate) {
      setError("Selecione uma data")
      setSubmitting(false)
      return
    }

    try {
      await addDoc(collection(db, "bookings"), {
        professionalId,
        professionalName: professional.displayName,
        clientId: user?.uid,
        clientName: userProfile?.displayName,
        clientEmail: userProfile?.email,
        date: Timestamp.fromDate(selectedDate),
        startTime,
        serviceType,
        location,
        notes,
        status: "pending",
        createdAt: Timestamp.now(),
      })

      setSuccess(true)
      setTimeout(() => {
        router.push("/dashboard/solicitacoes")
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Erro ao criar agendamento.")
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
            <h1 className="text-3xl font-bold">Agendar Serviço</h1>
            <p className="text-muted-foreground mt-2">
              Agende um serviço com {professional.artisticName || professional.displayName}
            </p>
          </div>

          {success && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Agendamento solicitado com sucesso! Redirecionando...</AlertDescription>
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
                <CardTitle>Detalhes do Agendamento</CardTitle>
                <CardDescription>Preencha as informações do serviço</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Data Disponível *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : "Selecione uma data disponível"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => !availableDates.some((d) => isSameDay(d, date))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Apenas datas com disponibilidade do profissional podem ser selecionadas
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Horário Desejado *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceType">Tipo de Serviço *</Label>
                  <Input
                    id="serviceType"
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    placeholder="Ex: Ensaio fotográfico, Vídeo de casamento..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Local *</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Endereço ou local do serviço"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Informações adicionais sobre o serviço..."
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting || success}>
                    {submitting ? "Enviando..." : "Solicitar Agendamento"}
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
