"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, Briefcase, FileText, Inbox, CalendarClock, MessageCircle, Check, X, CheckCircle2 } from "lucide-react";
import apiClient from "@/lib/api-service";
import { apiErrorMessage } from "@/lib/contracts/contract-utils";

// ─── tipos (espelham os DTOs do backend) ─────────────────────────────────────

interface QuoteRequest {
  id: string;
  professionalId: string;
  professionalName: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  serviceType: string;
  serviceDate: string;
  location: string;
  description: string;
  budget?: number | null;
  status: "pending" | "answered" | "cancelled";
  createdAt: string;
}

interface Booking {
  id: string;
  professionalId: string;
  professionalName: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  serviceType: string;
  location: string;
  notes?: string | null;
  date: string;
  startTime: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
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

type Tab = "orcamentos" | "recebidos" | "agendamentos" | "candidaturas";
const TABS: Tab[] = ["orcamentos", "recebidos", "agendamentos", "candidaturas"];

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-orange-100 text-orange-900 dark:bg-orange-900/50 dark:text-orange-200",
  answered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  withdrawn: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  answered: "Respondido",
  confirmed: "Confirmado",
  accepted: "Aceito",
  completed: "Concluído",
  cancelled: "Cancelado",
  rejected: "Rejeitado",
  withdrawn: "Cancelado",
};

