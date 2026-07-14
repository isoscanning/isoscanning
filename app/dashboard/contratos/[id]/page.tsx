"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  FileSignature,
  ArrowLeft,
  Send,
  PenLine,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Copy,
  ExternalLink,
  FileText,
  User,
  Calendar,
  DollarSign,
  History,
  ChevronDown,
  ChevronUp,
  Trash2,
  Download,
} from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/api-service";

interface Party {
  id: string;
  partyRole: "sender" | "recipient";
  name: string;
  email: string;
  document?: string;
  signatureToken: string;
  signedAt?: string | null;
  viewedAt?: string | null;
  viewCount: number;
  rejectedAt?: string | null;
}

interface ContractEvent {
  id: string;
  eventType: string;
  actorName?: string;
  actorEmail?: string;
  ipAddress?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface Contract {
  id: string;
  title: string;
  ownerName: string;
  clientName: string;
  clientEmail: string;
  clientDocument?: string;
  body: string;
  status: string;
  source: string;
  creationType: string;
  uploadedFileUrl?: string;
  contractValue?: number;
  serviceStartDate?: string;
  serviceEndDate?: string;
  expiresAt?: string;
  signedPdfUrl?: string;
  professionalId?: string | null;
  jobApplicationId?: string | null;
  agendaBlockedAt?: string | null;
  paymentStatus?: string;
  serviceCompletedAt?: string | null;
  reviewRequestedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  parties: Party[];
  events?: ContractEvent[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Rascunho", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", icon: PenLine },
  sent: { label: "Enviado — Aguardando Assinaturas", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: Send },
  partially_signed: { label: "Parcialmente Assinado", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300", icon: Clock },
  fully_signed: { label: "Totalmente Assinado", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
  expired: { label: "Expirado", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", icon: AlertCircle },
};

const EVENT_LABELS: Record<string, string> = {
  created: "Contrato criado",
  updated: "Contrato editado",
  sent: "Contrato enviado para assinatura",
  viewed: "Contrato visualizado",
  signed: "Contrato assinado",
  rejected: "Assinatura recusada",
  cancelled: "Contrato cancelado",
  expired: "Contrato expirado",
  downloaded: "PDF baixado",
  reminder_sent: "Lembrete enviado",
  agenda_blocked: "Agenda do profissional bloqueada",
  payment_skipped: "Cobrança pulada (pagamentos em breve)",
  completed: "Serviço concluído",
  review_requested: "Pedido de avaliação enviado",
};

export default function ContratoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { userProfile, loading } = useAuth();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loadingContract, setLoadingContract] = useState(true);
  const [sendingContract, setSendingContract] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string>("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  useEffect(() => {
    if (!userProfile) return;
    const fetch = async () => {
      setLoadingContract(true);
      try {
        const res = await apiClient.get(`/contracts/${id}`);
        setContract(res.data);
      } catch (e) {
        setError("Contrato não encontrado.");
      } finally {
        setLoadingContract(false);
      }
    };
    fetch();
  }, [userProfile, id]);

  const handleSend = async () => {
    if (!contract) return;
    setSendingContract(true);
    try {
      const res = await apiClient.post(`/contracts/${id}/send`);
      setContract((prev) => prev ? { ...prev, ...res.data } : prev);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? "Erro ao enviar contrato.");
    } finally {
      setSendingContract(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await apiClient.post(`/contracts/${id}/cancel`);
      setContract((prev) => prev ? { ...prev, status: "cancelled" } : prev);
      setShowCancelConfirm(false);
    } catch (e) {
      setError("Erro ao cancelar contrato.");
    } finally {
      setCancelling(false);
    }
  };

  const handleComplete = async () => {
    if (!contract) return;
    setCompleting(true);
    try {
      const res = await apiClient.post(`/contracts/${id}/complete`);
      setContract((prev) => prev ? { ...prev, ...res.data } : prev);
      setShowCompleteConfirm(false);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err?.response?.data?.message ?? "Erro ao concluir o serviço.");
    } finally {
      setCompleting(false);
    }
  };

