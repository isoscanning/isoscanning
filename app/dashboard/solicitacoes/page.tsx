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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Briefcase, FileText } from "lucide-react";
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

interface JobApplication {
  id: string;
  jobOfferId: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  message?: string;
  createdAt: string;
  updatedAt: string;
  jobOffer?: {
    id: string;
    title: string;
    employerName: string;
    category: string;
    jobType: string;
    locationType: string;
    city?: string;
    state?: string;
    description: string;
    budgetMin?: number;
    budgetMax?: number;
  };
}

export default function SolicitacoesPage() {
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applicationToCancel, setApplicationToCancel] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!authLoading && !userProfile) {
      router.push("/login");
      return;
    }

    if (userProfile) {
      fetchData();
    }
  }, [userProfile, authLoading]);

  const fetchData = async () => {
    try {
      // Fetch quote requests
      try {
        const quotesResponse = await apiClient.get(
          `/quotes?clientId=${userProfile?.id}`
        );
        const quotesData = quotesResponse.data.data || quotesResponse.data || [];
        setQuoteRequests(quotesData);
      } catch (err) {
        console.error("[solicitacoes] Error fetching quote requests:", err);
      }

      // Fetch job applications
      try {
        const applicationsResponse = await apiClient.get(
          `/job-applications/my-applications`
        );
        const applicationsData = applicationsResponse.data.data || applicationsResponse.data || [];
        setJobApplications(applicationsData);
      } catch (err) {
        console.error("[solicitacoes] Error fetching job applications:", err);
      }

    } catch (err) {
      console.error("[solicitacoes] Error fetching data:", err);
      setError("Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelApplication = async () => {
    if (!applicationToCancel) return;

    setIsCancelling(true);
    try {
      await apiClient.patch(
        `/job-applications/${applicationToCancel}`,
        { status: 'withdrawn' }
      );

      // Update local state to reflect change immediately (optimistic UI or re-fetch)
      // Since we need to update the status in the UI, re-fetching is reliable.
      await fetchData();
    } catch (err) {
      console.error("Error cancelling application", err);
      // We can use a toast here ideally, but for now we'll keep error logging
      alert("Ocorreu um erro ao cancelar a candidatura.");
    } finally {
      setIsCancelling(false);
      setApplicationToCancel(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-orange-100 text-orange-900 dark:bg-orange-900/50 dark:text-orange-200 font-semibold",
      answered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      withdrawn: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    };

    const labels = {
      pending: "Pendente",
      answered: "Respondido",
      cancelled: "Cancelado",
      accepted: "Aceito",
      rejected: "Rejeitado",
      withdrawn: "Cancelado",
    };

    return (
      <span className={`px-3 py-1 rounded text-sm font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
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
              Acompanhe suas solicitações de orçamento e candidaturas a vagas
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

          <Tabs defaultValue="quotes" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="quotes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Orçamentos ({quoteRequests.length})
              </TabsTrigger>
              <TabsTrigger value="jobs" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Candidaturas ({jobApplications.length})
              </TabsTrigger>
            </TabsList>

            {/* Quote Requests Tab */}
            <TabsContent value="quotes" className="mt-6">
              {quoteRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">
                      Nenhuma solicitação de orçamento encontrada
                    </p>
                    <Button onClick={() => router.push("/profissionais")}>
                      Explorar Profissionais
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {quoteRequests.map((request) => (
                    <Card key={request.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{request.serviceType}</CardTitle>
                            <CardDescription>
                              {request.professionalName}
                            </CardDescription>
                          </div>
                          {getStatusBadge(request.status)}
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
            </TabsContent>

            {/* Job Applications Tab */}
            <TabsContent value="jobs" className="mt-6">
              {jobApplications.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">
                      Nenhuma candidatura encontrada
                    </p>
                    <Button onClick={() => router.push("/vagas")}>
                      Explorar Vagas
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {jobApplications.map((application) => (
                    <Card key={application.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>
                              {application.jobOffer?.title || "Candidatura para Vaga"}
                            </CardTitle>
                            <CardDescription>
                              {application.jobOffer?.employerName && (
                                <span>{application.jobOffer.employerName} • </span>
                              )}
                              {application.jobOffer?.category && (
                                <span>{application.jobOffer.category} • </span>
                              )}
                              ID: {application.jobOfferId.substring(0, 8)}...
                            </CardDescription>
                          </div>
                          {getStatusBadge(application.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Candidatado em
                            </p>
                            <p className="font-medium">
                              {new Date(application.createdAt).toLocaleDateString(
                                "pt-BR"
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Última atualização
                            </p>
                            <p className="font-medium">
                              {new Date(application.updatedAt).toLocaleDateString(
                                "pt-BR"
                              )}
                            </p>
                          </div>
                        </div>
                        {application.message && (
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Mensagem
                            </p>
                            <p className="text-sm">{application.message}</p>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="flex gap-2">
                        {application.status === "pending" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setApplicationToCancel(application.id)}
                          >
                            Cancelar Candidatura
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/vagas/${application.jobOfferId}`)}
                        >
                          Ver Vaga
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main >

      <Footer />

      <AlertDialog open={!!applicationToCancel} onOpenChange={(open) => !open && setApplicationToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Candidatura</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar esta candidatura? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancelApplication();
              }}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? "Cancelando..." : "Confirmar Cancelamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
