"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  CalendarRange,
  Check,
  Handshake,
  Inbox,
  Loader2,
  MessageSquareQuote,
  Package,
  Phone,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import apiClient from "@/lib/api-service";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";

/** Espelha o payload de GET /proposals (escopo forcado ao usuario logado). */
interface Proposal {
  id: string;
  equipmentId: string;
  equipmentName?: string | null;
  buyerId: string;
  buyerName?: string | null;
  sellerId: string;
  message?: string | null;
  proposedPrice?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  contactPhone?: string | null;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

type ProposalStatus = Proposal["status"];
type PendingAction = { proposal: Proposal; status: "accepted" | "rejected" };

const STATUS_STYLES: Record<ProposalStatus, string> = {
  pending:
    "bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-900/50",
  accepted:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50",
  rejected:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50",
};

const STATUS_LABELS: Record<ProposalStatus, string> = {
  pending: "Aguardando resposta",
  accepted: "Aceita",
  rejected: "Recusada",
};

function StatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <Badge
      variant="outline"
      className={`${STATUS_STYLES[status] ?? STATUS_STYLES.pending} font-semibold`}
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

/** "2026-08-28" nao pode virar `new Date()` direto: viraria 27/08 no fuso do Brasil. */
function formatDateOnly(value?: string | null): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-");
    return `${day}/${month}/${year}`;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString("pt-BR");
}

function formatDateTime(value?: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(value?: number | null): string | null {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Link de WhatsApp a partir do telefone da proposta (DDI 55 quando faltar). */
function whatsappUrl(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}

function errorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: unknown } } })?.response?.data;
  const message = data?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  return fallback;
}

export default function PropostasPage() {
  return (
    <Suspense fallback={null}>
      <PropostasInner />
    </Suspense>
  );
}

