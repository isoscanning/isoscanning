"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AlertCircle, CheckCircle2, CalendarIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import apiClient from "@/lib/api-service";
import type { Professional } from "@/lib/data-service";

export default function AgendarServicoPage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile } = useAuth();
  const professionalId = params.id as string;

  const [professional, setProfessional] = useState<Professional | null>(null);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [selectedDate, setSelectedDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!userProfile) {
      router.push("/login");
      return;
    }

    fetchData();
  }, [userProfile, professionalId]);

  const fetchData = async () => {
    try {
      console.log(
        "[agendar] Fetching professional data for id:",
        professionalId
      );

      // Fetch professional
      const profResponse = await apiClient.get(`/profiles/${professionalId}`);
      setProfessional(profResponse.data);
      console.log("[agendar] Professional loaded:", profResponse.data);

      // Fetch available dates for this professional
      try {
        const availResponse = await apiClient.get(
          `/availability?professionalId=${professionalId}&type=available`
        );
        const availableDatesData = (availResponse.data.data || []).map(
          (avail: any) => new Date(avail.date)
        );
        setAvailableDates(availableDatesData);
        console.log("[agendar] Available dates loaded:", availableDatesData);
      } catch (error) {
        console.error("[agendar] Error fetching availability:", error);
      }
    } catch (error) {
      console.error("[agendar] Error fetching data:", error);
      setError("Erro ao carregar dados do profissional");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!selectedDate) {
      setError("Selecione uma data");
      setSubmitting(false);
      return;
    }

    if (!startTime) {
      setError("Selecione uma hora");
      setSubmitting(false);
      return;
    }

    if (!serviceType) {
      setError("Selecione um tipo de serviço");
      setSubmitting(false);
      return;
    }

    if (!location) {
      setError("Informe a localização");
      setSubmitting(false);
      return;
    }

    try {
      const response = await apiClient.post("/bookings", {
        professionalId,
        professionalName: professional?.displayName,
        clientId: userProfile?.id,
        clientName: userProfile?.displayName,
        clientEmail: userProfile?.email,
        serviceType,
        location,
        notes,
        date: format(selectedDate, "yyyy-MM-dd"),
        startTime,
        status: "pending",
      });

      console.log("[agendar] Booking created:", response.data);
      setSuccess(true);

      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      console.error("[agendar] Error creating booking:", err);
      setError(
        err.response?.data?.message ||
          "Erro ao agendar serviço. Tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">
                Profissional não encontrado
              </p>
              <Button onClick={() => router.back()}>Voltar</Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Agendar Serviço</h1>
            <p className="text-muted-foreground">
              Agende um serviço com {professional.displayName}
            </p>
          </div>

          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Agendamento realizado com sucesso! Redirecionando...
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert
              variant="destructive"
              className="mb-6 border-destructive/50 bg-destructive/5"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Agendamento</CardTitle>
              <CardDescription>
                Preencha os dados para agendar o serviço
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="serviceType">Tipo de Serviço</Label>
                  <Input
                    id="serviceType"
                    placeholder="Ex: Fotografia, Vídeo, Edição..."
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Localização</Label>
                  <Input
                    id="location"
                    placeholder="Endereço ou local do serviço"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate
                          ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", {
                              locale: ptBR,
                            })
                          : "Selecione uma data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) =>
                          !availableDates.some((d) => isSameDay(d, date))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Hora</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Informações adicionais sobre o serviço..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || loading}
                >
                  {submitting ? "Agendando..." : "Agendar Serviço"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
