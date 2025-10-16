"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, MapPin } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import { format } from "date-fns"

interface Request {
  id: string
  type: "quote" | "booking"
  professionalName: string
  serviceType: string
  date?: Date
  location: string
  status: string
  createdAt: Date
}

export default function MinhasSolicitacoesPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [requests, setRequests] = useState<Request[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }

    if (user) {
      fetchRequests()
    }
  }, [user, loading, router])

  const fetchRequests = async () => {
    if (!user || !db) return

    setLoadingData(true)
    try {
      const allRequests: Request[] = []

      const quotesRef = collection(db, "quoteRequests")
      const quotesQuery = query(quotesRef, where("clientId", "==", user.uid))
      const quotesSnap = await getDocs(quotesQuery)

      quotesSnap.forEach((doc) => {
        const data = doc.data()
        allRequests.push({
          id: doc.id,
          type: "quote",
          professionalName: data.professionalName,
          serviceType: data.serviceType,
          date: data.serviceDate ? new Date(data.serviceDate) : undefined,
          location: data.location,
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date(),
        })
      })

      const bookingsRef = collection(db, "bookings")
      const bookingsQuery = query(bookingsRef, where("clientId", "==", user.uid))
      const bookingsSnap = await getDocs(bookingsQuery)

      bookingsSnap.forEach((doc) => {
        const data = doc.data()
        allRequests.push({
          id: doc.id,
          type: "booking",
          professionalName: data.professionalName,
          serviceType: data.serviceType,
          date: data.date ? new Date(data.date) : undefined,
          location: data.location,
          status: data.status,
          createdAt: data.createdAt?.toDate() || new Date(),
        })
      })

      // Sort by creation date
      allRequests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      setRequests(allRequests)
    } catch (error) {
      console.error("[v0] Error fetching requests:", error)
    } finally {
      setLoadingData(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pendente</Badge>
      case "confirmed":
        return <Badge>Confirmado</Badge>
      case "completed":
        return <Badge variant="outline">Concluído</Badge>
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const quoteRequests = requests.filter((r) => r.type === "quote")
  const bookings = requests.filter((r) => r.type === "booking")

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Minhas Solicitações</h1>
            <p className="text-muted-foreground mt-2">Acompanhe seus orçamentos e agendamentos</p>
          </div>

          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Todas ({requests.length})</TabsTrigger>
              <TabsTrigger value="quotes">Orçamentos ({quoteRequests.length})</TabsTrigger>
              <TabsTrigger value="bookings">Agendamentos ({bookings.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-6">
              {requests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Você ainda não fez nenhuma solicitação</p>
                  </CardContent>
                </Card>
              ) : (
                requests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{request.professionalName}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{request.serviceType}</p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {request.date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{format(request.date, "dd/MM/yyyy")}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{request.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Solicitado em {format(request.createdAt, "dd/MM/yyyy 'às' HH:mm")}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="quotes" className="space-y-4 mt-6">
              {quoteRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Nenhuma solicitação de orçamento</p>
                  </CardContent>
                </Card>
              ) : (
                quoteRequests.map((request) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{request.professionalName}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{request.serviceType}</p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {request.date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{format(request.date, "dd/MM/yyyy")}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{request.location}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="bookings" className="space-y-4 mt-6">
              {bookings.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Nenhum agendamento</p>
                  </CardContent>
                </Card>
              ) : (
                bookings.map((request) => (
                  <Card key={request.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{request.professionalName}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{request.serviceType}</p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {request.date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{format(request.date, "dd/MM/yyyy")}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{request.location}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  )
}