  const handleCopySigningLink = (token: string) => {
    const link = `${window.location.origin}/assinar/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(""), 2500);
  };

  if (loading || !userProfile) return null;

  if (loadingContract) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-12 px-4">
          <div className="container mx-auto max-w-5xl space-y-6">
            <Skeleton className="h-10 w-72" />
            <div className="grid md:grid-cols-3 gap-6">
              <Skeleton className="h-48 md:col-span-2 rounded-xl" />
              <Skeleton className="h-48 rounded-xl" />
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!contract || error) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-12 px-4 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
            <h2 className="text-xl font-semibold">Contrato não encontrado</h2>
            <Link href="/dashboard/contratos">
              <Button variant="outline">Voltar para Contratos</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[contract.status] ?? STATUS_CONFIG.draft;
  const StatusIcon = statusCfg.icon;
  const canEdit = contract.status === "draft";
  const canSend = contract.status === "draft";
  const canCancel = contract.status !== "fully_signed" && contract.status !== "cancelled" && contract.status !== "expired";
  const canComplete = contract.status === "fully_signed" && !contract.serviceCompletedAt;
  const signedCount = contract.parties?.filter((p) => p.signedAt).length ?? 0;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Timeline do fluxo integrado (só quando há profissional vinculado ao contrato)
  const hasFlow = Boolean(contract.professionalId);
  const flowSteps: Array<{ label: string; done: boolean; detail?: string; disabled?: boolean }> = hasFlow ? [
    { label: "Contrato gerado", done: true, detail: new Date(contract.createdAt).toLocaleDateString("pt-BR") },
    { label: "Assinaturas", done: contract.status === "fully_signed" || Boolean(contract.serviceCompletedAt), detail: `${signedCount}/${contract.parties.length} assinaram` },
    { label: "Pagamento", done: false, detail: "Em breve (Asaas)", disabled: true },
    { label: "Agenda bloqueada", done: Boolean(contract.agendaBlockedAt), detail: contract.agendaBlockedAt ? new Date(contract.agendaBlockedAt).toLocaleDateString("pt-BR") : "Após assinatura completa" },
    { label: "Serviço concluído", done: Boolean(contract.serviceCompletedAt), detail: contract.serviceCompletedAt ? new Date(contract.serviceCompletedAt).toLocaleDateString("pt-BR") : "" },
    { label: "Avaliação solicitada", done: Boolean(contract.reviewRequestedAt), detail: contract.reviewRequestedAt ? "Cliente notificado" : "" },
  ] : [];

  return (
    <div className="min-h-screen flex flex-col bg-background/50">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-5xl space-y-6">

          {/* Breadcrumb + Actions */}
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/dashboard/contratos" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" /> Contratos
                </Link>
                <span>/</span>
                <span className="text-foreground font-medium line-clamp-1 max-w-xs">{contract.title}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {canEdit && (
                  <Link href={`/dashboard/contratos/${id}/editar`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <PenLine className="h-3.5 w-3.5" /> Editar
                    </Button>
                  </Link>
                )}
                {canSend && (
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    onClick={handleSend}
                    disabled={sendingContract}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {sendingContract ? "Enviando..." : "Enviar para Assinatura"}
                  </Button>
                )}
                {canComplete && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    onClick={() => setShowCompleteConfirm(true)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Concluir Serviço
                  </Button>
                )}
                {contract.signedPdfUrl && (
                  <a href={contract.signedPdfUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-2 text-green-600 border-green-300 hover:bg-green-50">
                      <Download className="h-3.5 w-3.5" /> PDF Assinado
                    </Button>
                  </a>
                )}
                {canCancel && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 border-red-200 hover:bg-red-50 gap-2"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Cancelar
                  </Button>
                )}
              </div>
            </div>
          </ScrollReveal>

          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 text-sm px-4 py-3">
              {error}
            </div>
          )}

          {/* Cancel Confirmation */}
          {showCancelConfirm && (
            <ScrollReveal>
              <div className="rounded-xl border-2 border-red-300 bg-red-50 dark:bg-red-900/20 p-5 space-y-3">
                <p className="font-semibold text-red-700">Confirmar cancelamento</p>
                <p className="text-sm text-red-600">Esta ação não pode ser desfeita. Os links de assinatura serão invalidados.</p>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleCancel} disabled={cancelling}>
                    {cancelling ? "Cancelando..." : "Confirmar cancelamento"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowCancelConfirm(false)}>Voltar</Button>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* Complete Confirmation */}
          {showCompleteConfirm && (
            <ScrollReveal>
              <div className="rounded-xl border-2 border-green-300 bg-green-50 dark:bg-green-900/20 p-5 space-y-3">
                <p className="font-semibold text-green-700">Concluir serviço?</p>
                <p className="text-sm text-green-700/80">
                  O contrato será marcado como concluído e o cliente receberá um pedido de avaliação do profissional.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleComplete} disabled={completing}>
                    {completing ? "Concluindo..." : "Confirmar conclusão"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowCompleteConfirm(false)}>Voltar</Button>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* Fluxo integrado: acordo → assinatura → pagamento → agenda → conclusão → avaliação */}
          {hasFlow && (
            <ScrollReveal delay={0.05}>
              <Card className="border-primary/10">
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-0">
                    {flowSteps.map((step, i) => (
                      <div key={step.label} className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-2 sm:flex-1 relative">
                        {i < flowSteps.length - 1 && (
                          <div className={`hidden sm:block absolute top-3 left-1/2 w-full h-0.5 ${flowSteps[i + 1].done ? "bg-green-400" : "bg-border"}`} />
                        )}
                        <div className={`relative z-10 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? "bg-green-500 text-white" : step.disabled ? "bg-muted text-muted-foreground border border-dashed border-muted-foreground/40" : "bg-muted text-muted-foreground border"}`}>
                          {step.done ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                        </div>
                        <div className="sm:text-center min-w-0">
                          <p className={`text-xs font-medium ${step.done ? "text-green-600" : step.disabled ? "text-muted-foreground/60" : "text-foreground"}`}>{step.label}</p>
                          {step.detail && <p className="text-[10px] text-muted-foreground">{step.detail}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          )}

          {/* Status Banner */}
          <ScrollReveal delay={0.05}>
            <div className={`flex items-center gap-3 px-5 py-4 rounded-xl ${statusCfg.color}`}>
              <StatusIcon className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-semibold">{statusCfg.label}</span>
                {contract.status !== "draft" && (
                  <span className="text-sm ml-2 opacity-80">
                    · {signedCount} de {contract.parties.length} partes assinaram
                  </span>
                )}
              </div>
              {contract.expiresAt && contract.status === "sent" && (
                <span className="text-sm opacity-80">
                  Expira em {new Date(contract.expiresAt).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6">

            {/* Main Info */}
            <ScrollReveal delay={0.1} className="md:col-span-2 space-y-6">
              <Card className="border-primary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-indigo-500" />
                    Informações do Contrato
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold">{contract.title}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {contract.source === "standalone" ? "Independente" : contract.source === "proposal" ? "Proposta" : contract.source === "job_application" ? "Acordo de Vaga" : "Orçamento"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {contract.creationType === "upload" ? "PDF Enviado" : "Criado na Plataforma"}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Cliente</p>
                        <p className="text-sm font-medium">{contract.clientName}</p>
                        <p className="text-xs text-muted-foreground">{contract.clientEmail}</p>
                        {contract.clientDocument && <p className="text-xs text-muted-foreground">CPF/CNPJ: {contract.clientDocument}</p>}
                      </div>
                    </div>
                    {contract.contractValue != null && (
                      <div className="flex items-start gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Valor</p>
                          <p className="text-sm font-medium">
                            {contract.contractValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </p>
                        </div>
                      </div>
                    )}
                    {contract.serviceStartDate && (
                      <div className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Data do Serviço</p>
                          <p className="text-sm font-medium">
                            {new Date(contract.serviceStartDate).toLocaleDateString("pt-BR")}
                            {contract.serviceEndDate && ` — ${new Date(contract.serviceEndDate).toLocaleDateString("pt-BR")}`}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Criado em</p>
                        <p className="text-sm font-medium">{new Date(contract.createdAt).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contract Body Preview */}
              {contract.creationType !== "upload" && (
                <Card className="border-primary/10">
                  <CardHeader>
                    <CardTitle className="text-lg">Conteúdo do Contrato</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none max-h-80 overflow-y-auto border rounded-lg p-4 bg-muted/30 text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: contract.body }}
                    />
                    {canEdit && (
                      <Link href={`/dashboard/contratos/${id}/editar`}>
                        <Button variant="outline" size="sm" className="mt-3 gap-2">
                          <PenLine className="h-3.5 w-3.5" /> Editar conteúdo
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              )}
            </ScrollReveal>

            {/* Sidebar: Parties + History */}
            <div className="space-y-6">

              {/* Parties / Signatures */}
              <ScrollReveal delay={0.15}>
                <Card className="border-primary/10">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileSignature className="h-4 w-4 text-indigo-500" />
                      Assinaturas ({signedCount}/{contract.parties.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {contract.parties.map((party) => (
                      <div key={party.id} className={`rounded-xl p-3 border ${party.signedAt ? "border-green-200 bg-green-50 dark:bg-green-900/10" : party.rejectedAt ? "border-red-200 bg-red-50 dark:bg-red-900/10" : "border-border bg-muted/20"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{party.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{party.email}</p>
                            <p className="text-xs text-muted-foreground capitalize mt-0.5">
                              {party.partyRole === "sender" ? "Prestador" : "Cliente"}
                            </p>
                          </div>
                          {party.signedAt ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          ) : party.rejectedAt ? (
                            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                        {party.signedAt && (
                          <p className="text-xs text-green-600 mt-1.5">
                            Assinado em {new Date(party.signedAt).toLocaleString("pt-BR")}
                          </p>
                        )}
                        {party.rejectedAt && (
                          <p className="text-xs text-red-600 mt-1.5">
                            Recusado em {new Date(party.rejectedAt).toLocaleString("pt-BR")}
                          </p>
                        )}
                        {!party.signedAt && !party.rejectedAt && contract.status !== "draft" && (
                          <div className="mt-2 space-y-1.5">
                            {party.viewedAt && (
                              <p className="text-xs text-muted-foreground">
                                Visualizado {party.viewCount}x
                              </p>
                            )}
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 gap-1 flex-1"
                                onClick={() => handleCopySigningLink(party.signatureToken)}
                              >
                                <Copy className="h-3 w-3" />
                                {copiedToken === party.signatureToken ? "Copiado!" : "Copiar link"}
                              </Button>
                              <a
                                href={`${baseUrl}/assinar/${party.signatureToken}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button size="sm" variant="outline" className="h-7 px-2">
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </ScrollReveal>

              {/* Audit History */}
              {contract.events && contract.events.length > 0 && (
                <ScrollReveal delay={0.2}>
                  <Card className="border-primary/10">
                    <CardHeader
                      className="cursor-pointer select-none"
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <History className="h-4 w-4 text-muted-foreground" />
                          Histórico
                        </span>
                        {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </CardTitle>
                    </CardHeader>
                    {showHistory && (
                      <CardContent>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {contract.events.map((evt) => (
                            <div key={evt.id} className="flex gap-2.5 text-sm">
                              <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-xs">{EVENT_LABELS[evt.eventType] ?? evt.eventType}</p>
                                {evt.actorName && <p className="text-xs text-muted-foreground">por {evt.actorName}</p>}
                                <p className="text-xs text-muted-foreground">
                                  {new Date(evt.createdAt).toLocaleString("pt-BR")}
                                  {evt.ipAddress && ` · IP: ${evt.ipAddress}`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </ScrollReveal>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
