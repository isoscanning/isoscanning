"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import apiClient from "@/lib/api-service";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Booking {
  id: string;
  serviceType: string;
  location: string;
  date: string;
  startTime: string;
  notes?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  professionalName?: string;
  clientName?: string;
  createdAt: string;
}

export default function AgendaPage() {
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "confirmed" | "completed"
  >("all");

  useEffect(() => {
    if (!authLoading && !userProfile) {
      router.push("/login");
      return;
    }

    if (userProfile) {
      fetchBookings();
    }
  }, [userProfile, authLoading]);

  const fetchBookings = async () => {
    try {
      console.log("[agenda] Fetching bookings for user:", userProfile?.id);

      // Fetch bookings where user is either professional or client
      const response = await apiClient.get(
        `/bookings?userId=${userProfile?.id}`
      );
      const data = response.data.data || response.data || [];
      setBookings(data);
      console.log("[agenda] Bookings loaded:", data);
    } catch (err) {
      console.error("[agenda] Error fetching bookings:", err);
      setError("Erro ao carregar agendamentos");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendente";
      case "confirmed":
        return "Confirmado";
      case "completed":
        return "Concluído";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  const filteredBookings =
    filterStatus === "all"
      ? bookings
      : bookings.filter((b) => b.status === filterStatus);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Minha Agenda</h1>
            <p className="text-muted-foreground">
              Gerencie seus agendamentos e serviços
            </p>
          </div>

          {error && (
            <Alert
              variant="destructive"
              className="mb-6 border-destructive/50 bg-destructive/5"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mb-6 flex gap-2 flex-wrap">
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              onClick={() => setFilterStatus("all")}
              size="sm"
            >
              Todos ({bookings.length})
            </Button>
            <Button
              variant={filterStatus === "pending" ? "default" : "outline"}
              onClick={() => setFilterStatus("pending")}
              size="sm"
            >
              Pendentes ({bookings.filter((b) => b.status === "pending").length}
              )
            </Button>
            <Button
              variant={filterStatus === "confirmed" ? "default" : "outline"}
              onClick={() => setFilterStatus("confirmed")}
              size="sm"
            >
              Confirmados (
              {bookings.filter((b) => b.status === "confirmed").length})
            </Button>
            <Button
              variant={filterStatus === "completed" ? "default" : "outline"}
              onClick={() => setFilterStatus("completed")}
              size="sm"
            >
              Concluídos (
              {bookings.filter((b) => b.status === "completed").length})
            </Button>
          </div>

          {filteredBookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nenhum agendamento encontrado
                </p>
                <Button onClick={() => router.push("/profissionais")}>
                  Agendar Serviço
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{booking.serviceType}</CardTitle>
                        <CardDescription>
                          {booking.professionalName ||
                            booking.clientName ||
                            "Sem nome"}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(booking.status)}>
                        {getStatusLabel(booking.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Data</p>
                        <p className="font-medium">
                          {format(new Date(booking.date), "dd 'de' MMMM", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Hora</p>
                        <p className="font-medium">{booking.startTime}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Local</p>
                        <p className="font-medium line-clamp-1">
                          {booking.location}
                        </p>
                      </div>
                    </div>
                    {booking.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Observações
                        </p>
                        <p className="text-sm line-clamp-2">{booking.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
