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
import type { Equipment } from "@/lib/data-service";

export default function NegociarEquipamentoPage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile } = useAuth();
  const equipmentId = params.id as string;

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [message, setMessage] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  useEffect(() => {
    if (!userProfile) {
      router.push("/login");
      return;
    }

    fetchEquipment();
  }, [userProfile, equipmentId]);

  const fetchEquipment = async () => {
    try {
      console.log(
        "[negociar-equipamento] Fetching equipment data for id:",
        equipmentId
      );

      const equipResponse = await apiClient.get(`/equipments/${equipmentId}`);
      setEquipment(equipResponse.data);
      console.log(
        "[negociar-equipamento] Equipment loaded:",
        equipResponse.data
      );
    } catch (error) {
      console.error("[negociar-equipamento] Error fetching equipment:", error);
      setError("Equipamento não encontrado");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (!message || !contactPhone) {
      setError("Preencha todos os campos obrigatórios");
      setSubmitting(false);
      return;
    }

    try {
      const response = await apiClient.post("/equipment-proposals", {
        equipmentId,
        equipmentName: equipment?.name,
        buyerId: userProfile?.id,
        buyerName: userProfile?.displayName,
        sellerId: equipment?.ownerId,
        message,
        proposedPrice: proposedPrice ? parseFloat(proposedPrice) : null,
        startDate: startDate || null,
        endDate: endDate || null,
        contactPhone,
        status: "pending",
      });

      console.log("[negociar-equipamento] Proposal created:", response.data);
      setSuccess(true);

      setTimeout(() => {
        router.push("/equipamentos");
      }, 2000);
    } catch (err: any) {
      console.error("[negociar-equipamento] Error creating proposal:", err);
      setError(
        err.response?.data?.message ||
          "Erro ao enviar proposta. Tente novamente."
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

  if (!equipment) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground mb-4">
                Equipamento não encontrado
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
            <h1 className="text-3xl font-bold mb-2">Negociar Equipamento</h1>
            <p className="text-muted-foreground">
              Faça uma proposta para {equipment.name}
            </p>
          </div>

          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Proposta enviada com sucesso! Redirecionando...
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

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Detalhes do Equipamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-semibold">{equipment.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categoria</p>
                <p className="font-semibold">{equipment.category}</p>
              </div>
              {equipment.price && (
                <div>
                  <p className="text-sm text-muted-foreground">Preço</p>
                  <p className="font-semibold">
                    R$ {equipment.price.toLocaleString("pt-BR")}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Tipo de Negócio</p>
                <p className="font-semibold capitalize">
                  {equipment.negotiationType}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sua Proposta</CardTitle>
              <CardDescription>
                Descreva sua proposta e condições
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem</Label>
                  <Textarea
                    id="message"
                    placeholder="Descreva sua proposta..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proposedPrice">
                    Preço Proposto (opcional)
                  </Label>
                  <Input
                    id="proposedPrice"
                    type="number"
                    placeholder="0.00"
                    value={proposedPrice}
                    onChange={(e) => setProposedPrice(e.target.value)}
                    step="0.01"
                    min="0"
                  />
                </div>

                {equipment.negotiationType === "rent" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="startDate">
                        Data de Início (opcional)
                      </Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endDate">
                        Data de Término (opcional)
                      </Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Telefone de Contato</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || loading}
                >
                  {submitting ? "Enviando..." : "Enviar Proposta"}
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
