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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import apiClient from "@/lib/api-service";

interface Availability {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  type: "available" | "unavailable";
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

export default function DisponibilidadePage() {
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [newDate, setNewDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [availabilityType, setAvailabilityType] = useState<
    "available" | "unavailable"
  >("available");

  useEffect(() => {
    if (
      !authLoading &&
      (!userProfile || userProfile.userType !== "professional")
    ) {
      router.push("/dashboard");
      return;
    }

    if (userProfile) {
      fetchAvailabilities();
    }
  }, [userProfile, authLoading]);

  const fetchAvailabilities = async () => {
    try {
      console.log(
        "[disponibilidade] Fetching availabilities for professional:",
        userProfile?.id
      );

      const response = await apiClient.get(
        `/availability?professionalId=${userProfile?.id}`
      );
      const data = response.data.data || response.data || [];
      setAvailabilities(data);
      console.log("[disponibilidade] Availabilities loaded:", data);
    } catch (err) {
      console.error("[disponibilidade] Error fetching availabilities:", err);
      setError("Erro ao carregar disponibilidades");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!newDate || !startTime || !endTime) {
      setError("Preencha todos os campos");
      setSubmitting(false);
      return;
    }

    try {
      const response = await apiClient.post("/availability", {
        professionalId: userProfile?.id,
        date: newDate,
        startTime,
        endTime,
        type: availabilityType,
      });

      console.log("[disponibilidade] Availability created:", response.data);
      setSuccess(true);

      // Reset form
      setNewDate("");
      setStartTime("");
      setEndTime("");
      setAvailabilityType("available");

      // Refresh list
      await fetchAvailabilities();

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("[disponibilidade] Error creating availability:", err);
      setError(
        err.response?.data?.message ||
          "Erro ao adicionar disponibilidade. Tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar esta disponibilidade?")) {
      return;
    }

    try {
      await apiClient.delete(`/availability/${id}`);
      console.log("[disponibilidade] Availability deleted:", id);

      // Refresh list
      await fetchAvailabilities();
    } catch (err: any) {
      console.error("[disponibilidade] Error deleting availability:", err);
      setError("Erro ao deletar disponibilidade");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userProfile?.userType !== "professional") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">
                Esta página é apenas para profissionais
              </p>
              <Button onClick={() => router.push("/dashboard")}>
                Voltar para Dashboard
              </Button>
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
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              Gerenciar Disponibilidade
            </h1>
            <p className="text-muted-foreground">
              Controle suas datas e horários disponíveis para agendamentos
            </p>
          </div>

          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Disponibilidade adicionada com sucesso!
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

          <div className="grid md:grid-cols-2 gap-6">
            {/* Form to add availability */}
            <Card>
              <CardHeader>
                <CardTitle>Adicionar Disponibilidade</CardTitle>
                <CardDescription>
                  Configure seus horários disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddAvailability} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startTime">Hora de Início</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime">Hora de Término</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Select
                      value={availabilityType}
                      onValueChange={(value: any) => setAvailabilityType(value)}
                    >
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Disponível</SelectItem>
                        <SelectItem value="unavailable">
                          Indisponível
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting || loading}
                  >
                    {submitting ? "Adicionando..." : "Adicionar"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Availabilities list */}
            <Card>
              <CardHeader>
                <CardTitle>Suas Disponibilidades</CardTitle>
                <CardDescription>
                  Total: {availabilities.length} registros
                </CardDescription>
              </CardHeader>
              <CardContent>
                {availabilities.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">
                    Nenhuma disponibilidade registrada
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {availabilities.map((avail) => (
                      <div
                        key={avail.id}
                        className="flex justify-between items-start p-3 border rounded-lg hover:bg-accent/50"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {new Date(avail.date).toLocaleDateString("pt-BR")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {avail.startTime} - {avail.endTime}
                          </p>
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                              avail.type === "available"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {avail.type === "available"
                              ? "Disponível"
                              : "Indisponível"}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAvailability(avail.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