const fmtDate = (v?: string) => {
  if (!v) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : new Date(v).toLocaleDateString("pt-BR");
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-3 py-1 rounded text-sm font-medium whitespace-nowrap ${STATUS_STYLE[status] ?? STATUS_STYLE.pending}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function SolicitacoesPage() {
  return (
    <Suspense fallback={null}>
      <SolicitacoesInner />
    </Suspense>
  );
}

/**
 * Central de solicitações — dos dois lados:
 *  - Orçamentos que EU pedi (cliente) e orçamentos que RECEBI (profissional)
 *  - Agendamentos (como cliente ou como profissional), com confirmar/cancelar/concluir
 *  - Minhas candidaturas a vagas
 * É o destino das notificações quote_*, booking_* e do menu.
 */
function SolicitacoesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { userProfile, loading: authLoading } = useAuth();

  const initialTab = (searchParams.get("tab") as Tab | null) ?? "orcamentos";
  const [tab, setTab] = useState<Tab>(TABS.includes(initialTab) ? initialTab : "orcamentos");

  const [sentQuotes, setSentQuotes] = useState<QuoteRequest[]>([]);
  const [receivedQuotes, setReceivedQuotes] = useState<QuoteRequest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [applicationToCancel, setApplicationToCancel] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; description: string; action: () => Promise<void>; destructive?: boolean } | null>(null);

  useEffect(() => {
    if (!authLoading && !userProfile) router.push("/login");
  }, [authLoading, userProfile, router]);

  const fetchAll = useCallback(async () => {
    if (!userProfile) return;
    const me = userProfile.id;
    const safe = async <T,>(p: Promise<{ data: { data?: T[] } | T[] }>, label: string): Promise<T[]> => {
      try {
        const res = await p;
        const d = res.data as { data?: T[] } | T[];
        return Array.isArray(d) ? d : d.data ?? [];
      } catch (err) {
        console.error(`[solicitacoes] ${label}`, err);
        return [];
      }
    };
    const [sent, received, asClient, asPro, apps] = await Promise.all([
      safe<QuoteRequest>(apiClient.get(`/quotes?clientId=${me}&limit=100`), "quotes sent"),
      safe<QuoteRequest>(apiClient.get(`/quotes?professionalId=${me}&limit=100`), "quotes received"),
      safe<Booking>(apiClient.get(`/bookings?clientId=${me}&limit=100`), "bookings as client"),
      safe<Booking>(apiClient.get(`/bookings?professionalId=${me}&limit=100`), "bookings as pro"),
      safe<JobApplication>(apiClient.get(`/job-applications/my-applications`), "applications"),
    ]);
    setSentQuotes(sent);
    setReceivedQuotes(received);
    const merged = new Map<string, Booking>();
    [...asClient, ...asPro].forEach((b) => merged.set(b.id, b));
    setBookings(Array.from(merged.values()).sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`)));
    setApplications(apps);
    setLoading(false);
  }, [userProfile]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const changeTab = (t: string) => {
    setTab(t as Tab);
    window.history.replaceState(null, "", `/dashboard/solicitacoes?tab=${t}`);
  };

  // ─── ações ────────────────────────────────────────────────────────────────

  const run = async (id: string, fn: () => Promise<void>, okMessage: string) => {
    setBusyId(id);
    setError("");
    try {
      await fn();
      toast({ title: okMessage });
      await fetchAll();
    } catch (e) {
      setError(apiErrorMessage(e, "Não foi possível concluir a ação."));
    } finally {
      setBusyId(null);
    }
  };

  const setQuoteStatus = (q: QuoteRequest, status: QuoteRequest["status"], okMessage: string) =>
    run(q.id, () => apiClient.patch(`/quotes/${q.id}/status`, { status }).then(() => undefined), okMessage);

  const setBookingStatus = (b: Booking, status: Booking["status"], okMessage: string) =>
    run(b.id, () => apiClient.patch(`/bookings/${b.id}/status`, { status }).then(() => undefined), okMessage);

  const openChat = async (participantId: string) => {
    try {
      const res = await apiClient.post("/chat/conversations", { participantId });
      router.push(`/dashboard/chat/${res.data.id}`);
    } catch (e) {
      setError(apiErrorMessage(e, "Não foi possível abrir a conversa."));
    }
  };

  const handleCancelApplication = async () => {
    if (!applicationToCancel) return;
    await run(applicationToCancel, () => apiClient.patch(`/job-applications/${applicationToCancel}`, { status: "withdrawn" }).then(() => undefined), "Candidatura cancelada.");
    setApplicationToCancel(null);
  };

  const pendingReceived = useMemo(() => receivedQuotes.filter((q) => q.status === "pending").length, [receivedQuotes]);
  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.status === "pending" && b.professionalId === userProfile?.id).length,
    [bookings, userProfile?.id]
  );

  if (authLoading || !userProfile) return null;
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const me = userProfile.id;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Solicitações</h1>
            <p className="text-muted-foreground">
              Orçamentos, agendamentos e candidaturas — o que você pediu e o que pediram a você.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6 border-destructive/50 bg-destructive/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={tab} onValueChange={changeTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
              <TabsTrigger value="orcamentos" className="flex items-center gap-2 py-2">
                <FileText className="h-4 w-4" /> Meus pedidos ({sentQuotes.length})
              </TabsTrigger>
              <TabsTrigger value="recebidos" className="flex items-center gap-2 py-2">
                <Inbox className="h-4 w-4" /> Orçamentos recebidos
                {pendingReceived > 0 && <span className="ml-1 rounded-full bg-orange-500 text-white text-[10px] px-1.5 py-0.5">{pendingReceived}</span>}
              </TabsTrigger>
              <TabsTrigger value="agendamentos" className="flex items-center gap-2 py-2">
                <CalendarClock className="h-4 w-4" /> Agendamentos
                {pendingBookings > 0 && <span className="ml-1 rounded-full bg-orange-500 text-white text-[10px] px-1.5 py-0.5">{pendingBookings}</span>}
              </TabsTrigger>
              <TabsTrigger value="candidaturas" className="flex items-center gap-2 py-2">
                <Briefcase className="h-4 w-4" /> Candidaturas ({applications.length})
              </TabsTrigger>
            </TabsList>

            {/* ── Orçamentos que eu pedi ── */}
            <TabsContent value="orcamentos" className="mt-6">
              {sentQuotes.length === 0 ? (
                <EmptyState text="Você ainda não pediu nenhum orçamento." cta="Explorar profissionais" onCta={() => router.push("/profissionais")} />
              ) : (
                <div className="space-y-4">
                  {sentQuotes.map((q) => (
                    <Card key={q.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <CardTitle>{q.serviceType}</CardTitle>
                            <CardDescription>Para {q.professionalName}</CardDescription>
                          </div>
                          <StatusBadge status={q.status} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <QuoteDetails q={q} />
                        {q.status === "answered" && (
                          <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> O profissional respondeu — combine os detalhes pelo chat.
                          </p>
                        )}
                      </CardContent>
                      <CardFooter className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openChat(q.professionalId)}>
                          <MessageCircle className="h-4 w-4" /> Conversar
                        </Button>
                        {q.status === "pending" && (
                          <Button variant="ghost" size="sm" className="text-red-600 gap-1.5" disabled={busyId === q.id}
                            onClick={() => setConfirm({
                              title: "Cancelar pedido de orçamento",
                              description: "O profissional será avisado que você cancelou o pedido.",
                              destructive: true,
                              action: () => setQuoteStatus(q, "cancelled", "Pedido cancelado."),
                            })}>
                            <X className="h-4 w-4" /> Cancelar pedido
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Orçamentos recebidos (profissional) ── */}
            <TabsContent value="recebidos" className="mt-6">
              {receivedQuotes.length === 0 ? (
                <EmptyState text="Nenhum pedido de orçamento recebido ainda. Quando um cliente pedir pelo seu perfil, ele aparece aqui e você recebe uma notificação." />
              ) : (
                <div className="space-y-4">
                  {receivedQuotes.map((q) => (
                    <Card key={q.id} className={q.status === "pending" ? "border-orange-300/60" : undefined}>
                      <CardHeader>
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <CardTitle>{q.serviceType}</CardTitle>
                            <CardDescription>De {q.clientName} · pedido em {new Date(q.createdAt).toLocaleDateString("pt-BR")}</CardDescription>
                          </div>
                          <StatusBadge status={q.status} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <QuoteDetails q={q} />
                        {q.status === "pending" && (
                          <p className="text-xs text-muted-foreground">
                            Responda pelo chat com valores e condições. Depois marque como <strong>respondido</strong> para o cliente ser avisado —
                            ou recuse se não puder atender.
                          </p>
                        )}
                      </CardContent>
                      <CardFooter className="flex flex-wrap gap-2">
                        <Button size="sm" className="gap-1.5" onClick={() => openChat(q.clientId)}>
                          <MessageCircle className="h-4 w-4" /> Responder pelo chat
                        </Button>
                        {q.status === "pending" && (
                          <>
                            <Button variant="outline" size="sm" className="gap-1.5" disabled={busyId === q.id}
                              onClick={() => setQuoteStatus(q, "answered", "Marcado como respondido. O cliente foi avisado.")}>
                              <Check className="h-4 w-4" /> Marcar como respondido
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 gap-1.5" disabled={busyId === q.id}
                              onClick={() => setConfirm({
                                title: "Recusar pedido de orçamento",
                                description: "O cliente será avisado que você não pode atender este pedido.",
                                destructive: true,
                                action: () => setQuoteStatus(q, "cancelled", "Pedido recusado. O cliente foi avisado."),
                              })}>
                              <X className="h-4 w-4" /> Não posso atender
                            </Button>
                          </>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Agendamentos (ambos os lados) ── */}
            <TabsContent value="agendamentos" className="mt-6">
              {bookings.length === 0 ? (
                <EmptyState text="Nenhum agendamento por enquanto. Pedidos feitos pela sua página de agendamento aparecem aqui para você confirmar." />
              ) : (
                <div className="space-y-4">
                  {bookings.map((b) => {
                    const iAmPro = b.professionalId === me;
                    const other = iAmPro ? b.clientName : b.professionalName;
                    const otherId = iAmPro ? b.clientId : b.professionalId;
                    return (
                      <Card key={b.id} className={b.status === "pending" && iAmPro ? "border-orange-300/60" : undefined}>
                        <CardHeader>
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <CardTitle>{b.serviceType}</CardTitle>
                              <CardDescription>
                                {iAmPro ? `Cliente: ${other}` : `Profissional: ${other}`} · {fmtDate(b.date)} às {b.startTime}
                              </CardDescription>
                            </div>
                            <StatusBadge status={b.status} />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><p className="text-muted-foreground">Local</p><p className="font-medium">{b.location || "—"}</p></div>
                            <div><p className="text-muted-foreground">Solicitado em</p><p className="font-medium">{new Date(b.createdAt).toLocaleDateString("pt-BR")}</p></div>
                          </div>
                          {b.notes && <div className="text-sm"><p className="text-muted-foreground">Observações</p><p>{b.notes}</p></div>}
                          {b.status === "pending" && iAmPro && (
                            <p className="text-xs text-muted-foreground">Confirme para reservar o horário ou cancele se não puder atender. O cliente é avisado nos dois casos.</p>
                          )}
                        </CardContent>
                        <CardFooter className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openChat(otherId)}>
                            <MessageCircle className="h-4 w-4" /> Conversar
                          </Button>
                          {iAmPro && b.status === "pending" && (
                            <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" disabled={busyId === b.id}
                              onClick={() => setBookingStatus(b, "confirmed", "Agendamento confirmado. O cliente foi avisado.")}>
                              <Check className="h-4 w-4" /> Confirmar
                            </Button>
                          )}
                          {iAmPro && b.status === "confirmed" && (
                            <Button variant="outline" size="sm" className="gap-1.5" disabled={busyId === b.id}
                              onClick={() => setBookingStatus(b, "completed", "Agendamento concluído.")}>
                              <CheckCircle2 className="h-4 w-4" /> Marcar como concluído
                            </Button>
                          )}
                          {(b.status === "pending" || b.status === "confirmed") && (
                            <Button variant="ghost" size="sm" className="text-red-600 gap-1.5" disabled={busyId === b.id}
                              onClick={() => setConfirm({
                                title: "Cancelar agendamento",
                                description: `${iAmPro ? "O cliente" : "O profissional"} será avisado do cancelamento.`,
                                destructive: true,
                                action: () => setBookingStatus(b, "cancelled", "Agendamento cancelado."),
                              })}>
                              <X className="h-4 w-4" /> Cancelar
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ── Candidaturas ── */}
            <TabsContent value="candidaturas" className="mt-6">
              {applications.length === 0 ? (
                <EmptyState text="Nenhuma candidatura encontrada." cta="Explorar vagas" onCta={() => router.push("/vagas")} />
              ) : (
                <div className="space-y-4">
                  {applications.map((application) => (
                    <Card key={application.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <CardTitle>{application.jobOffer?.title || "Candidatura para Vaga"}</CardTitle>
                            <CardDescription>
                              {application.jobOffer?.employerName && <span>{application.jobOffer.employerName} • </span>}
                              {application.jobOffer?.category && <span>{application.jobOffer.category}</span>}
                            </CardDescription>
                          </div>
                          <StatusBadge status={application.status} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div><p className="text-muted-foreground">Candidatado em</p><p className="font-medium">{new Date(application.createdAt).toLocaleDateString("pt-BR")}</p></div>
                          <div><p className="text-muted-foreground">Última atualização</p><p className="font-medium">{new Date(application.updatedAt).toLocaleDateString("pt-BR")}</p></div>
                        </div>
                        {application.message && <div className="text-sm"><p className="text-muted-foreground">Mensagem</p><p>{application.message}</p></div>}
                      </CardContent>
                      <CardFooter className="flex gap-2">
                        {application.status === "pending" && (
                          <Button variant="destructive" size="sm" onClick={() => setApplicationToCancel(application.id)}>
                            Cancelar Candidatura
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/candidaturas?candidatura=${application.id}`)}>
                          Ver negociação
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/vagas/${application.jobOfferId}`)}>
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
      </main>

      <Footer />

      <AlertDialog open={!!applicationToCancel} onOpenChange={(open) => !open && setApplicationToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Candidatura</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja cancelar esta candidatura? O contratante será avisado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!busyId}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void handleCancelApplication(); }} disabled={!!busyId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {busyId ? "Cancelando..." : "Confirmar Cancelamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!busyId}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => { e.preventDefault(); const a = confirm?.action; setConfirm(null); if (a) await a(); }}
              disabled={!!busyId}
              className={confirm?.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function QuoteDetails({ q }: { q: QuoteRequest }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><p className="text-muted-foreground">Data do serviço</p><p className="font-medium">{fmtDate(q.serviceDate)}</p></div>
        <div><p className="text-muted-foreground">Local</p><p className="font-medium">{q.location || "—"}</p></div>
      </div>
      <div className="text-sm">
        <p className="text-muted-foreground">Descrição</p>
        <p className="whitespace-pre-line">{q.description}</p>
      </div>
      {q.budget != null && q.budget > 0 && (
        <div className="text-sm">
          <p className="text-muted-foreground">Orçamento esperado</p>
          <p className="font-medium">{q.budget.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
        </div>
      )}
    </>
  );
}

function EmptyState({ text, cta, onCta }: { text: string; cta?: string; onCta?: () => void }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-muted-foreground mb-4">{text}</p>
        {cta && onCta && <Button onClick={onCta}>{cta}</Button>}
      </CardContent>
    </Card>
  );
}
