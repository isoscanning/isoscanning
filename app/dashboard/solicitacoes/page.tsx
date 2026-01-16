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
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import apiClient from "@/lib/api-service";

interface QuoteRequest {
  id: string;
  professionalName: string;
  serviceType: string;
  serviceDate: string;
  location: string;
  description: string;
  budget?: number;
  status: "pending" | "answered" | "cancelled";
  createdAt: string;
}

export default function SolicitacoesPage() {
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !userProfile) {
      router.push("/login");
      return;
    }

    if (userProfile) {
      fetchRequests();
    }
  }, [userProfile, authLoading]);

  const fetchRequests = async () => {
    try {
      console.log(
        "[solicitacoes] Fetching quote requests for user:",
        userProfile?.id
      );

      const response = await apiClient.get(
        `/quotes?clientId=${userProfile?.id}`
      );
      const data = response.data.data || response.data || [];
      setRequests(data);
      console.log("[solicitacoes] Quote requests loaded:", data);
    } catch (err) {
      console.error("[solicitacoes] Error fetching requests:", err);
      setError("Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-3xl font-bold mb-2">Minhas Solicitações</h1>
            <p className="text-muted-foreground">
              Acompanhe suas solicitações de orçamento e agendamentos
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

          {requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  Nenhuma solicitação encontrada
                </p>
                <Button onClick={() => router.push("/profissionais")}>
                  Explorar Profissionais
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{request.serviceType}</CardTitle>
                        <CardDescription>
                          {request.professionalName}
                        </CardDescription>
                      </div>
                      <span
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          request.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : request.status === "answered"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {request.status === "pending"
                          ? "Pendente"
                          : request.status === "answered"
                          ? "Respondido"
                          : "Cancelado"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Data</p>
                        <p className="font-medium">
                          {new Date(request.serviceDate).toLocaleDateString(
                            "pt-BR"
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Local</p>
                        <p className="font-medium">{request.location}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Descrição</p>
                      <p className="text-sm line-clamp-2">
                        {request.description}
                      </p>
                    </div>
                    {request.budget && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Orçamento Esperado
                        </p>
                        <p className="font-medium">
                          R$ {request.budget.toLocaleString("pt-BR")}
                        </p>
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
