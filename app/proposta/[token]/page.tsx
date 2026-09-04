"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  FileText, CalendarDays, MapPin, Clock, CheckCircle2, XCircle, AlertCircle,
  Loader2, ShieldCheck, Hourglass, FileSignature,
} from "lucide-react";
import apiClient from "@/lib/api-service";
import { fmtBRL, formatDateLong, formatDateOnly, formatDateTime, type ClientLineItem } from "@/lib/budget/budget-calc";

// Rota pública: sem redirecionar para /login em 401 (o token é a credencial) e
// sem modal de plano (quem responde não é o assinante do plano).
const PUBLIC_HEADERS = { "X-Skip-Auth-Redirect": "1", "X-Skip-Plan-Modal": "1" };

interface PublicProposal {
  id: string;
  status: "draft" | "sent" | "approved" | "rejected";
  eventName: string;
  eventLocation: string | null;
  eventDate: string | null;
  eventEndDate: string | null;
  coverageHours: number;
  finalPrice: number;
  validUntil: string | null;
  isExpired: boolean;
  scopeNotes: string | null;
  paymentTerms: string | null;
  items: ClientLineItem[];
  clientName: string | null;
  professional: { name: string; avatarUrl: string | null; city: string | null; state: string | null };
  sentAt: string | null;
  respondedAt: string | null;
  responseName: string | null;
  canRespond: boolean;
  whiteLabel: boolean;
  contractStatus: string | null;
}

type Decision = "approved" | "rejected";

function errorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { status?: number; data?: { message?: string | string[] } } };
  if (e?.response?.status === 429) return "Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.";
  const msg = e?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(" ");
  return msg || fallback;
}

