"use client";

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
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import apiClient from "@/lib/api-service";
import type { Professional } from "@/lib/data-service";

export default function OrcamentoPage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile } = useAuth();
  const professionalId = params.id as string;

  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [serviceType, setServiceType] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");

  useEffect(() => {
    if (!userProfile) {
      router.push("/login");
      return;
    }

    fetchProfessional();
  }, [userProfile, professionalId]);

  const fetchProfessional = async () => {
    try {
      console.log(
        "[orcamento] Fetching professional data for id:",
        professionalId
      );

      const profResponse = await apiClient.get(`/profiles/${professionalId}`);
      setProfessional(profResponse.data);
      console.log("[orcamento] Professional loaded:", profResponse.data);
    } catch (error) {
      console.error("[orcamento] Error fetching professional:", error);
      setError("Profissional não encontrado");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!serviceType || !serviceDate || !location || !description) {
      setError("Preencha todos os campos obrigatórios");
      setSubmitting(false);
      return;
    }

    try {
      const response = await apiClient.post("/quote-requests", {
        professionalId,
        professionalName: professional?.displayName,
        clientId: userProfile?.id,
        clientName: userProfile?.displayName,
        clientEmail: userProfile?.email,
        serviceType,
        serviceDate,
        location,
        description,
        budget: budget ? parseFloat(budget) : null,
        status: "pending",
      });

      console.log("[orcamento] Quote request created:", response.data);
      setSuccess(true);

      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      console.error("[orcamento] Error creating quote request:", err);
      setError(
        err.response?.data?.message ||
          "Erro ao enviar solicitação de orçamento. Tente novamente."
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
            <h1 className="text-3xl font-bold mb-2">Solicitar Orçamento</h1>
            <p className="text-muted-foreground">
              Solicit um orçamento para {professional.displayName}
            </p>
          </div>

          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Solicitação de orçamento enviada com sucesso! Redirecionando...
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
              <CardTitle>Informações do Orçamento</CardTitle>
              <CardDescription>
                Descreva o serviço que você precisa
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
                  <Label htmlFor="serviceDate">Data Desejada</Label>
                  <Input
                    id="serviceDate"
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
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
                  <Label htmlFor="description">Descrição do Projeto</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva em detalhes o que você precisa..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Orçamento Esperado (opcional)</Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="0.00"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    step="0.01"
                    min="0"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || loading}
                >
                  {submitting ? "Enviando..." : "Enviar Solicitação"}
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
