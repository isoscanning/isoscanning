"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileSignature,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Shield,
  User,
  Lock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  PenLine,
  CalendarCheck,
  Printer,
  LogIn,
  ShieldCheck,
  FileX2,
} from "lucide-react";
import Link from "next/link";
import { formatDateOnly } from "@/components/jobs/negotiation";
import { useAuth } from "@/lib/auth-context";
import apiClient from "@/lib/api-service";
import { ContractHtml } from "@/components/contracts/contract-html";
import { ContractDocument, type DocumentSignature } from "@/components/contracts/contract-document";
import { apiErrorMessage, apiErrorStatus, buildVerifyUrl, rememberRedirectAfterLogin } from "@/lib/contracts/contract-utils";

const REJECT_REASON_MIN = 10; // espelha o MinLength do RejectContractDto

// Rota pública: sem redirecionar para /login em 401 (o token é a credencial) e
// sem modal de plano (o signatário não é o assinante do plano).
const PUBLIC_HEADERS = { "X-Skip-Auth-Redirect": "1", "X-Skip-Plan-Modal": "1" };

interface Party {
  id: string;
  partyRole: "sender" | "recipient";
  name: string;
  email: string;
  signedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
}

interface RejectedBy {
  name: string;
  reason?: string | null;
  rejectedAt?: string | null;
}

interface SignatureInfo {
  role: string;
  name: string;
  signedAt?: string | null;
  signatureHash?: string | null;
}

interface ContractData {
  contractId: string;
  title: string;
  ownerName: string;
  clientName: string;
  body: string;
  bodyHash?: string | null;
  status: string;
  contractValue?: number | null;
  serviceStartDate?: string | null;
  serviceEndDate?: string | null;
  expiresAt?: string | null;
  sentAt?: string | null;
  party: Party;
  /** Parte vinculada a uma conta: só assina logada nela. */
  requiresAccount: boolean;
  partyUserId?: string | null;
  /** Ultra: página sem a marca IsoScanning. */
  whiteLabel: boolean;
  signaturesCompleted: number;
  signaturesTotal: number;
  signatures: SignatureInfo[];
  /** Já resolvido pelo backend: false p/ rascunho, recusado, cancelado, expirado ou já assinado. */
  canSign: boolean;
  rejectedBy: RejectedBy[];
  supersededBy?: string | null;
}

type SigningState =
  | "loading"
  | "ready"
  | "signed"
  | "rejected"          // eu recusei
  | "rejected_by_other" // a outra parte recusou — o contrato não segue
  | "already_signed"
  | "fully_signed"
  | "draft"
  | "cancelled"
  | "expired"
  | "terminated"
  | "error";

/** Datas "YYYY-MM-DD" e timestamps: sem deslocamento de fuso. */
const fmtDate = (value?: string | null) => {
  if (!value) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDateOnly(value) : new Date(value).toLocaleDateString("pt-BR");
};
const fmtDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString("pt-BR") : "");

