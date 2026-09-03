"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Check,
  FileText,
  User,
  Calendar,
  DollarSign,
  History,
  ChevronDown,
  ChevronUp,
  Trash2,
  Download,
  RefreshCw,
  CalendarCheck,
  Briefcase,
  Printer,
  ShieldCheck,
  FileX2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/api-service";
import { formatDateOnly } from "@/components/jobs/negotiation";
import { ContractHtml } from "@/components/contracts/contract-html";
import { ShareLinkPanel } from "@/components/contracts/share-link-panel";
import { apiErrorMessage, buildVerifyUrl, copyToClipboard } from "@/lib/contracts/contract-utils";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";

interface Party {
  id: string;
  partyRole: "sender" | "recipient";
  userId?: string | null;
  name: string;
  email: string;
  document?: string | null;
  /** Vazio quando o leitor não é o dono nem a própria parte (o backend oculta). */
  signatureToken: string;
  signedAt?: string | null;
  signatureHash?: string | null;
  signatureUserId?: string | null;
  viewedAt?: string | null;
  viewCount: number;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
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
  ownerId: string;
  ownerName: string;
  clientName: string;
  clientEmail: string;
  clientDocument?: string | null;
  body: string;
  status: string;
  source: string;
  creationType: string;
  uploadedFileUrl?: string | null;
  contractValue?: number | null;
  serviceStartDate?: string | null;
  serviceEndDate?: string | null;
  expiresAt?: string | null;
  signedPdfUrl?: string | null;
  professionalId?: string | null;
  jobApplicationId?: string | null;
  agendaBlockedAt?: string | null;
  paymentStatus?: string;
  serviceCompletedAt?: string | null;
  reviewRequestedAt?: string | null;
  revisionOf?: string | null;
  supersededBy?: string | null;
  bodyHash?: string | null;
  sentAt?: string | null;
  terminatedAt?: string | null;
  terminatedBy?: string | null;
  terminationReason?: string | null;
  createdAt: string;
  updatedAt: string;
  parties: Party[];
  events?: ContractEvent[];
  viewerRole?: "owner" | "professional" | "party";
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Rascunho", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", icon: PenLine },
  sent: { label: "Enviado — Aguardando Assinaturas", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: Send },
  partially_signed: { label: "Parcialmente Assinado", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300", icon: Clock },
  fully_signed: { label: "Totalmente Assinado", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircle2 },
  rejected: { label: "Recusado por uma das partes", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
  expired: { label: "Expirado sem assinatura", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", icon: AlertCircle },
  terminated: { label: "Encerrado por distrato", color: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: FileX2 },
};

const EVENT_LABELS: Record<string, string> = {
  created: "Contrato criado",
  updated: "Contrato editado",
  sent: "Enviado para assinatura (texto congelado)",
  viewed: "Link de assinatura aberto",
  signed: "Contrato assinado",
  rejected: "Assinatura recusada",
  cancelled: "Contrato cancelado",
  expired: "Prazo de assinatura vencido",
  revised: "Nova versão gerada",
  terminated: "Contrato encerrado (distrato)",
  downloaded: "PDF baixado",
  reminder_sent: "Lembrete de assinatura registrado na plataforma",
  agenda_blocked: "Agenda reservada para as duas partes",
  payment_skipped: "Cobrança pulada (pagamentos em breve)",
  completed: "Serviço concluído",
  review_requested: "Pedido de avaliação registrado na plataforma",
};

const PARTY_ROLE_LABELS: Record<string, string> = {
  sender: "Contratado(a)",
  recipient: "Contratante",
};

/** Datas "YYYY-MM-DD" e timestamps: sem deslocamento de fuso (evita o "dia anterior"). */
const fmtDate = (value?: string | null) => {
  if (!value) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDateOnly(value) : new Date(value).toLocaleDateString("pt-BR");
};
const fmtDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString("pt-BR") : "");

function ContratoDetailInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const { userProfile, loading } = useAuth();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loadingContract, setLoadingContract] = useState(true);
  const [sendingContract, setSendingContract] = useState(false);
  const [justSent, setJustSent] = useState(searchParams.get("enviado") === "1");
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [revising, setRevising] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showTerminate, setShowTerminate] = useState(false);
  const [terminateReason, setTerminateReason] = useState("");
  const [terminating, setTerminating] = useState(false);
  const [hashCopied, setHashCopied] = useState(false);
  const [error, setError] = useState(searchParams.get("erro") ?? "");

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
        setError(apiErrorMessage(e, "Contrato não encontrado."));
      } finally {
        setLoadingContract(false);
      }
    };
    fetch();
  }, [userProfile, id]);

  // Limpa ?enviado / ?erro da URL sem recarregar (F5 não repete o banner)
  useEffect(() => {
    if (searchParams.get("enviado") || searchParams.get("erro")) {
      window.history.replaceState(null, "", `/dashboard/contratos/${id}`);
    }
  }, [searchParams, id]);

  const handleSend = async () => {
    if (!contract) return;
    setSendingContract(true);
    setError("");
    try {
      const res = await apiClient.post(`/contracts/${id}/send`);
      setContract((prev) => (prev ? { ...prev, ...res.data } : prev));
      setJustSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      // Erro de plano: o interceptor do apiClient já abriu o modal de upgrade
      const data = (e as { response?: { data?: unknown } })?.response?.data;
      if (isPlanErrorBody(data)) return;
      setError(apiErrorMessage(e, "Erro ao enviar contrato."));
    } finally {
      setSendingContract(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    setError("");
    try {
      await apiClient.post(`/contracts/${id}/cancel`, { reason: cancelReason.trim() || undefined });
      setContract((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
      setShowCancelConfirm(false);
      setCancelReason("");
    } catch (e) {
      setError(apiErrorMessage(e, "Erro ao cancelar contrato."));
    } finally {
      setCancelling(false);
    }
  };

  // "Nova versão": clona como rascunho editável e arquiva o original — sem gastar cota
  const handleRevise = async () => {
    setRevising(true);
    setError("");
    try {
      const res = await apiClient.post(`/contracts/${id}/revise`);
      router.push(`/dashboard/contratos/${res.data.id}/editar`);
    } catch (e) {
      const data = (e as { response?: { data?: unknown } })?.response?.data;
      if (!isPlanErrorBody(data)) setError(apiErrorMessage(e, "Erro ao gerar nova versão."));
      setRevising(false);
    }
  };

  const handleComplete = async () => {
    if (!contract) return;
    setCompleting(true);
    setError("");
    try {
      const res = await apiClient.post(`/contracts/${id}/complete`);
      const data = res.data && typeof res.data === "object" && "id" in res.data ? res.data : { serviceCompletedAt: new Date().toISOString() };
      setContract((prev) => (prev ? { ...prev, ...data } : prev));
      setShowCompleteConfirm(false);
    } catch (e) {
      setError(apiErrorMessage(e, "Erro ao concluir o serviço."));
    } finally {
      setCompleting(false);
    }
  };

  const handleTerminate = async () => {
    if (terminateReason.trim().length < 10) {
      setError("Descreva o motivo do distrato com pelo menos 10 caracteres.");
      return;
    }
    setTerminating(true);
    setError("");
    try {
      const res = await apiClient.post(`/contracts/${id}/terminate`, { reason: terminateReason.trim() });
      setContract((prev) => (prev ? { ...prev, ...res.data } : prev));
      setShowTerminate(false);
      setTerminateReason("");
    } catch (e) {
      setError(apiErrorMessage(e, "Erro ao registrar o distrato."));
    } finally {
      setTerminating(false);
    }
  };

  const handleCopyHash = async () => {
    if (!contract?.bodyHash) return;
    if (await copyToClipboard(contract.bodyHash)) {
      setHashCopied(true);
      setTimeout(() => setHashCopied(false), 2500);
    }
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

  if (!contract) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-12 px-4 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
            <h2 className="text-xl font-semibold">Contrato não encontrado</h2>
            {error && <p className="text-sm text-muted-foreground">{error}</p>}
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
  const status = contract.status;
  // Papéis: dono (quem criou) edita/envia/cancela; profissional vinculado ao acordo e
  // partes com conta só leem, assinam e — depois de assinado — concluem/encerram.
  const viewerRole = contract.viewerRole ?? "owner";
  const isOwner = viewerRole === "owner";
  const isProfessional = viewerRole === "professional";
  const isSuperseded = Boolean(contract.supersededBy);
  const ownParty = contract.parties.find((p) => p.userId === userProfile.id);
  const isAwaiting = status === "sent" || status === "partially_signed";

  const canEdit = isOwner && status === "draft";
  const canSend = isOwner && status === "draft";
  // Mesmas regras do backend (Contract.cancel): assinado por todos → só distrato
  const canCancel = isOwner && !isSuperseded && ["draft", "sent", "partially_signed", "rejected", "expired"].includes(status);
  const canRevise = isOwner && !isSuperseded && ["sent", "partially_signed", "rejected", "expired"].includes(status);
  const canComplete = (isOwner || isProfessional) && status === "fully_signed" && !contract.serviceCompletedAt;
  const canTerminate = status === "fully_signed" && (isOwner || isProfessional || !!ownParty);
  const canSignNow = !!ownParty?.signatureToken && !ownParty.signedAt && !ownParty.rejectedAt && isAwaiting;
  const canShare = isOwner && isAwaiting && !isSuperseded;
  const signedCount = contract.parties?.filter((p) => p.signedAt).length ?? 0;
  const rejectedParties = contract.parties.filter((p) => p.rejectedAt);
  const printHref = `/dashboard/contratos/${id}/imprimir`;

  // Timeline do fluxo integrado (só quando há profissional vinculado ao contrato)
  const hasFlow = Boolean(contract.professionalId);
  const flowSteps: Array<{ label: string; done: boolean; detail?: string; disabled?: boolean }> = hasFlow ? [
    { label: "Contrato gerado", done: true, detail: fmtDate(contract.createdAt) },
    { label: "Assinaturas", done: status === "fully_signed" || status === "terminated" || Boolean(contract.serviceCompletedAt), detail: `${signedCount}/${contract.parties.length} assinaram` },
    { label: "Pagamento", done: false, detail: "Em breve (Asaas)", disabled: true },
    { label: "Agenda reservada", done: Boolean(contract.agendaBlockedAt), detail: contract.agendaBlockedAt ? fmtDate(contract.agendaBlockedAt) : contract.serviceStartDate ? "Após assinatura completa" : "Sem data do serviço" },
    { label: "Serviço concluído", done: Boolean(contract.serviceCompletedAt), detail: contract.serviceCompletedAt ? fmtDate(contract.serviceCompletedAt) : "" },
    { label: "Avaliação", done: Boolean(contract.reviewRequestedAt), detail: contract.reviewRequestedAt ? "Pedido registrado na plataforma" : "" },
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
                {canSignNow && ownParty && (
                  <Link href={`/assinar/${ownParty.signatureToken}`}>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                      <FileSignature className="h-3.5 w-3.5" /> Assinar contrato
                    </Button>
                  </Link>
                )}
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
                    {sendingContract ? "Gerando links..." : "Enviar para Assinatura"}
                  </Button>
                )}
                {canRevise && (
                  <Button size="sm" variant="outline" className="gap-2" onClick={handleRevise} disabled={revising}>
                    <RefreshCw className={`h-3.5 w-3.5 ${revising ? "animate-spin" : ""}`} />
                    {revising ? "Gerando..." : "Nova versão"}
                  </Button>
                )}
                {canComplete && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={() => setShowCompleteConfirm(true)}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Concluir Serviço
                  </Button>
                )}
                {status !== "draft" && (
                  <a href={printHref} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Printer className="h-3.5 w-3.5" /> Imprimir / PDF
                    </Button>
                  </a>
                )}
                {contract.signedPdfUrl && (
                  <a href={contract.signedPdfUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-2 text-green-600 border-green-300 hover:bg-green-50">
                      <Download className="h-3.5 w-3.5" /> PDF Assinado
                    </Button>
                  </a>
                )}
                {canTerminate && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-slate-600 border-slate-300 hover:bg-slate-50 gap-2"
                    onClick={() => setShowTerminate(true)}
                  >
                    <FileX2 className="h-3.5 w-3.5" /> Distrato
                  </Button>
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
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 text-red-700 text-sm px-4 py-3 flex items-start justify-between gap-3">
              <span>{error}</span>
              <button type="button" className="text-xs underline flex-shrink-0" onClick={() => setError("")}>fechar</button>
            </div>
          )}

          {/* Enviado agora: o próximo passo é compartilhar o link */}
          {justSent && isAwaiting && (
            <ScrollReveal>
              <div className="rounded-xl border-2 border-green-300 bg-green-50 dark:bg-green-900/20 p-5 space-y-1">
                <p className="font-semibold text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Contrato pronto para assinatura
                </p>
                <p className="text-sm text-green-700/90">
                  O texto foi congelado e os links de assinatura foram gerados. <strong>Próximo passo:</strong> envie o link
                  à outra parte pelo painel abaixo — a plataforma não envia e-mail por você.
                  {ownParty && !ownParty.signedAt && " Não esqueça de assinar a sua via também."}
                </p>
              </div>
            </ScrollReveal>
          )}

          {/* Compartilhamento do link (só o dono vê os tokens) */}
          {canShare && (
            <ScrollReveal>
              <ShareLinkPanel
                title={contract.title}
                ownerName={contract.ownerName}
                expiresAt={contract.expiresAt}
                parties={contract.parties}
                viewerId={userProfile.id}
              />
            </ScrollReveal>
          )}

          {/* Cancel Confirmation */}
          {showCancelConfirm && (
            <ScrollReveal>
              <div className="rounded-xl border-2 border-red-300 bg-red-50 dark:bg-red-900/20 p-5 space-y-3">
                <p className="font-semibold text-red-700">Confirmar cancelamento</p>
                <p className="text-sm text-red-600">
                  Esta ação não pode ser desfeita. Os links de assinatura deixam de funcionar
                  {contract.agendaBlockedAt ? " e a reserva na agenda é liberada" : ""}.
                  {status !== "draft" && " As partes com conta na plataforma são notificadas."}
                </p>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Motivo (opcional) — a outra parte verá esta mensagem"
                  rows={2}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30"
                />
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
                  O contrato será marcado como concluído. Se a outra parte tiver conta na IsoScanning, ela recebe
                  aqui na plataforma (sino e notificações) um pedido para avaliar o serviço — nenhum e-mail é enviado.
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

          {/* Distrato: encerra contrato já assinado por acordo entre as partes */}
          <Dialog open={showTerminate} onOpenChange={(open) => { setShowTerminate(open); if (!open) setTerminateReason(""); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><FileX2 className="h-4 w-4" /> Registrar distrato</DialogTitle>
                <DialogDescription>
                  O contrato assinado não é apagado: ele passa ao status <strong>Encerrado por distrato</strong>, com data,
                  autor e motivo registrados no histórico. A reserva de agenda é liberada e as partes com conta são notificadas.
                  Combine o encerramento com a outra parte antes de registrar.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo do distrato *</label>
                <Textarea
                  value={terminateReason}
                  onChange={(e) => setTerminateReason(e.target.value)}
                  placeholder="Ex.: Evento cancelado pelo contratante; partes acordaram o encerramento sem multa."
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground">{terminateReason.trim().length}/1000 · mínimo 10 caracteres</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowTerminate(false)} disabled={terminating}>Voltar</Button>
                <Button
                  className="bg-slate-700 hover:bg-slate-800 text-white"
                  onClick={handleTerminate}
                  disabled={terminating || terminateReason.trim().length < 10}
                >
                  {terminating ? "Registrando..." : "Confirmar distrato"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Versões: este contrato foi substituído / é revisão de outro */}
          {(contract.supersededBy || contract.revisionOf) && (
            <ScrollReveal>
              <div className="rounded-xl border bg-muted/40 px-5 py-3 text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                {contract.supersededBy && (
                  <span>
                    Este contrato foi substituído por uma nova versão.{" "}
                    <Link href={`/dashboard/contratos/${contract.supersededBy}`} className="text-indigo-600 hover:underline font-medium">
                      Abrir versão atual
                    </Link>
                  </span>
                )}
                {contract.revisionOf && (
                  <span>
                    Nova versão de um contrato anterior.{" "}
                    <Link href={`/dashboard/contratos/${contract.revisionOf}`} className="text-indigo-600 hover:underline font-medium">
                      Ver versão anterior
                    </Link>
                  </span>
                )}
              </div>
            </ScrollReveal>
          )}

          {/* Distrato registrado */}
          {status === "terminated" && (
            <ScrollReveal>
              <div className="rounded-xl border-2 border-slate-300 bg-slate-50 dark:bg-slate-900/30 p-5 space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                  Distrato registrado{contract.terminatedAt && ` em ${fmtDateTime(contract.terminatedAt)}`}
                </p>
                {contract.terminationReason && (
                  <p className="text-sm text-slate-700/90 dark:text-slate-300 italic">&quot;{contract.terminationReason}&quot;</p>
                )}
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  As assinaturas e o código de verificação continuam válidos como registro do que foi acordado até o encerramento.
                </p>
              </div>
            </ScrollReveal>
          )}

          {/* Recusa: motivo visível para as duas partes */}
          {rejectedParties.length > 0 && (
            <ScrollReveal>
              <div className="rounded-xl border-2 border-red-200 bg-red-50 dark:bg-red-900/10 p-5 space-y-2">
                {rejectedParties.map((p) => (
                  <div key={p.id}>
                    <p className="font-semibold text-red-700">
                      {p.userId === userProfile.id ? "Você recusou" : `${p.name} recusou`} a assinatura
                      {p.rejectedAt && <span className="font-normal text-red-600/80"> em {fmtDateTime(p.rejectedAt)}</span>}
                    </p>
                    {p.rejectionReason && <p className="text-sm text-red-700/90 italic">&quot;{p.rejectionReason}&quot;</p>}
                  </div>
                ))}
                {canRevise && (
                  <p className="text-sm text-red-700/80 pt-1">
                    Ajuste os termos gerando uma <strong>nova versão</strong> — ela nasce como rascunho editável e este contrato fica arquivado.
                  </p>
                )}
              </div>
            </ScrollReveal>
          )}

          {/* Prazo vencido */}
          {status === "expired" && canRevise && (
            <ScrollReveal>
              <div className="rounded-xl border-2 border-orange-200 bg-orange-50 dark:bg-orange-900/10 p-5 text-sm text-orange-800 dark:text-orange-200">
                O prazo de assinatura venceu{contract.expiresAt && ` em ${fmtDate(contract.expiresAt)}`} e os links deixaram de funcionar.
                Gere uma <strong>nova versão</strong> com um novo prazo (não consome cota) ou cancele o contrato.
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
                  {(contract.jobApplicationId || contract.agendaBlockedAt) && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t">
                      {contract.agendaBlockedAt && (
                        <Link href="/dashboard/agenda">
                          <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
                            <CalendarCheck className="h-3.5 w-3.5 text-green-600" /> Ver na agenda
                          </Button>
                        </Link>
                      )}
                      {contract.jobApplicationId && (
                        <Link href={isOwner ? "/dashboard/vagas" : `/dashboard/candidaturas?candidatura=${contract.jobApplicationId}`}>
                          <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
                            <Briefcase className="h-3.5 w-3.5" /> {isOwner ? "Ver vaga" : "Ver candidatura"}
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
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
                {status !== "draft" && (
                  <span className="text-sm ml-2 opacity-80">
                    · {signedCount} de {contract.parties.length} partes assinaram
                  </span>
                )}
                {!isOwner && status === "draft" && (
                  <span className="text-sm ml-2 opacity-80">· o contratante ainda não enviou para assinatura</span>
                )}
                {isOwner && status === "draft" && (
                  <span className="text-sm ml-2 opacity-80">· ao enviar, o texto é congelado e os links de assinatura são gerados</span>
                )}
              </div>
              {contract.expiresAt && isAwaiting && (
                <span className="text-sm opacity-80">
                  Expira em {fmtDate(contract.expiresAt)}
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
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {contract.source === "standalone" ? "Independente" : contract.source === "proposal" ? "Proposta" : contract.source === "job_application" ? "Acordo de Vaga" : "Orçamento"}
                      </Badge>
                      {contract.creationType === "upload" && (
                        <Badge variant="outline" className="text-xs">PDF enviado (legado)</Badge>
                      )}
                      {!isOwner && (
                        <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-300">
                          {ownParty ? `Você é ${PARTY_ROLE_LABELS[ownParty.partyRole]?.toLowerCase() ?? "parte"}` : "Você é a parte contratada"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{isOwner ? "Contratante" : "Criado por"}</p>
                        <p className="text-sm font-medium">{isOwner ? contract.clientName : contract.ownerName}</p>
                        {isOwner && <p className="text-xs text-muted-foreground">{contract.clientEmail}</p>}
                        {isOwner && contract.clientDocument && <p className="text-xs text-muted-foreground">CPF/CNPJ: {contract.clientDocument}</p>}
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
                            {fmtDate(contract.serviceStartDate)}
                            {contract.serviceEndDate && contract.serviceEndDate !== contract.serviceStartDate && ` — ${fmtDate(contract.serviceEndDate)}`}
                          </p>
                          {contract.agendaBlockedAt && (
                            <p className="text-xs text-green-600">Reservada na agenda</p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Criado em</p>
                        <p className="text-sm font-medium">{fmtDate(contract.createdAt)}</p>
                        {contract.sentAt && (
                          <p className="text-xs text-muted-foreground">Enviado em {fmtDateTime(contract.sentAt)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contract Body Preview */}
              {contract.creationType !== "upload" && (
                <Card className="border-primary/10">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between gap-2">
                      <span>Conteúdo do Contrato</span>
                      {status !== "draft" && (
                        <a href={printHref} target="_blank" rel="noopener noreferrer" className="text-xs font-normal text-indigo-600 hover:underline flex items-center gap-1">
                          <Printer className="h-3 w-3" /> Versão para impressão
                        </a>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-[32rem] overflow-y-auto border rounded-lg p-4 bg-muted/30">
                      <ContractHtml html={contract.body} />
                    </div>
                    {canEdit && (
                      <Link href={`/dashboard/contratos/${id}/editar`}>
                        <Button variant="outline" size="sm" className="mt-3 gap-2">
                          <PenLine className="h-3.5 w-3.5" /> Editar conteúdo
                        </Button>
                      </Link>
                    )}
                    {status === "draft" && (
                      <p className="text-xs text-muted-foreground mt-3">
                        Rascunho: o texto ainda pode ser alterado. No envio ele é congelado e recebe um código de verificação (SHA-256).
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
              {contract.creationType === "upload" && contract.uploadedFileUrl && (
                <a href={contract.uploadedFileUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-3.5 w-3.5" /> Abrir PDF enviado
                  </Button>
                </a>
              )}

              {/* Autenticidade */}
              {contract.bodyHash && (
                <Card className="border-primary/10">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-600" /> Autenticidade do documento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p className="text-xs text-muted-foreground">
                      Código de verificação gerado no envio a partir do texto do contrato. Qualquer alteração produz um código
                      diferente — é assim que se prova que o que foi assinado é exatamente este texto.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 min-w-0 text-[11px] font-mono break-all bg-muted/50 rounded-md px-2.5 py-2">{contract.bodyHash}</code>
                      <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs flex-shrink-0" onClick={handleCopyHash}>
                        {hashCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        {hashCopied ? "Copiado" : "Copiar"}
                      </Button>
                    </div>
                    <a href={buildVerifyUrl(contract.bodyHash)} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> Abrir página pública de verificação
                    </a>
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
                    {contract.parties.map((party) => {
                      const isMe = party.userId === userProfile.id;
                      const pending = !party.signedAt && !party.rejectedAt && isAwaiting;
                      return (
                        <div key={party.id} className={`rounded-xl p-3 border ${party.signedAt ? "border-green-200 bg-green-50 dark:bg-green-900/10" : party.rejectedAt ? "border-red-200 bg-red-50 dark:bg-red-900/10" : "border-border bg-muted/20"}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{party.name}{isMe && <span className="text-xs text-muted-foreground font-normal"> (você)</span>}</p>
                              <p className="text-xs text-muted-foreground truncate">{party.email}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {PARTY_ROLE_LABELS[party.partyRole] ?? party.partyRole}
                                {party.userId ? " · conta na plataforma" : " · assina pelo link"}
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
                            <div className="mt-1.5 space-y-0.5">
                              <p className="text-xs text-green-600">Assinado em {fmtDateTime(party.signedAt)}</p>
                              {party.document && <p className="text-[11px] text-muted-foreground">CPF/CNPJ: {party.document}</p>}
                              {party.signatureHash && (
                                <p className="text-[10px] font-mono text-muted-foreground truncate" title={party.signatureHash}>
                                  Assinatura: {party.signatureHash.slice(0, 16)}…
                                </p>
                              )}
                              {party.signatureUserId && <p className="text-[11px] text-muted-foreground">Assinou logado(a) na conta</p>}
                            </div>
                          )}
                          {party.rejectedAt && (
                            <p className="text-xs text-red-600 mt-1.5">Recusado em {fmtDateTime(party.rejectedAt)}</p>
                          )}
                          {pending && (
                            <div className="mt-2 space-y-1.5">
                              <p className="text-xs text-muted-foreground">
                                {party.viewedAt ? `Abriu o link ${party.viewCount}x · última em ${fmtDateTime(party.viewedAt)}` : "Ainda não abriu o link"}
                              </p>
                              {isMe && party.signatureToken && (
                                <Link href={`/assinar/${party.signatureToken}`} className="block">
                                  <Button size="sm" className="text-xs h-7 gap-1 w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                                    <FileSignature className="h-3 w-3" /> Assinar agora
                                  </Button>
                                </Link>
                              )}
                              {!isMe && isOwner && (
                                <p className="text-[11px] text-muted-foreground">Link e mensagem prontos no painel “Compartilhar link de assinatura”.</p>
                              )}
                            </div>
                          )}
                          {!party.signedAt && !party.rejectedAt && status === "draft" && isOwner && (
                            <p className="text-xs text-muted-foreground mt-2">O link de assinatura é gerado ao enviar o contrato.</p>
                          )}
                        </div>
                      );
                    })}
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
                          Histórico ({contract.events.length})
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
                                {typeof evt.metadata?.reason === "string" && evt.metadata.reason && (
                                  <p className="text-xs text-muted-foreground italic">&quot;{evt.metadata.reason}&quot;</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {fmtDateTime(evt.createdAt)}
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

export default function ContratoDetailPage() {
  return (
    <Suspense fallback={null}>
      <ContratoDetailInner />
    </Suspense>
  );
}
