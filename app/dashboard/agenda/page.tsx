"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarIcon, Clock, Plus } from "lucide-react"
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"

interface Availability {
  id: string
  date: Date
  startTime: string
  endTime: string
  type: "available" | "blocked"
  reason?: string
}

interface Booking {
  id: string
  clientName: string
  serviceType: string
  date: Date
  startTime: string
  location: string
  status: "pending" | "confirmed" | "completed" | "cancelled"
}

export default function AgendaPage() {
  const router = useRouter()
  const { user, userProfile, loading } = useAuth()

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }

    if (user && userProfile?.userType === "professional") {
      fetchData()
    }
  }, [user, userProfile, loading, router])

  const fetchData = async () => {
    if (!user) return

    setLoadingData(true)
    try {
      // Fetch availabilities
      const availRef = collection(db, "availability")
      const availQuery = query(availRef, where("professionalId", "==", user.uid))
      const availSnapshot = await getDocs(availQuery)
      const availData: Availability[] = []
      availSnapshot.forEach((doc) => {
        const data = doc.data()
        availData.push({
          id: doc.id,
          date: data.date.toDate(),
          startTime: data.startTime,
          endTime: data.endTime,
          type: data.type,
          reason: data.reason,
        })
      })
      setAvailabilities(availData)

      // Fetch bookings
      const bookingsRef = collection(db, "bookings")
      const bookingsQuery = query(bookingsRef, where("professionalId", "==", user.uid))
      const bookingsSnapshot = await getDocs(bookingsQuery)
      const bookingsData: Booking[] = []
      bookingsSnapshot.forEach((doc) => {
        const data = doc.data()
        bookingsData.push({
          id: doc.id,
          clientName: data.clientName,
          serviceType: data.serviceType,
          date: data.date.toDate(),
          startTime: data.startTime,
          location: data.location,
          status: data.status,
        })
      })
      setBookings(bookingsData)
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
    } finally {
      setLoadingData(false)
    }
  }

  const getEventsForDate = (date: Date) => {
    const dateAvailabilities = availabilities.filter((a) => isSameDay(a.date, date))
    const dateBookings = bookings.filter((b) => isSameDay(b.date, date))
    return { availabilities: dateAvailabilities, bookings: dateBookings }
  }

  const selectedDateEvents = getEventsForDate(selectedDate)

  const handleDeleteAvailability = async (id: string) => {
    if (!confirm("Deseja remover esta disponibilidade?")) return

    try {
      await deleteDoc(doc(db, "availability", id))
      setAvailabilities(availabilities.filter((a) => a.id !== id))
    } catch (error) {
      console.error("[v0] Error deleting availability:", error)
      alert("Erro ao remover disponibilidade")
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || !userProfile || userProfile.userType !== "professional") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Acesso restrito a profissionais</p>
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
        <div className="container mx-auto max-w-7xl space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Minha Agenda</h1>
              <p className="text-muted-foreground mt-2">Gerencie sua disponibilidade e agendamentos</p>
            </div>
            <Link href="/dashboard/agenda/disponibilidade">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Disponibilidade
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendar */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Calendário</CardTitle>
                <CardDescription>Selecione uma data para ver detalhes</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                  modifiers={{
                    booked: bookings.map((b) => b.date),
                    available: availabilities.filter((a) => a.type === "available").map((a) => a.date),
                    blocked: availabilities.filter((a) => a.type === "blocked").map((a) => a.date),
                  }}
                  modifiersStyles={{
                    booked: { backgroundColor: "hsl(var(--primary))", color: "white" },
                    available: { backgroundColor: "hsl(var(--primary) / 0.2)" },
                    blocked: { backgroundColor: "hsl(var(--destructive) / 0.2)" },
                  }}
                />

                <div className="flex flex-wrap gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-primary"></div>
                    <span>Com agendamento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-primary/20"></div>
                    <span>Disponível</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-destructive/20"></div>
                    <span>Bloqueado</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected Date Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="bookings">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="bookings">Agendamentos</TabsTrigger>
                    <TabsTrigger value="availability">Disponibilidade</TabsTrigger>
                  </TabsList>

                  <TabsContent value="bookings" className="space-y-3 mt-4">
                    {selectedDateEvents.bookings.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum agendamento</p>
                    ) : (
                      selectedDateEvents.bookings.map((booking) => (
                        <Card key={booking.id}>
                          <CardContent className="pt-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold">{booking.clientName}</p>
                              <Badge
                                variant={
                                  booking.status === "confirmed"
                                    ? "default"
                                    : booking.status === "pending"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {booking.status === "confirmed"
                                  ? "Confirmado"
                                  : booking.status === "pending"
                                    ? "Pendente"
                                    : booking.status === "completed"
                                      ? "Concluído"
                                      : "Cancelado"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{booking.serviceType}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{booking.startTime}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{booking.location}</p>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="availability" className="space-y-3 mt-4">
                    {selectedDateEvents.availabilities.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-3">Nenhuma disponibilidade configurada</p>
                        <Link href="/dashboard/agenda/disponibilidade">
                          <Button size="sm" variant="outline">
                            Adicionar
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      selectedDateEvents.availabilities.map((avail) => (
                        <Card key={avail.id}>
                          <CardContent className="pt-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant={avail.type === "available" ? "default" : "destructive"}>
                                {avail.type === "available" ? "Disponível" : "Bloqueado"}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAvailability(avail.id)}
                                className="h-8 w-8 p-0"
                              >
                                ×
                              </Button>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-3 w-3" />
                              <span>
                                {avail.startTime} - {avail.endTime}
                              </span>
                            </div>
                            {avail.reason && <p className="text-sm text-muted-foreground">{avail.reason}</p>}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Próximos Agendamentos</CardTitle>
              <CardDescription>Seus agendamentos confirmados</CardDescription>
            </CardHeader>
            <CardContent>
              {bookings.filter((b) => b.status === "confirmed" && b.date >= new Date()).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum agendamento confirmado</p>
              ) : (
                <div className="space-y-3">
                  {bookings
                    .filter((b) => b.status === "confirmed" && b.date >= new Date())
                    .sort((a, b) => a.date.getTime() - b.date.getTime())
                    .slice(0, 5)
                    .map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <p className="font-semibold">{booking.clientName}</p>
                              <p className="text-sm text-muted-foreground">{booking.serviceType}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  <span>{format(booking.date, "dd/MM/yyyy")}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{booking.startTime}</span>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">{booking.location}</p>
                            </div>
                            <Badge>Confirmado</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