export default function AssinarContratoPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { userProfile, loading: authLoading, signOut } = useAuth();

  const [state, setState] = useState<SigningState>("loading");
  const [contract, setContract] = useState<ContractData | null>(null);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [document, setDocument] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [showFullContract, setShowFullContract] = useState(true);
  const [showPrint, setShowPrint] = useState(false);
  const [signatureHash, setSignatureHash] = useState("");
  const [signResult, setSignResult] = useState<{ completed: number; total: number; status?: string; message?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    // Espera o auth resolver para a requisição já sair com o Bearer (parte com conta)
    if (authLoading) return;
    let cancelled = false;
    const fetchContract = async () => {
      try {
        const res = await apiClient.get(`/contracts/sign/${token}`, { headers: PUBLIC_HEADERS });
        if (cancelled) return;
        const data: ContractData = res.data;
        setContract(data);
        setFullName(data.party.name);

        // Ordem importa: desfechos do contrato (concluído/cancelado/recusado/expirado)
        // vêm antes do estado da MINHA parte — "já assinei" só vale se o contrato segue vivo.
        if (data.status === "fully_signed" || data.status === "terminated") { setState("fully_signed"); return; }
        if (data.status === "cancelled") { setState("cancelled"); return; }
        if (data.party.rejectedAt) { setState("rejected"); return; }
        if (data.status === "rejected" || (data.rejectedBy?.length ?? 0) > 0) { setState("rejected_by_other"); return; }
        if (data.status === "expired") { setState("expired"); return; }
        if (data.party.signedAt) { setState("already_signed"); return; }
        if (data.status === "draft") { setState("draft"); return; }
        if (!data.canSign) {
          // Prazo vencido detectado no cliente antes do cron marcar
          if (data.expiresAt && new Date(data.expiresAt).getTime() < Date.now()) { setState("expired"); return; }
          setState("error"); setError("Este contrato não está disponível para assinatura no momento."); return;
        }

        setState("ready");
      } catch (e) {
        if (cancelled) return;
        setState("error");
        setError(apiErrorStatus(e) === 429
          ? apiErrorMessage(e, "")
          : "Link de assinatura inválido ou expirado. Peça a quem enviou o contrato para conferir o link.");
      }
    };
    fetchContract();
    return () => { cancelled = true; };
  }, [token, authLoading]);

  const goToLogin = () => {
    rememberRedirectAfterLogin(`/assinar/${token}`);
    router.push("/login");
  };

  const switchAccount = async () => {
    try { await signOut(); } catch { /* segue para o login mesmo assim */ }
    goToLogin();
  };

  const handleSign = async () => {
    if (!agreedToTerms) { setError("Você precisa declarar que leu e concorda com os termos para assinar."); return; }
    if (confirmName.trim().toLowerCase() !== fullName.trim().toLowerCase()) {
      setError("O nome digitado não confere. Digite exatamente como aparece no contrato.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await apiClient.post(
        `/contracts/sign/${token}`,
        { fullName, document: document.trim() || undefined, agreedToTerms: true },
        { headers: PUBLIC_HEADERS }
      );
      const data = res.data;
      setSignatureHash(data.signatureHash ?? "");
      setSignResult({
        completed: data.signaturesCompleted ?? (contract?.signaturesCompleted ?? 0) + 1,
        total: data.signaturesTotal ?? contract?.signaturesTotal ?? 2,
        status: data.contractStatus,
        message: data.message,
      });
      setContract((prev) => prev ? {
        ...prev,
        status: data.contractStatus ?? prev.status,
        party: { ...prev.party, signedAt: new Date().toISOString() },
        signatures: prev.signatures.map((s) => s.name === prev.party.name && s.role === prev.party.partyRole
          ? { ...s, signedAt: new Date().toISOString(), signatureHash: data.signatureHash ?? s.signatureHash }
          : s),
      } : prev);
      setState("signed");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      const status = apiErrorStatus(e);
      if (status === 401) {
        setError("Faça login com a conta vinculada a este contrato para assinar.");
      } else if (status === 403) {
        setError("Esta via deve ser assinada pela conta vinculada a ela. Você está logado em outra conta.");
      } else {
        setError(apiErrorMessage(e, "Erro ao registrar assinatura. Tente novamente."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    const reason = rejectReason.trim();
    if (reason.length < REJECT_REASON_MIN) {
      setError(`Descreva o motivo da recusa com pelo menos ${REJECT_REASON_MIN} caracteres.`);
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await apiClient.post(`/contracts/sign/${token}/reject`, { reason }, { headers: PUBLIC_HEADERS });
      setContract((prev) => prev ? { ...prev, status: "rejected", party: { ...prev.party, rejectedAt: new Date().toISOString(), rejectionReason: reason } } : prev);
      setState("rejected");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(apiErrorMessage(e, "Erro ao registrar recusa."));
    } finally {
      setSubmitting(false);
    }
  };

  const whiteLabel = !!contract?.whiteLabel;

  // Regra de conta: parte vinculada a usuário só assina logada nessa conta
  const accountGate: "none" | "login" | "wrong_account" =
    !contract?.requiresAccount ? "none"
    : !userProfile ? "login"
    : contract.partyUserId && userProfile.id !== contract.partyUserId ? "wrong_account"
    : "none";

  const documentSignatures: DocumentSignature[] = (contract?.signatures ?? []).map((s) => ({
    role: s.role,
    name: s.name,
    signedAt: s.signedAt,
    signatureHash: s.signatureHash,
  }));

  // ─── ESTADOS FINAIS ──────────────────────────────────────────────────────

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <SigningLayout whiteLabel={whiteLabel}>
        <div className="text-center space-y-5 py-12">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-red-700">Link inválido</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </SigningLayout>
    );
  }

  if (state === "draft") {
    return (
      <SigningLayout whiteLabel={whiteLabel}>
        <div className="text-center space-y-5 py-12">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
            <PenLine className="h-8 w-8 text-gray-500" />
          </div>
          <h1 className="text-2xl font-bold">Contrato ainda em rascunho</h1>
          <p className="text-muted-foreground">
            {contract?.ownerName ?? "Quem criou o contrato"} ainda não o enviou para assinatura. Quando enviar, este mesmo link passa a funcionar — peça que avise você.
          </p>
        </div>
      </SigningLayout>
    );
  }

  if (state === "cancelled") {
    return (
      <SigningLayout whiteLabel={whiteLabel}>
        <div className="text-center space-y-5 py-12">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
            <XCircle className="h-8 w-8 text-gray-500" />
          </div>
          <h1 className="text-2xl font-bold">Contrato cancelado</h1>
          <p className="text-muted-foreground">
            {contract?.supersededBy
              ? `Este contrato foi substituído por uma nova versão. ${contract?.ownerName ?? "Quem enviou"} vai compartilhar um novo link de assinatura.`
              : `Este contrato foi cancelado por ${contract?.ownerName ?? "quem o enviou"}.`}
          </p>
        </div>
      </SigningLayout>
    );
  }

  if (state === "expired") {
    return (
      <SigningLayout whiteLabel={whiteLabel}>
        <div className="text-center space-y-5 py-12">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold">Prazo expirado</h1>
          <p className="text-muted-foreground">
            O prazo para assinar este contrato{contract?.expiresAt && ` (${fmtDate(contract.expiresAt)})`} venceu.
            Entre em contato com {contract?.ownerName ?? "quem enviou"} para receber uma nova versão com novo prazo.
          </p>
        </div>
      </SigningLayout>
    );
  }

  if (state === "terminated" && contract) {
    return (
      <SigningLayout whiteLabel={whiteLabel}>
        <div className="text-center space-y-5 py-12">
          <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mx-auto">
            <FileX2 className="h-8 w-8 text-slate-600" />
          </div>
          <h1 className="text-2xl font-bold">Contrato encerrado (distrato)</h1>
          <p className="text-muted-foreground">Este contrato foi encerrado por acordo entre as partes e não aceita mais assinaturas.</p>
        </div>
      </SigningLayout>
    );
  }

  if (state === "fully_signed" && contract) {
    return (
      <SigningLayout whiteLabel={whiteLabel}>
        <div className="space-y-6">
          <div className="no-print text-center space-y-5 py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-green-700">Contrato totalmente assinado</h1>
            <p className="text-muted-foreground">
              Todas as partes assinaram este contrato
              {contract.party.signedAt && <> — a sua assinatura foi registrada em {fmtDateTime(contract.party.signedAt)}</>}.
            </p>
            {contract.serviceStartDate && (
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                <CalendarCheck className="h-4 w-4 text-green-500" />
                Serviço em {fmtDate(contract.serviceStartDate)}{contract.serviceEndDate && contract.serviceEndDate !== contract.serviceStartDate && ` a ${fmtDate(contract.serviceEndDate)}`}.
              </p>
            )}
          </div>
          <SignedCopyBlock
            contract={contract}
            signatures={documentSignatures}
            whiteLabel={whiteLabel}
            open={showPrint}
            onToggle={() => setShowPrint((v) => !v)}
          />
        </div>
      </SigningLayout>
    );
  }

  if (state === "already_signed" && contract) {
    return (
      <SigningLayout whiteLabel={whiteLabel}>
        <div className="space-y-6">
          <div className="no-print text-center space-y-5 py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-green-700">Você já assinou!</h1>
            <p className="text-muted-foreground">Sua assinatura foi registrada em {fmtDateTime(contract.party.signedAt)}.</p>
            <p className="text-sm text-muted-foreground">
              {contract.signaturesCompleted}/{contract.signaturesTotal} partes assinaram — aguardando a outra parte.
              Guarde este link: quando todos assinarem, ele mostra o contrato completo para impressão.
            </p>
          </div>
          <SignedCopyBlock
            contract={contract}
            signatures={documentSignatures}
            whiteLabel={whiteLabel}
            open={showPrint}
            onToggle={() => setShowPrint((v) => !v)}
          />
        </div>
      </SigningLayout>
    );
  }

  if (state === "rejected" && contract) {
    return (
      <SigningLayout whiteLabel={whiteLabel}>
        <div className="text-center space-y-5 py-12">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold">Assinatura recusada</h1>
          <p className="text-muted-foreground">
            Você recusou assinar este contrato. {contract.ownerName} foi notificado(a) na plataforma, verá o motivo e poderá
            compartilhar um novo link com os termos ajustados.
          </p>
          {contract.party.rejectionReason && (
            <p className="text-sm text-muted-foreground italic">Motivo informado: &quot;{contract.party.rejectionReason}&quot;</p>
          )}
        </div>
      </SigningLayout>
    );
  }

  if (state === "rejected_by_other" && contract) {
    const other = contract.rejectedBy?.[0];
    return (
      <SigningLayout whiteLabel={whiteLabel}>
        <div className="text-center space-y-5 py-12">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold">Contrato recusado</h1>
          <p className="text-muted-foreground">
            {other?.name ?? "A outra parte"} recusou assinar este contrato, por isso ele não pode mais ser assinado.
            {other?.rejectedAt && <> Recusa registrada em {fmtDateTime(other.rejectedAt)}.</>}
          </p>
          {other?.reason && <p className="text-sm text-muted-foreground italic">Motivo: &quot;{other.reason}&quot;</p>}
          <p className="text-sm text-muted-foreground">Se os termos forem ajustados, {contract.ownerName} compartilha um novo link de assinatura.</p>
        </div>
      </SigningLayout>
    );
  }

  if (state === "signed" && contract) {
    const completed = signResult?.completed ?? 0;
    const total = signResult?.total ?? 0;
    const isComplete = signResult?.status === "fully_signed" || (total > 0 && completed >= total);
    return (
      <SigningLayout whiteLabel={whiteLabel}>
        <div className="space-y-6">
          <div className="no-print text-center space-y-6 py-8">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-green-700">Contrato assinado!</h1>
              <p className="text-muted-foreground mt-2">
                {signResult?.message ?? "Sua assinatura eletrônica foi registrada com sucesso."}
              </p>
            </div>
            {total > 0 && (
              <p className="text-sm text-muted-foreground">
                {completed}/{total} partes assinaram.
                {!isComplete && <span className="block mt-1">Aguardando a outra parte assinar. Guarde este link para acessar o contrato depois.</span>}
                {isComplete && (
                  <span className="block mt-1 font-medium text-green-600">
                    Contrato totalmente assinado
                    {contract.serviceStartDate ? ` — a data de ${fmtDate(contract.serviceStartDate)} foi reservada na agenda das partes com conta na plataforma.` : "."}
                  </span>
                )}
              </p>
            )}
            {signatureHash && (
              <div className="mt-4 rounded-xl bg-muted p-4 text-left space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hash da sua assinatura</p>
                <p className="text-xs font-mono break-all text-muted-foreground">{signatureHash}</p>
                <p className="text-xs text-muted-foreground">
                  Este código identifica a sua assinatura (data, hora, IP e conteúdo do contrato). Ele também aparece na versão impressa.
                </p>
              </div>
            )}
          </div>
          <SignedCopyBlock
            contract={contract}
            signatures={documentSignatures}
            whiteLabel={whiteLabel}
            open={showPrint}
            onToggle={() => setShowPrint((v) => !v)}
          />
        </div>
      </SigningLayout>
    );
  }

  // ─── ESTADO PRINCIPAL: PRONTO PARA ASSINAR ───────────────────────────────

  if (state === "ready" && contract) {
    const nameMatches = confirmName.trim().toLowerCase() === fullName.trim().toLowerCase();
    const otherParties = contract.signatures.filter((s) => !(s.role === contract.party.partyRole && s.name === contract.party.name));
    return (
      <SigningLayout whiteLabel={whiteLabel}>
        <div className="space-y-6">

          {/* Header do Contrato */}
          <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200/50 p-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                <FileSignature className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{contract.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Enviado por <strong>{contract.ownerName}</strong>
                  {contract.sentAt && <> em {fmtDateTime(contract.sentAt)}</>}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              {contract.contractValue != null && (
                <div>
                  <span className="text-muted-foreground">Valor: </span>
                  <strong>{contract.contractValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                </div>
              )}
              {contract.serviceStartDate && (
                <div>
                  <span className="text-muted-foreground">Data do serviço: </span>
                  <strong>
                    {fmtDate(contract.serviceStartDate)}
                    {contract.serviceEndDate && contract.serviceEndDate !== contract.serviceStartDate && ` a ${fmtDate(contract.serviceEndDate)}`}
                  </strong>
                </div>
              )}
              {contract.expiresAt && (
                <div>
                  <span className="text-muted-foreground">Assinar até: </span>
                  <strong className="text-orange-600">{fmtDate(contract.expiresAt)}</strong>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/60 dark:bg-black/20 rounded-lg px-3 py-2">
              <Shield className="h-3.5 w-3.5 text-indigo-500" />
              Assinatura eletrônica com validade jurídica — nome, data/hora, IP e o texto assinado ficam registrados
            </div>
            {contract.serviceStartDate && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/60 dark:bg-black/20 rounded-lg px-3 py-2">
                <CalendarCheck className="h-3.5 w-3.5 text-green-500" />
                Quando as duas partes assinarem, a data do serviço é reservada na agenda de quem tem conta na plataforma.
              </div>
            )}
          </div>

          {/* Conteúdo do Contrato (colapsável, aberto por padrão) */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
              onClick={() => setShowFullContract(!showFullContract)}
            >
              <span className="font-semibold flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-indigo-500" />
                Leia o contrato completo antes de assinar
              </span>
              {showFullContract ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showFullContract && (
              <div className="px-5 py-5 border-t bg-muted/10 max-h-[560px] overflow-y-auto">
                <ContractHtml html={contract.body} />
              </div>
            )}
            {contract.bodyHash && (
              <div className="px-5 py-2.5 border-t text-[11px] text-muted-foreground flex items-start gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 mt-0.5 text-green-600 flex-shrink-0" />
                <span>
                  Texto congelado no envio. Código de verificação: <span className="font-mono break-all">{contract.bodyHash.slice(0, 16)}…</span>{" "}
                  <a href={buildVerifyUrl(contract.bodyHash)} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">verificar</a>
                </span>
              </div>
            )}
          </div>

          {/* Status das assinaturas */}
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Partes do contrato ({contract.signaturesCompleted}/{contract.signaturesTotal} assinaram)
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">{contract.party.name}</span>
                <span className="text-xs text-muted-foreground">(você · {contract.party.partyRole === "recipient" ? "contratante" : "contratado"})</span>
              </div>
              {otherParties.map((s, i) => (
                <div key={`${s.role}-${i}`} className="flex items-center gap-2 text-sm">
                  {s.signedAt ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Clock className="h-4 w-4 text-yellow-500" />}
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({s.role === "recipient" ? "contratante" : "contratado"}{s.signedAt ? ` · assinou em ${fmtDateTime(s.signedAt)}` : ""})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Parte com conta: precisa estar logada na conta certa */}
          {accountGate !== "none" && (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-6 space-y-3">
              <h2 className="font-bold text-lg flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <LogIn className="h-5 w-5" /> Esta via é assinada com a sua conta
              </h2>
              {accountGate === "login" ? (
                <>
                  <p className="text-sm text-amber-800/90 dark:text-amber-200/90">
                    Você tem conta na plataforma vinculada a este contrato. Para garantir que é você quem está assinando,
                    faça login — depois você volta automaticamente para esta página.
                  </p>
                  <Button onClick={goToLogin} className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
                    <LogIn className="h-4 w-4" /> Entrar para assinar
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-amber-800/90 dark:text-amber-200/90">
                    Você está logado como <strong>{userProfile?.email}</strong>, mas esta via pertence a outra conta
                    ({contract.party.email}). Troque de conta para assinar.
                  </p>
                  <Button onClick={switchAccount} variant="outline" className="gap-2 border-amber-400">
                    <LogIn className="h-4 w-4" /> Trocar de conta
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Form de Assinatura */}
          {accountGate === "none" && !showRejectForm && (
            <div className="rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 p-6 space-y-5">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Lock className="h-5 w-5 text-indigo-500" />
                Assinar contrato
              </h2>

              <div className="space-y-2">
                <label className="text-sm font-medium">Seu nome completo</label>
                <p className="text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2 font-medium">{fullName}</p>
                <p className="text-xs text-muted-foreground">
                  Nome informado por {contract.ownerName}. Se estiver errado, recuse e explique o motivo — ele corrige e envia uma nova versão.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  CPF / CNPJ <span className="text-muted-foreground font-normal">(opcional, mas recomendado)</span>
                </label>
                <input
                  type="text"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  maxLength={30}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="000.000.000-00"
                />
                <p className="text-xs text-muted-foreground">Fica registrado junto à sua assinatura e aparece no documento impresso.</p>
              </div>

              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Confirme seu nome para assinar</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">Digite exatamente: <strong>{fullName}</strong></p>
                <input
                  type="text"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder={`Digite: ${fullName}`}
                  autoComplete="off"
                />
                {confirmName && !nameMatches && <p className="text-xs text-red-500">Nome não confere.</p>}
                {confirmName && nameMatches && (
                  <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Nome confirmado</p>
                )}
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-muted-foreground">
                  Declaro que li e concordo com todos os termos do contrato acima. Estou ciente de que esta assinatura
                  eletrônica tem validade jurídica (Lei 14.063/2020) e que meu nome, endereço IP e a data/hora serão registrados.
                </span>
              </label>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleSign}
                  disabled={submitting || !agreedToTerms || !nameMatches}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-base font-semibold gap-2"
                >
                  <FileSignature className="h-5 w-5" />
                  {submitting ? "Registrando assinatura..." : "Assinar contrato"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowRejectForm(true); setError(""); }}
                  className="text-red-500 border-red-200 hover:bg-red-50 px-4 gap-1.5"
                  title="Recusar assinatura"
                >
                  <XCircle className="h-4 w-4" /> Recusar
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                <Shield className="h-3 w-3" />
                Conexão segura — assinatura registrada com hash SHA-256
              </p>
            </div>
          )}

          {accountGate === "none" && showRejectForm && (
            /* Form de Recusa */
            <div className="rounded-2xl border-2 border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20 p-6 space-y-4">
              <h2 className="font-bold text-lg text-red-700 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Recusar assinatura
              </h2>
              <p className="text-sm text-muted-foreground">
                Explique o que precisa mudar. {contract.ownerName} será notificado(a) na plataforma, verá o motivo e poderá
                compartilhar um novo link com os termos ajustados.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none"
                placeholder="Ex: O valor está diferente do acordado verbalmente..."
              />
              <p className="text-xs text-muted-foreground text-right">
                {rejectReason.trim().length}/{REJECT_REASON_MIN} caracteres mínimos
              </p>
              {error && (
                <div className="text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> {error}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleReject}
                  disabled={submitting || rejectReason.trim().length < REJECT_REASON_MIN}
                  className="bg-red-600 hover:bg-red-700 text-white gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  {submitting ? "Registrando..." : "Confirmar recusa"}
                </Button>
                <Button variant="outline" onClick={() => { setShowRejectForm(false); setError(""); }}>
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </div>
      </SigningLayout>
    );
  }

  return null;
}

/**
 * Depois de assinar, a parte externa (sem conta) não tem dashboard: a cópia
 * dela é esta página. O bloco abre a versão "papel" e imprime/salva em PDF.
 */
function SignedCopyBlock({
  contract, signatures, whiteLabel, open, onToggle,
}: {
  contract: ContractData;
  signatures: DocumentSignature[];
  whiteLabel: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="no-print rounded-2xl border bg-card p-5 space-y-3">
        <p className="font-semibold flex items-center gap-2"><Printer className="h-4 w-4 text-indigo-500" /> Sua cópia do contrato</p>
        <p className="text-sm text-muted-foreground">
          Guarde uma cópia: abra a versão para impressão e use <strong>“Salvar como PDF”</strong> na janela de impressão.
          O documento inclui o texto assinado, os dados das assinaturas e o código de verificação.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onToggle}>
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {open ? "Ocultar documento" : "Ver documento completo"}
          </Button>
          <Button type="button" size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { if (!open) onToggle(); setTimeout(() => window.print(), 150); }}>
            <Printer className="h-3.5 w-3.5" /> Imprimir / Salvar como PDF
          </Button>
          {contract.bodyHash && (
            <a href={buildVerifyUrl(contract.bodyHash)} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="ghost" size="sm" className="gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-green-600" /> Verificar autenticidade
              </Button>
            </a>
          )}
        </div>
      </div>
      {!whiteLabel && (
        <div className="no-print rounded-2xl border border-dashed p-4 text-sm text-muted-foreground flex flex-wrap items-center justify-between gap-3">
          <span>Quer guardar seus contratos, agenda e clientes em um só lugar? A IsoScanning tem plano gratuito.</span>
          <Link href="/cadastro" className="text-indigo-600 font-medium hover:underline whitespace-nowrap">Criar conta grátis →</Link>
        </div>
      )}
      <div className={open ? "" : "hidden print:block"}>
        <ContractDocument
          title={contract.title}
          body={contract.body}
          bodyHash={contract.bodyHash}
          sentAt={contract.sentAt}
          status={contract.status}
          signatures={signatures}
          contractId={contract.contractId}
          whiteLabel={whiteLabel}
        />
      </div>
    </div>
  );
}

function SigningLayout({ children, whiteLabel }: { children: React.ReactNode; whiteLabel?: boolean }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 print:bg-white">
      <style>{`
        @media print {
          @page { margin: 18mm 16mm; }
          body { background: #fff !important; }
          .no-print, .signing-chrome { display: none !important; }
        }
      `}</style>

      {/* Header simples */}
      <div className="signing-chrome border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto max-w-4xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <FileSignature className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm">{whiteLabel ? "Assinatura eletrônica" : "IsoScanning"}</span>
            {!whiteLabel && <span className="text-muted-foreground text-sm hidden sm:block">· Assinatura eletrônica</span>}
          </div>
          {!whiteLabel && (
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-indigo-600 transition-colors flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Conhecer plataforma
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="signing-content container mx-auto max-w-2xl px-4 py-10 print:max-w-none print:p-0">
        {children}
      </div>

      {/* Footer */}
      <div className="signing-chrome text-center py-8 text-xs text-muted-foreground space-y-1">
        <p className="flex items-center justify-center gap-1">
          <Shield className="h-3 w-3 text-green-500" />
          Assinatura eletrônica com validade jurídica · Lei 14.063/2020 · MP 2.200-2/2001
        </p>
        {!whiteLabel && <p>© IsoScanning · Todos os direitos reservados</p>}
      </div>
    </div>
  );
}