export default function PropostaPublicaPage() {
  const params = useParams();
  const token = params.token as string;

  const [proposal, setProposal] = useState<PublicProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<Decision | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState<{ status: Decision; agendaDays: number } | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiClient.get(`/budget-quotes/public/${token}`, { headers: PUBLIC_HEADERS });
      setProposal(res.data);
      if (res.data?.clientName) setName((n) => n || res.data.clientName);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) setNotFound(true);
      else setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!pending) return;
    if (name.trim().length < 2) { setFormError("Informe seu nome completo para registrar a resposta."); return; }
    setSubmitting(true);
    setFormError("");
    try {
      const res = await apiClient.post(
        `/budget-quotes/public/${token}/respond`,
        { decision: pending, name: name.trim(), message: message.trim() || undefined },
        { headers: PUBLIC_HEADERS }
      );
      setDone({ status: res.data.status, agendaDays: res.data.agendaDays ?? 0 });
      setPending(null);
      void load();
    } catch (err) {
      setFormError(errorMessage(err, "Não foi possível registrar sua resposta. Tente novamente."));
      setPending(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout whiteLabel={false}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PublicLayout>
    );
  }

  if (notFound || !proposal) {
    return (
      <PublicLayout whiteLabel={false}>
        <StateCard
          icon={<AlertCircle className="h-7 w-7 text-orange-500" />}
          title="Proposta não encontrada"
          description="Este link não existe ou a proposta foi retirada pelo profissional. Peça um novo link para quem enviou."
        />
      </PublicLayout>
    );
  }

  const whiteLabel = proposal.whiteLabel;
  const period =
    proposal.eventDate && proposal.eventEndDate && proposal.eventEndDate !== proposal.eventDate
      ? `${formatDateOnly(proposal.eventDate)} a ${formatDateOnly(proposal.eventEndDate)}`
      : formatDateLong(proposal.eventDate);

  return (
    <PublicLayout whiteLabel={whiteLabel}>
      {/* Profissional */}
      <div className="flex items-center gap-3 mb-6">
        {proposal.professional.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={proposal.professional.avatarUrl} alt={proposal.professional.name} className="w-12 h-12 rounded-full object-cover border" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center font-bold">
            {proposal.professional.name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Proposta enviada por</p>
          <p className="font-semibold truncate">{proposal.professional.name}</p>
          {(proposal.professional.city || proposal.professional.state) && (
            <p className="text-xs text-muted-foreground">{[proposal.professional.city, proposal.professional.state].filter(Boolean).join(" - ")}</p>
          )}
        </div>
      </div>

      {/* Estado resolvido */}
      {done ? (
        <StateCard
          icon={done.status === "approved" ? <CheckCircle2 className="h-7 w-7 text-emerald-500" /> : <XCircle className="h-7 w-7 text-red-500" />}
          title={done.status === "approved" ? "Proposta aprovada!" : "Resposta registrada"}
          description={
            done.status === "approved"
              ? `${proposal.professional.name} foi avisado(a) e vai preparar o contrato para assinatura.${done.agendaDays > 0 ? " A data já ficou reservada na agenda." : ""}`
              : `${proposal.professional.name} foi avisado(a) da sua resposta.`
          }
        />
      ) : proposal.status === "approved" ? (
        <StateBanner tone="success" icon={<CheckCircle2 className="h-5 w-5" />}
          title={`Aprovada${proposal.responseName ? ` por ${proposal.responseName}` : ""}${proposal.respondedAt ? ` em ${formatDateTime(proposal.respondedAt)}` : ""}`}
          description={
            proposal.contractStatus && ["sent", "partially_signed"].includes(proposal.contractStatus)
              ? "O contrato já foi enviado para assinatura. Confira o link recebido do profissional."
              : proposal.contractStatus === "fully_signed"
                ? "O contrato desta proposta já foi assinado por todas as partes."
                : "O profissional vai preparar o contrato para assinatura."
          }
        />
      ) : proposal.status === "rejected" ? (
        <StateBanner tone="error" icon={<XCircle className="h-5 w-5" />}
          title={`Recusada${proposal.responseName ? ` por ${proposal.responseName}` : ""}${proposal.respondedAt ? ` em ${formatDateTime(proposal.respondedAt)}` : ""}`}
          description="Se mudou de ideia, fale com o profissional: ele pode ajustar e enviar uma nova proposta." />
      ) : proposal.isExpired ? (
        <StateBanner tone="warning" icon={<Hourglass className="h-5 w-5" />}
          title={`Validade encerrada em ${formatDateOnly(proposal.validUntil)}`}
          description="Peça ao profissional uma proposta atualizada." />
      ) : null}

      {/* Evento + valor */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden mt-2">
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Proposta comercial</p>
              <h1 className="text-2xl font-bold leading-tight">{proposal.eventName}</h1>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <InfoItem icon={<CalendarDays className="h-4 w-4" />} label="Data" value={period || "A combinar"} />
            <InfoItem icon={<MapPin className="h-4 w-4" />} label="Local" value={proposal.eventLocation || "A combinar"} />
            <InfoItem icon={<Clock className="h-4 w-4" />} label="Cobertura" value={`${proposal.coverageHours}h`} />
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6">
          <p className="text-amber-100 text-sm font-medium">Valor total da proposta</p>
          <p className="text-4xl font-bold mt-1">{fmtBRL(proposal.finalPrice)}</p>
          {proposal.validUntil && (
            <p className="text-amber-100 text-xs mt-2">Válida até {formatDateOnly(proposal.validUntil)}</p>
          )}
        </div>

        {proposal.items.length > 0 && (
          <div className="p-6 border-t space-y-2">
            <p className="font-semibold text-sm">O que está incluso</p>
            {proposal.items.map((item) => (
              <div key={item.key} className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{fmtBRL(item.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {proposal.scopeNotes && (
          <div className="p-6 border-t">
            <p className="font-semibold text-sm mb-2">Escopo e entregas</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{proposal.scopeNotes}</p>
          </div>
        )}

        {proposal.paymentTerms && (
          <div className="p-6 border-t">
            <p className="font-semibold text-sm mb-2">Condições de pagamento</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{proposal.paymentTerms}</p>
          </div>
        )}
      </div>

      {/* Resposta */}
      {proposal.canRespond && !done && (
        <div className="rounded-2xl border bg-card shadow-sm p-6 mt-6 space-y-4">
          <div>
            <h2 className="font-semibold">Sua resposta</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Ao aprovar, o profissional recebe o aviso na hora e prepara o contrato para assinatura eletrônica.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="responder-name">Seu nome completo *</Label>
            <Input id="responder-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como você quer ser identificado(a)" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="responder-message">Mensagem para o profissional (opcional)</Label>
            <Textarea id="responder-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Dúvidas, ajustes ou combinados" />
          </div>
          {formError && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><p>{formError}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-base" disabled={submitting} onClick={() => setPending("approved")}>
              <CheckCircle2 className="h-5 w-5" /> Aprovar proposta
            </Button>
            <Button variant="outline" className="flex-1 gap-2 py-6 text-base" disabled={submitting} onClick={() => setPending("rejected")}>
              <XCircle className="h-5 w-5" /> Recusar
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!pending} onOpenChange={(open) => { if (!open && !submitting) setPending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending === "approved" ? "Aprovar esta proposta?" : "Recusar esta proposta?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending === "approved"
                ? `Você confirma a proposta "${proposal.eventName}" no valor de ${fmtBRL(proposal.finalPrice)}. O profissional será avisado e enviará o contrato para assinatura.`
                : "O profissional será avisado da recusa e poderá enviar uma nova proposta."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void submit(); }}
              disabled={submitting}
              className={pending === "approved" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</> : pending === "approved" ? "Sim, aprovar" : "Sim, recusar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PublicLayout>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">{icon}{label}</p>
      <p className="font-medium mt-0.5 capitalize-first">{value}</p>
    </div>
  );
}

function StateCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-2xl border bg-card shadow-sm p-8 text-center space-y-3">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">{icon}</div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
    </div>
  );
}

function StateBanner({ tone, icon, title, description }: { tone: "success" | "error" | "warning"; icon: React.ReactNode; title: string; description: string }) {
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300",
    error: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300",
    warning: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900/50 dark:bg-orange-900/20 dark:text-orange-300",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${styles}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs mt-0.5 opacity-90">{description}</p>
      </div>
    </div>
  );
}

function PublicLayout({ whiteLabel, children }: { whiteLabel: boolean; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background/50 flex flex-col">
      <header className="border-b bg-background">
        <div className="container mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileSignature className="h-4 w-4 text-amber-500" />
            Proposta comercial
          </div>
          {!whiteLabel && (
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              via IsoScanning
            </Link>
          )}
        </div>
      </header>
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-2xl">{children}</div>
      </main>
      <footer className="py-6 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" />
        {whiteLabel
          ? "Resposta registrada com data e hora."
          : "Resposta registrada com data e hora pela IsoScanning — plataforma para profissionais de imagem."}
      </footer>
    </div>
  );
}