function PropostasInner() {
  const router = useRouter();
  // Deep link das notificações: proposal_received → ?tab=received, proposal_status → ?tab=sent
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "sent" ? "sent" : "received";
  const { userProfile, loading: authLoading } = useAuth();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadProposals = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);
    try {
      const response = await apiClient.get("/proposals");
      const payload = response.data?.data ?? response.data ?? [];
      setProposals(Array.isArray(payload) ? payload : []);
      setError("");
    } catch (err) {
      console.error("[propostas] Erro ao carregar propostas:", err);
      setError(errorMessage(err, "Não foi possível carregar suas propostas. Tente novamente."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!userProfile) {
      router.push("/login");
      return;
    }
    void loadProposals();
  }, [authLoading, userProfile, router, loadProposals]);

  const { received, sent } = useMemo(() => {
    const myId = userProfile?.id;
    const byNewest = [...proposals].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return {
      received: byNewest.filter((p) => p.sellerId === myId),
      sent: byNewest.filter((p) => p.buyerId === myId),
    };
  }, [proposals, userProfile?.id]);

  const pendingReceived = received.filter((p) => p.status === "pending").length;

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    const { proposal, status } = pendingAction;
    setSavingId(proposal.id);
    try {
      await apiClient.patch(`/proposals/${proposal.id}/status`, { status });
      setProposals((prev) => prev.map((p) => (p.id === proposal.id ? { ...p, status } : p)));
      setPendingAction(null);
      toast.success(
        status === "accepted"
          ? "Proposta aceita! O anúncio foi marcado como indisponível."
          : "Proposta recusada.",
        {
          description:
            status === "accepted"
              ? "Combine os detalhes com o interessado pelo telefone informado na proposta."
              : "O interessado será avisado da sua resposta.",
        }
      );
      void loadProposals("refresh");
    } catch (err) {
      console.error("[propostas] Erro ao responder proposta:", err);
      const httpStatus = (err as { response?: { status?: number } })?.response?.status;

      // 403 de plano: o modal de upgrade ja foi aberto pelo interceptor do
      // apiClient — nada de toast destrutivo em cima.
      if (isPlanErrorBody((err as { response?: { data?: unknown } })?.response?.data)) {
        setPendingAction(null);
        return;
      }

      if (httpStatus === 409) {
        toast.error("Esta proposta já foi respondida.", {
          description:
            "Só é possível aceitar ou recusar propostas que ainda estão aguardando resposta.",
        });
        setPendingAction(null);
        void loadProposals("refresh");
        return;
      }

      toast.error(errorMessage(err, "Não foi possível atualizar a proposta. Tente novamente."));
    } finally {
      setSavingId(null);
    }
  };

  const renderProposalCard = (proposal: Proposal, role: "received" | "sent") => {
    const price = formatPrice(proposal.proposedPrice);
    const start = formatDateOnly(proposal.startDate);
    const end = formatDateOnly(proposal.endDate);
    const wa = whatsappUrl(proposal.contactPhone);
    const isSaving = savingId === proposal.id;

    return (
      <Card key={proposal.id} className="border-border overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{proposal.equipmentName || "Equipamento"}</span>
              </CardTitle>
              <CardDescription>
                {role === "received" ? (
                  <>
                    Proposta de{" "}
                    <span className="font-medium text-foreground">
                      {proposal.buyerName || "Interessado"}
                    </span>
                  </>
                ) : (
                  <>Proposta que você enviou ao anunciante</>
                )}
                {proposal.createdAt ? <> · {formatDateTime(proposal.createdAt)}</> : null}
              </CardDescription>
            </div>
            <StatusBadge status={proposal.status} />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {proposal.message && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                <MessageSquareQuote className="h-3.5 w-3.5" />
                Mensagem
              </p>
              <p className="text-sm whitespace-pre-line">{proposal.message}</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Valor proposto</p>
              <p className="font-semibold">{price ?? "Não informado"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CalendarRange className="h-3.5 w-3.5" />
                Período
              </p>
              <p className="font-semibold">
                {start || end ? `${start ?? "—"} até ${end ?? "—"}` : "Não informado"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Telefone de contato
              </p>
              {proposal.contactPhone ? (
                wa ? (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary hover:underline"
                  >
                    {proposal.contactPhone}
                  </a>
                ) : (
                  <p className="font-semibold">{proposal.contactPhone}</p>
                )
              ) : (
                <p className="font-semibold">Não informado</p>
              )}
            </div>
          </div>

          {role === "received" && proposal.status === "accepted" && (
            <Alert className="border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-900/20">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-300">
                Você aceitou esta proposta e o anúncio foi marcado como indisponível.
              </AlertDescription>
            </Alert>
          )}

          {role === "sent" && proposal.status === "pending" && (
            <p className="text-sm text-muted-foreground">
              O anunciante ainda não respondeu. Você será avisado por notificação assim que houver
              uma resposta.
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2 border-t bg-muted/20 py-4">
          {role === "received" && proposal.status === "pending" && (
            <>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
                disabled={isSaving}
                onClick={() => setPendingAction({ proposal, status: "accepted" })}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Aceitar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={isSaving}
                onClick={() => setPendingAction({ proposal, status: "rejected" })}
              >
                <X className="h-4 w-4" />
                Recusar
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="gap-2 ml-auto" asChild>
            <Link href={`/equipamentos/${proposal.equipmentId}`}>
              Ver anúncio
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  };

  const renderEmptyState = (role: "received" | "sent") => (
    <Card className="border-dashed">
      <CardContent className="py-14 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
          {role === "received" ? (
            <Inbox className="h-7 w-7 text-muted-foreground" />
          ) : (
            <Send className="h-7 w-7 text-muted-foreground" />
          )}
        </div>
        <h3 className="text-lg font-semibold mb-1">
          {role === "received"
            ? "Nenhuma proposta recebida ainda"
            : "Você ainda não enviou propostas"}
        </h3>
        <p className="text-muted-foreground max-w-md mb-6 text-sm">
          {role === "received"
            ? "Quando alguém se interessar por um equipamento que você anunciou, a proposta aparece aqui — com valor, período e telefone — para você aceitar ou recusar."
            : "Encontre um equipamento no marketplace, envie sua proposta ao anunciante e acompanhe a resposta por aqui."}
        </p>
        <Button asChild>
          <Link href="/equipamentos">Explorar equipamentos</Link>
        </Button>
        {role === "received" && (
          <Button variant="ghost" size="sm" className="mt-2" asChild>
            <Link href="/dashboard/equipamentos">Gerenciar meus anúncios</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (authLoading || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Handshake className="h-7 w-7 text-primary" />
                Propostas de Equipamentos
              </h1>
              <p className="text-muted-foreground">
                Responda a quem quer alugar ou comprar seus equipamentos e acompanhe as propostas
                que você enviou.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => loadProposals("refresh")}
              disabled={loading || refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6 border-destructive/50 bg-destructive/5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex flex-wrap items-center gap-3">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={() => loadProposals("refresh")}>
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full max-w-md" />
              {[0, 1].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-1/3 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Tabs defaultValue={initialTab} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="received" className="flex items-center gap-2">
                  <Inbox className="h-4 w-4" />
                  Recebidas ({received.length})
                  {pendingReceived > 0 && (
                    <span className="ml-1 rounded-full bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5">
                      {pendingReceived}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sent" className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Enviadas ({sent.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="received" className="mt-6">
                {received.length === 0 ? (
                  renderEmptyState("received")
                ) : (
                  <div className="space-y-4">
                    {received.map((proposal) => renderProposalCard(proposal, "received"))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sent" className="mt-6">
                {sent.length === 0 ? (
                  renderEmptyState("sent")
                ) : (
                  <div className="space-y-4">
                    {sent.map((proposal) => renderProposalCard(proposal, "sent"))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      <Footer />

      <AlertDialog
        open={!!pendingAction}
        onOpenChange={(open) => {
          if (!open && !savingId) setPendingAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.status === "accepted"
                ? "Aceitar esta proposta?"
                : "Recusar esta proposta?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.status === "accepted" ? (
                <>
                  Ao aceitar, o anúncio de{" "}
                  <span className="font-medium text-foreground">
                    {pendingAction?.proposal.equipmentName || "seu equipamento"}
                  </span>{" "}
                  será marcado como{" "}
                  <span className="font-medium text-foreground">indisponível</span> e sairá das
                  buscas. Combine os detalhes com{" "}
                  {pendingAction?.proposal.buyerName || "o interessado"} pelo telefone informado na
                  proposta.
                </>
              ) : (
                <>
                  A proposta de {pendingAction?.proposal.buyerName || "o interessado"} será recusada
                  e o anúncio continua disponível. Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!savingId}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmAction();
              }}
              disabled={!!savingId}
              className={
                pendingAction?.status === "accepted"
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {savingId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : pendingAction?.status === "accepted" ? (
                "Sim, aceitar proposta"
              ) : (
                "Sim, recusar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
