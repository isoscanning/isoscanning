"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  ArrowLeft, ChevronRight, FileText, CalendarDays, MapPin, Clock,
  Hotel, Utensils, Car, Plane, Bus, Package,
  DollarSign, Trash2, AlertCircle, Pencil,
  Send, FileSignature, Undo2, CheckCircle2, XCircle, Hourglass, Eye,
  TrendingUp, User, Mail, Phone, Loader2, ExternalLink, CalendarCheck, Sparkles,
} from "lucide-react";
import apiClient from "@/lib/api-service";
import { ScrollReveal } from "@/components/scroll-reveal";
import { usePlan, usePlanUsage } from "@/lib/plans/use-plan";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";
import { ProposalSharePanel } from "@/components/budget/proposal-share-panel";
import { QuoteStatusBadge } from "@/components/budget/quote-status-badge";
import {
  CONTRACT_STATUS_LABELS,
  fmtBRL,
  formatDateLong,
  formatDateOnly,
  formatDateTime,
  hasActiveContract,
  quoteDisplayStatus,
  type BudgetQuoteData,
} from "@/lib/budget/budget-calc";

function errorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { status?: number; data?: { message?: string | string[] } } };
  const msg = e?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(" ");
  if (typeof msg === "string") return msg;
  return fallback;
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ""}` : `${m}min`;
}

// ── Pequenos blocos de UI ──────────────────────────────────────────

function CostRow({ label, value, sub = false, colorClass = "" }: { label: string; value: number; sub?: boolean; colorClass?: string }) {
  return (
    <div className={`flex items-center justify-between text-sm py-2 border-b border-border/40 last:border-0 ${sub ? "pl-5" : ""}`}>
      <div className="flex items-center gap-2 min-w-0 pr-2">
        {sub && <div className="w-1 h-1 rounded-full bg-muted-foreground shrink-0" />}
        <span className="text-muted-foreground truncate">{label}</span>
      </div>
      <span className={`font-semibold shrink-0 ${colorClass}`}>{fmtBRL(value)}</span>
    </div>
  );
}

// Tailwind não gera classes dinâmicas (`border-${color}-200`): mapa estático.
const SECTION_STYLES: Record<string, { card: string; icon: string }> = {
  amber: { card: "border-amber-200/50 dark:border-amber-800/30", icon: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
  violet: { card: "border-violet-200/50 dark:border-violet-800/30", icon: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400" },
  blue: { card: "border-blue-200/50 dark:border-blue-800/30", icon: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" },
  green: { card: "border-green-200/50 dark:border-green-800/30", icon: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" },
  orange: { card: "border-orange-200/50 dark:border-orange-800/30", icon: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" },
  slate: { card: "border-slate-200/50 dark:border-slate-800/30", icon: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" },
};

function Section({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: keyof typeof SECTION_STYLES; children: React.ReactNode }) {
  const s = SECTION_STYLES[color] ?? SECTION_STYLES.slate;
  return (
    <Card className={`border shadow-sm ${s.card}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.icon}`}>{icon}</div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Banner({ tone, icon, title, description, children }: {
  tone: "success" | "error" | "warning" | "info";
  icon: React.ReactNode; title: string; description?: React.ReactNode; children?: React.ReactNode;
}) {
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-200",
    error: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200",
    warning: "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900/50 dark:bg-orange-900/20 dark:text-orange-200",
    info: "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-200",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">{title}</p>
          {description && <div className="text-xs mt-0.5 opacity-90">{description}</div>}
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}

// ── Página ─────────────────────────────────────────────────────────

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const plan = usePlan();
  const { usage, refresh: refreshUsage } = usePlanUsage(!!userProfile);

  const [quote, setQuote] = useState<BudgetQuoteData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [creatingContract, setCreatingContract] = useState(false);
  const [showClientItems, setShowClientItems] = useState(false);

  const id = params.id as string;

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  const load = useCallback(async () => {
    if (!userProfile || !id) return;
    try {
      const res = await apiClient.get(`/budget-quotes/${id}`);
      setQuote(res.data);
    } catch {
      toast.error("Orçamento não encontrado.");
      router.push("/dashboard/calculadora-orcamento");
    } finally {
      setFetching(false);
    }
  }, [userProfile, id, router]);

  useEffect(() => { void load(); }, [load]);

  // ── Ações ────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!quote) return;
    setSending(true);
    try {
      const res = await apiClient.post(`/budget-quotes/${quote.id}/send`);
      setQuote((q) => ({ ...(res.data as BudgetQuoteData), contract: q?.contract ?? null }));
      setSendOpen(false);
      toast.success("Proposta pronta para o cliente!", { description: "Compartilhe o link pelo WhatsApp ou e-mail. Você será avisado quando ele responder." });
      void refreshUsage();
    } catch (err) {
      if (isPlanErrorBody((err as { response?: { data?: unknown } })?.response?.data)) { setSendOpen(false); return; }
      toast.error(errorMessage(err, "Não foi possível enviar a proposta."));
      setSendOpen(false);
    } finally {
      setSending(false);
    }
  };

  const handleWithdraw = async () => {
    if (!quote) return;
    setWithdrawing(true);
    try {
      const res = await apiClient.post(`/budget-quotes/${quote.id}/withdraw`);
      setQuote((q) => ({ ...(res.data as BudgetQuoteData), contract: q?.contract ?? null }));
      setWithdrawOpen(false);
      toast.success("Proposta retirada.", { description: "O link antigo deixou de funcionar. Edite e reenvie quando quiser." });
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível retirar a proposta."));
      setWithdrawOpen(false);
    } finally {
      setWithdrawing(false);
    }
  };

  const handleCreateContract = async () => {
    if (!quote) return;
    setCreatingContract(true);
    try {
      const res = await apiClient.post(`/contracts/from-budget-quote/${quote.id}`);
      toast.success("Contrato gerado a partir da proposta.", { description: "Revise o texto e envie para assinatura." });
      router.push(`/dashboard/contratos/${res.data.id}`);
    } catch (err) {
      if (isPlanErrorBody((err as { response?: { data?: unknown } })?.response?.data)) { setContractOpen(false); return; }
      toast.error(errorMessage(err, "Não foi possível gerar o contrato."));
      setContractOpen(false);
    } finally {
      setCreatingContract(false);
    }
  };

  const handleDelete = async () => {
    if (!quote) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/budget-quotes/${quote.id}`);
      toast.success("Orçamento excluído.");
      router.push("/dashboard/calculadora-orcamento");
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível excluir o orçamento."));
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (loading || fetching || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }
  if (!quote) return null;

  // ── Derivados ────────────────────────────────────────────────────

  const b = quote.breakdown;
  const display = quoteDisplayStatus(quote);
  const activeContract = hasActiveContract(quote);
  const editable = quote.isEditable && !activeContract;
  const canSend = (quote.status === "draft" || quote.status === "rejected" || (quote.status === "sent" && quote.isExpired)) && !activeContract;
  const canWithdraw = (quote.status === "sent" || quote.status === "approved") && !activeContract;
  const canCreateContract = quote.status !== "rejected" && !activeContract;
  const hasClient = !!quote.clientName?.trim() && !!quote.clientEmail?.trim();
  const missingForSend: string[] = [];
  if (!hasClient) missingForSend.push("nome e e-mail do cliente");
  if (quote.finalPrice <= 0) missingForSend.push("preço da proposta");
  const editHref = (step?: number) => `/dashboard/calculadora-orcamento/novo-orcamento?editId=${quote.id}${step !== undefined ? `&step=${step}` : ""}`;

  const proposalLimit = plan.limitOf("budgetProposalsPerMonth");
  const proposalsUsed = usage.budgetProposalsPerMonth ?? 0;
  const effectiveMargin = quote.totalCost > 0 ? ((quote.finalPrice - quote.totalCost) / quote.totalCost) * 100 : 0;

  const members = quote.additionalStaff?.members ?? [];
  const legacyStaff = members.length === 0 && quote.additionalStaff?.enabled;
  const transportLabel = {
    none: "Sem transporte",
    air: "Transporte aéreo",
    ground: "Transporte terrestre",
    own_vehicle: "Veículo próprio",
  }[quote.transport.type];
  const period =
    quote.eventDate && quote.eventEndDate && quote.eventEndDate !== quote.eventDate
      ? `${formatDateOnly(quote.eventDate)} a ${formatDateOnly(quote.eventEndDate)}`
      : formatDateLong(quote.eventDate);

  return (
    <div className="min-h-screen flex flex-col bg-background/50">
      <Header />
      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-3xl space-y-8">
          <ScrollReveal>
          <div className="space-y-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/dashboard/calculadora-orcamento" className="hover:text-foreground transition-colors">Calculadora</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium truncate">{quote.eventName}</span>
            </div>

            {/* Hero */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 p-6 md:p-8 border border-amber-500/10">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow shrink-0">
                    <FileText className="h-7 w-7" />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-bold leading-tight">{quote.eventName}</h1>
                      <QuoteStatusBadge status={display} />
                    </div>
                    {quote.clientName && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <User className="h-3.5 w-3.5" />{quote.clientName}
                      </div>
                    )}
                    {quote.eventLocation && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />{quote.eventLocation}
                      </div>
                    )}
                    {quote.eventDate && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />{period}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />{quote.coverageHours}h de cobertura
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {editable && (
                    <Link href={editHref()} title="Editar">
                      <Button variant="ghost" size="icon" className="hover:text-amber-500 hover:bg-amber-500/10"><Pencil className="h-4 w-4" /></Button>
                    </Link>
                  )}
                  {!activeContract && (
                    <Button variant="ghost" size="icon" title="Excluir" className="hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
            </div>

            {/* ── Estado da proposta ── */}
            {display === "contracted" && quote.contract && (
              <Banner tone="info" icon={<FileSignature className="h-5 w-5" />}
                title={CONTRACT_STATUS_LABELS[quote.contract.status] ?? "Contrato vinculado"}
                description={quote.contract.status === "fully_signed"
                  ? "Agenda reservada e lançamento a receber criado no financeiro."
                  : "A proposta está congelada enquanto o contrato estiver em andamento."}>
                <Link href={`/dashboard/contratos/${quote.contract.id}`}>
                  <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"><FileSignature className="h-4 w-4" /> Abrir contrato</Button>
                </Link>
              </Banner>
            )}

            {display === "approved" && (
              <Banner tone="success" icon={<CheckCircle2 className="h-5 w-5" />}
                title={quote.responseName ? `Aprovada por ${quote.responseName} em ${formatDateTime(quote.respondedAt)}` : "Aprovada pelo cliente"}
                description={
                  <>
                    {quote.responseMessage && <p className="italic mb-1">“{quote.responseMessage}”</p>}
                    {quote.eventDate
                      ? <span className="inline-flex items-center gap-1"><CalendarCheck className="h-3.5 w-3.5" /> A data foi reservada provisoriamente na sua agenda. Gere o contrato para fechar de vez.</span>
                      : "O evento não tem data: defina a data no contrato para reservar a agenda."}
                  </>
                }>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setContractOpen(true)} disabled={creatingContract}>
                    <FileSignature className="h-4 w-4" /> Gerar contrato
                  </Button>
                  {quote.eventDate && (
                    <Link href="/dashboard/agenda"><Button size="sm" variant="outline" className="gap-2"><CalendarCheck className="h-4 w-4" /> Ver na agenda</Button></Link>
                  )}
                </div>
              </Banner>
            )}

            {display === "rejected" && (
              <Banner tone="error" icon={<XCircle className="h-5 w-5" />}
                title={quote.responseName ? `Recusada por ${quote.responseName} em ${formatDateTime(quote.respondedAt)}` : "Recusada pelo cliente"}
                description={quote.responseMessage ? <p className="italic">“{quote.responseMessage}”</p> : "Ajuste o valor ou o escopo e reenvie."}>
                <Link href={editHref(6)}><Button size="sm" variant="outline" className="gap-2"><Pencil className="h-4 w-4" /> Editar e reenviar</Button></Link>
              </Banner>
            )}

            {display === "expired" && (
              <Banner tone="warning" icon={<Hourglass className="h-5 w-5" />}
                title={`Validade encerrada em ${formatDateOnly(quote.validUntil)}`}
                description="O cliente não consegue mais responder por este link. Ajuste a validade e reenvie.">
                <div className="flex flex-wrap gap-2">
                  <Link href={editHref(6)}><Button size="sm" variant="outline" className="gap-2"><Pencil className="h-4 w-4" /> Ajustar validade</Button></Link>
                  <Button size="sm" variant="ghost" className="gap-2" onClick={() => setWithdrawOpen(true)}><Undo2 className="h-4 w-4" /> Retirar proposta</Button>
                </div>
              </Banner>
            )}

            {/* ── Link público (enviada) ── */}
            {(display === "sent" || display === "viewed") && quote.shareToken && (
              <ProposalSharePanel
                token={quote.shareToken}
                eventName={quote.eventName}
                ownerName={userProfile.displayName}
                clientName={quote.clientName}
                clientEmail={quote.clientEmail}
                clientPhone={quote.clientPhone}
                price={quote.finalPrice}
                validUntil={quote.validUntil}
                viewCount={quote.viewCount}
                viewedAt={quote.viewedAt}
              />
            )}

            {/* ── Ações principais ── */}
            {(display === "draft" || display === "sent" || display === "viewed") && (
              <div className="rounded-2xl border bg-card shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold text-sm">Próximo passo</p>
                    <p className="text-xs text-muted-foreground">
                      {display === "draft"
                        ? "Envie a proposta para o cliente aprovar pelo link, ou gere o contrato direto."
                        : "Aguardando a resposta do cliente. Você pode gerar o contrato direto se preferir."}
                    </p>
                  </div>
                  {proposalLimit !== null && (
                    <span className="text-[11px] text-muted-foreground">
                      {proposalsUsed} de {proposalLimit} propostas enviadas no mês
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {canSend && (
                    missingForSend.length > 0 ? (
                      <Link href={editHref(6)}>
                        <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"><Send className="h-4 w-4" /> Completar dados e enviar</Button>
                      </Link>
                    ) : (
                      <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setSendOpen(true)} disabled={sending}>
                        <Send className="h-4 w-4" /> Enviar ao cliente
                      </Button>
                    )
                  )}
                  {canCreateContract && (
                    <Button variant="outline" className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-500/10 hover:text-indigo-600" onClick={() => setContractOpen(true)} disabled={creatingContract}>
                      <FileSignature className="h-4 w-4" /> Gerar contrato
                    </Button>
                  )}
                  {canWithdraw && (
                    <Button variant="ghost" className="gap-2" onClick={() => setWithdrawOpen(true)}>
                      <Undo2 className="h-4 w-4" /> Retirar proposta
                    </Button>
                  )}
                </div>
                {missingForSend.length > 0 && canSend && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Falta informar: {missingForSend.join(" e ")}.
                  </p>
                )}
              </div>
            )}

            {/* ── Preço ── */}
            <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white shadow-lg shadow-amber-500/20">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <p className="text-amber-100 text-sm font-medium mb-1">Preço da proposta</p>
                  <p className="text-4xl font-bold">{fmtBRL(quote.finalPrice)}</p>
                  <p className="text-amber-200 text-xs mt-2">
                    Custo {fmtBRL(quote.totalCost)} · margem {quote.marginPercent}%{quote.discount > 0 ? ` · desconto ${fmtBRL(quote.discount)}` : ""}
                  </p>
                </div>
                <div className="rounded-xl bg-white/15 backdrop-blur px-4 py-3 text-right">
                  <p className="text-amber-100 text-xs flex items-center gap-1 justify-end"><TrendingUp className="h-3.5 w-3.5" /> Lucro previsto</p>
                  <p className={`text-xl font-bold ${quote.profit < 0 ? "text-red-100" : ""}`}>{fmtBRL(quote.profit)}</p>
                  <p className="text-amber-200 text-[11px]">{effectiveMargin.toFixed(1)}% sobre o custo</p>
                </div>
              </div>
              {quote.profit < 0 && (
                <p className="mt-3 text-xs bg-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> O desconto deixou o preço abaixo do custo. Revise antes de enviar.
                </p>
              )}
              {quote.finalPrice === quote.totalCost && quote.marginPercent === 0 && (
                <p className="mt-3 text-xs bg-white/15 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Preço igual ao custo: defina uma margem no passo "Preço &amp; Cliente" para ter lucro.
                </p>
              )}
            </div>

            {/* ── O que o cliente vê ── */}
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <button type="button" onClick={() => setShowClientItems((v) => !v)} className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-amber-500" />
                  <p className="font-bold text-sm">O que o cliente vê na proposta</p>
                </div>
                <span className="text-xs text-muted-foreground">{showClientItems ? "Ocultar" : "Mostrar"}</span>
              </button>
              {showClientItems && (
                <div className="px-5 pb-5 space-y-3 text-sm">
                  <p className="text-xs text-muted-foreground">
                    O cliente nunca vê seu custo nem a margem — só o valor final{quote.showBreakdown ? " e estes itens (com a margem já distribuída)" : ""}.
                  </p>
                  {quote.showBreakdown ? (
                    <div className="space-y-0.5">
                      {quote.clientLineItems.map((i) => <CostRow key={i.key} label={i.label} value={i.amount} />)}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">Detalhamento por itens desligado — o cliente vê apenas o total.</p>
                  )}
                  {quote.scopeNotes && (<div><p className="font-medium text-xs mb-1">Escopo e entregas</p><p className="text-muted-foreground whitespace-pre-line">{quote.scopeNotes}</p></div>)}
                  {quote.paymentTerms && (<div><p className="font-medium text-xs mb-1">Condições de pagamento</p><p className="text-muted-foreground whitespace-pre-line">{quote.paymentTerms}</p></div>)}
                  {quote.validUntil && <p className="text-xs text-muted-foreground">Válida até {formatDateOnly(quote.validUntil)}</p>}
                </div>
              )}
            </div>

            {/* ── Cliente ── */}
            <Section icon={<User className="h-4 w-4" />} title="Cliente" color="slate">
              {hasClient ? (
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Nome</p><p className="font-medium">{quote.clientName}</p></div>
                  <div><p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> E-mail</p><p className="font-medium break-all">{quote.clientEmail}</p></div>
                  {quote.clientPhone && <div><p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</p><p className="font-medium">{quote.clientPhone}</p></div>}
                  {quote.clientDocument && <div><p className="text-xs text-muted-foreground">CPF/CNPJ</p><p className="font-medium">{quote.clientDocument}</p></div>}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm text-muted-foreground">Nenhum cliente informado ainda.</p>
                  {editable && <Link href={editHref(6)}><Button size="sm" variant="outline" className="gap-2"><Pencil className="h-3.5 w-3.5" /> Informar cliente</Button></Link>}
                </div>
              )}
            </Section>

            {/* ── Custos ── */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider pt-2">Composição do custo (só você vê)</h2>

              <Section icon={<Clock className="h-4 w-4" />} title="Mão de Obra" color="amber">
                <div className="space-y-0.5">
                  <CostRow label={`Você — ${quote.coverageHours}h × ${fmtBRL(quote.hourlyRate)}/h`} value={b.labor} />
                  {members.map((m, i) => (
                    <CostRow key={m.id ?? i} label={`${m.name || `Profissional ${i + 1}`} — ${m.coverageHours ?? 0}h × ${fmtBRL(m.hourlyRate ?? 0)}/h`} value={(m.coverageHours ?? 0) * (m.hourlyRate ?? 0)} sub colorClass="text-violet-600" />
                  ))}
                  {legacyStaff && b.staffLabor > 0 && <CostRow label="2º profissional" value={b.staffLabor} sub colorClass="text-violet-600" />}
                </div>
              </Section>

              {(b.accommodation > 0 || b.staffAccommodation > 0) && (
                <Section icon={<Hotel className="h-4 w-4" />} title="Hospedagem" color="blue">
                  <div className="space-y-0.5">
                    {b.accommodation > 0 && <CostRow label={`Você — ${quote.accommodation.days} diária${(quote.accommodation.days ?? 0) > 1 ? "s" : ""} × ${fmtBRL(quote.accommodation.dailyRate ?? 0)}`} value={b.accommodation} />}
                    {b.staffAccommodation > 0 && <CostRow label="Equipe" value={b.staffAccommodation} sub colorClass="text-violet-600" />}
                  </div>
                </Section>
              )}

              {(b.food > 0 || b.staffFood > 0) && (
                <Section icon={<Utensils className="h-4 w-4" />} title="Alimentação" color="green">
                  <div className="space-y-0.5">
                    {b.food > 0 && <CostRow label={`Você — ${quote.food.meals} refeição${(quote.food.meals ?? 0) > 1 ? "ões" : ""} × ${fmtBRL(quote.food.costPerMeal ?? 0)}`} value={b.food} />}
                    {b.staffFood > 0 && <CostRow label="Equipe" value={b.staffFood} sub colorClass="text-violet-600" />}
                  </div>
                </Section>
              )}

              {(b.transport > 0 || b.teamTransport > 0) && (
                <Section icon={quote.transport.type === "air" ? <Plane className="h-4 w-4" /> : quote.transport.type === "own_vehicle" ? <Car className="h-4 w-4" /> : <Bus className="h-4 w-4" />} title="Transporte" color="orange">
                  {quote.transport.type === "own_vehicle" && b.transport > 0 ? (
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {quote.transport.originAddress && (
                        <div className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-orange-500 shrink-0" /><div><p className="text-xs font-medium text-foreground">Saída</p><p>{quote.transport.originAddress}</p></div></div>
                      )}
                      {quote.transport.destinationAddress && (
                        <div className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-orange-500 shrink-0" /><div><p className="text-xs font-medium text-foreground">Destino</p><p>{quote.transport.destinationAddress}</p></div></div>
                      )}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {(quote.transport.distanceKm ?? 0) > 0 && <div className="rounded-lg bg-muted/60 p-2.5 text-center"><p className="text-lg font-bold text-foreground">{quote.transport.distanceKm} km</p><p className="text-xs">distância{quote.transport.roundTrip ? " (ida)" : ""}</p></div>}
                        {(quote.transport.durationMinutes ?? 0) > 0 && <div className="rounded-lg bg-muted/60 p-2.5 text-center"><p className="text-lg font-bold text-foreground">{formatDuration(quote.transport.durationMinutes ?? 0)}</p><p className="text-xs">tempo estimado</p></div>}
                        {(quote.transport.gasPricePerLiter ?? 0) > 0 && <div className="rounded-lg bg-muted/60 p-2.5 text-center"><p className="text-lg font-bold text-foreground">{fmtBRL(quote.transport.gasPricePerLiter ?? 0)}/L</p><p className="text-xs">combustível</p></div>}
                        {(quote.transport.kmPerLiter ?? 0) > 0 && <div className="rounded-lg bg-muted/60 p-2.5 text-center"><p className="text-lg font-bold text-foreground">{quote.transport.kmPerLiter} km/L</p><p className="text-xs">consumo</p></div>}
                      </div>
                      <div className="pt-1 space-y-0.5">
                        {(quote.transport.fuelCost ?? 0) > 0 && <CostRow label={`Combustível${quote.transport.roundTrip ? " (ida)" : ""}`} value={quote.transport.fuelCost ?? 0} />}
                        {(quote.transport.tollCost ?? 0) > 0 && <CostRow label={`Pedágios${quote.transport.axles ? ` (${quote.transport.axles} eixos)` : ""}${quote.transport.roundTrip ? " (ida)" : ""}`} value={quote.transport.tollCost ?? 0} />}
                        {quote.transport.roundTrip && <CostRow label="Ida e volta (×2)" value={b.transport} colorClass="text-orange-600" />}
                      </div>
                    </div>
                  ) : b.transport > 0 ? (
                    <CostRow label={transportLabel} value={b.transport} />
                  ) : null}
                  {b.teamTransport > 0 && (
                    <div className="pt-1 space-y-0.5">
                      {(quote.transport.teamTransports ?? []).map((tt: any, i: number) => {
                        const cost = tt.type === "own_vehicle" ? ((tt.fuelCost ?? 0) + (tt.tollCost ?? 0)) * (tt.roundTrip ? 2 : 1) : (tt.cost ?? 0);
                        return <CostRow key={tt.id ?? i} label={`Equipe — ${tt.name || `Transporte ${i + 1}`}`} value={cost} sub colorClass="text-violet-600" />;
                      })}
                    </div>
                  )}
                </Section>
              )}

              {b.extras > 0 && (
                <Section icon={<DollarSign className="h-4 w-4" />} title="Custos Extras" color="slate">
                  <div className="space-y-0.5">
                    {quote.extraCosts.map((c, i) => <CostRow key={i} label={c.name} value={c.value} />)}
                  </div>
                </Section>
              )}

              {(b.equipment > 0 || b.software > 0 || b.infrastructure > 0) && (
                <Section icon={<Package className="h-4 w-4" />} title="Custos Operacionais (Calculadora)" color="amber">
                  <div className="space-y-0.5">
                    {b.equipment > 0 && <CostRow label="Depreciação de equipamentos (por trabalho)" value={b.equipment} colorClass="text-amber-600" />}
                    {b.software > 0 && <CostRow label={`Softwares — ${fmtBRL(quote.softwareMonthlyCost)}/mês ÷ ${quote.jobsPerMonth} trabalhos`} value={b.software} colorClass="text-violet-600" />}
                    {b.infrastructure > 0 && <CostRow label={`Infraestrutura — ${fmtBRL(quote.infrastructureMonthlyCost)}/mês ÷ ${quote.jobsPerMonth} trabalhos`} value={b.infrastructure} colorClass="text-rose-600" />}
                  </div>
                </Section>
              )}

              {/* Resumo por categoria */}
              <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b bg-muted/30"><p className="font-bold text-sm">Resumo por categoria</p></div>
                <div className="p-5 space-y-2 text-sm">
                  {b.labor + b.staffLabor > 0 && <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Mão de obra</span><span className="font-semibold">{fmtBRL(b.labor + b.staffLabor)}</span></div>}
                  {b.accommodation + b.staffAccommodation > 0 && <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted-foreground"><Hotel className="h-3.5 w-3.5" /> Hospedagem</span><span className="font-semibold">{fmtBRL(b.accommodation + b.staffAccommodation)}</span></div>}
                  {b.food + b.staffFood > 0 && <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted-foreground"><Utensils className="h-3.5 w-3.5" /> Alimentação</span><span className="font-semibold">{fmtBRL(b.food + b.staffFood)}</span></div>}
                  {b.transport + b.teamTransport > 0 && <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted-foreground"><Car className="h-3.5 w-3.5" /> Transporte</span><span className="font-semibold">{fmtBRL(b.transport + b.teamTransport)}</span></div>}
                  {b.extras > 0 && <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted-foreground"><DollarSign className="h-3.5 w-3.5" /> Custos extras</span><span className="font-semibold">{fmtBRL(b.extras)}</span></div>}
                  {b.equipment + b.software + b.infrastructure > 0 && <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-muted-foreground"><Package className="h-3.5 w-3.5" /> Custos operacionais</span><span className="font-semibold text-amber-600">{fmtBRL(b.equipment + b.software + b.infrastructure)}</span></div>}
                  <div className="border-t border-border pt-3 mt-3 flex items-center justify-between font-bold">
                    <span>Custo total</span><span className="text-lg">{fmtBRL(quote.totalCost)}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Margem {quote.marginPercent}%{quote.discount > 0 ? ` − desconto ${fmtBRL(quote.discount)}` : ""}</span><span>{fmtBRL(quote.profit)}</span>
                  </div>
                  <div className="flex items-center justify-between font-bold">
                    <span>Preço da proposta</span><span className="text-amber-500 text-lg">{fmtBRL(quote.finalPrice)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Linha do tempo ── */}
            <div className="rounded-2xl border bg-card shadow-sm p-5">
              <p className="font-bold text-sm mb-3">Linha do tempo</p>
              <ol className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Criado em {formatDateTime(quote.createdAt)}</li>
                {quote.sentAt && <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Enviado ao cliente em {formatDateTime(quote.sentAt)}</li>}
                {quote.viewedAt && <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> Visualizado pelo cliente ({quote.viewCount}×) — última em {formatDateTime(quote.viewedAt)}</li>}
                {quote.respondedAt && <li className="flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full ${quote.status === "approved" ? "bg-emerald-500" : "bg-red-500"}`} /> {quote.status === "approved" ? "Aprovado" : "Recusado"} por {quote.responseName} em {formatDateTime(quote.respondedAt)}</li>}
                {quote.contract && <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> {CONTRACT_STATUS_LABELS[quote.contract.status] ?? "Contrato"} — <Link href={`/dashboard/contratos/${quote.contract.id}`} className="underline hover:text-foreground inline-flex items-center gap-1">abrir <ExternalLink className="h-3 w-3" /></Link></li>}
              </ol>
            </div>

            {/* ── Rodapé ── */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/dashboard/calculadora-orcamento" className="flex-1 min-w-[140px]">
                <Button variant="outline" className="w-full gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
              </Link>
              {!quote.contract && (
                <Link
                  href={`/dashboard/financeiro?novo=1&titulo=${encodeURIComponent(quote.eventName || "Orçamento")}&valor=${quote.finalPrice.toFixed(2)}${quote.clientName ? `&cliente=${encodeURIComponent(quote.clientName)}` : ""}`}
                  title="Cria um lançamento a receber no financeiro com o valor desta proposta (o contrato assinado faz isso sozinho)"
                >
                  <Button variant="outline" className="gap-2 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600 border-emerald-200"><DollarSign className="h-4 w-4" /> Virar lançamento</Button>
                </Link>
              )}
              {editable && (
                <Link href={editHref()}>
                  <Button variant="outline" className="gap-2 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600 border-amber-200"><Pencil className="h-4 w-4" /> Editar</Button>
                </Link>
              )}
              {!activeContract && (
                <Button variant="outline" className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" /> Excluir</Button>
              )}
            </div>
          </div>
          </ScrollReveal>
        </div>
      </main>
      <Footer />

      {/* Enviar */}
      <AlertDialog open={sendOpen} onOpenChange={(o) => !sending && setSendOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar proposta para {quote.clientName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Será gerado um link público com o valor de <strong>{fmtBRL(quote.finalPrice)}</strong>
              {quote.validUntil ? <> válido até <strong>{formatDateOnly(quote.validUntil)}</strong></> : null}. Depois de enviada, a proposta fica congelada até o cliente responder (ou você retirá-la).
              {proposalLimit !== null && <> Esta é a proposta {Math.min(proposalsUsed + 1, proposalLimit)} de {proposalLimit} do seu plano neste mês.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void handleSend(); }} disabled={sending} className="bg-amber-500 hover:bg-amber-600 text-white">
              {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando link...</> : "Gerar link e enviar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Retirar */}
      <AlertDialog open={withdrawOpen} onOpenChange={(o) => !withdrawing && setWithdrawOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirar a proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              O link enviado ao cliente deixa de funcionar e a proposta volta a rascunho para você editar e reenviar.
              {quote.status === "approved" ? " A reserva provisória na sua agenda será liberada." : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={withdrawing}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void handleWithdraw(); }} disabled={withdrawing}>
              {withdrawing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Retirando...</> : "Sim, retirar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Gerar contrato */}
      <AlertDialog open={contractOpen} onOpenChange={(o) => !creatingContract && setContractOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar contrato desta proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              {hasClient ? (
                <>
                  Um contrato de prestação de serviços será criado em rascunho, já com o evento, o escopo, o valor de <strong>{fmtBRL(quote.finalPrice)}</strong> e as condições de pagamento. Você revisa o texto e envia para assinatura. Quando todas as partes assinarem, a agenda é reservada e o valor entra no financeiro.
                </>
              ) : (
                <>Informe o nome e o e-mail do cliente na proposta antes de gerar o contrato.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={creatingContract}>Voltar</AlertDialogCancel>
            {hasClient ? (
              <AlertDialogAction onClick={(e) => { e.preventDefault(); void handleCreateContract(); }} disabled={creatingContract} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {creatingContract ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</> : "Gerar contrato"}
              </AlertDialogAction>
            ) : (
              <Link href={editHref(6)}><Button className="bg-amber-500 hover:bg-amber-600 text-white">Informar cliente</Button></Link>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Excluir */}
      <AlertDialog open={deleteOpen} onOpenChange={(o) => !deleting && setDeleteOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o orçamento de <strong>{quote.eventName}</strong>?
              {quote.status === "sent" ? " O link enviado ao cliente deixará de funcionar." : ""}
              {quote.status === "approved" ? " A reserva provisória na sua agenda será liberada." : ""} Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void handleDelete(); }} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
