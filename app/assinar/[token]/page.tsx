"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import Link from "next/link";
import { formatDateOnly } from "@/components/jobs/negotiation";

// Este endpoint é público — sem autenticação
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const REJECT_REASON_MIN = 10; // espelha o MinLength do RejectContractDto

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

interface ContractData {
  contractId: string;
  title: string;
  ownerName: string;
  clientName: string;
  body: string;
  status: string;
  contractValue?: number;
  serviceStartDate?: string;
  serviceEndDate?: string;
  expiresAt?: string;
  party: Party;
  signaturesCompleted: number;
  signaturesTotal: number;
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
  | "error";

/** Datas "YYYY-MM-DD" e timestamps: sem deslocamento de fuso. */
const fmtDate = (value?: string | null) => {
  if (!value) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDateOnly(value) : new Date(value).toLocaleDateString("pt-BR");
};

const readMessage = async (res: Response, fallback: string) => {
  try {
    const data = await res.json();
    const msg = data?.message;
    if (Array.isArray(msg)) return msg.join(" ");
    return typeof msg === "string" && msg ? msg : fallback;
  } catch {
    return fallback;
  }
};

export default function AssinarContratoPage() {
  const params = useParams();
  const token = params.token as string;

  const [state, setState] = useState<SigningState>("loading");
  const [contract, setContract] = useState<ContractData | null>(null);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [document, setDocument] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [showFullContract, setShowFullContract] = useState(false);
  const [signatureHash, setSignatureHash] = useState("");
  const [signResult, setSignResult] = useState<{ completed: number; total: number; status?: string; message?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const res = await fetch(`${API_URL}/contracts/sign/${token}`);
        if (!res.ok) throw new Error("Link inválido");
        const data: ContractData = await res.json();
        setContract(data);
        setFullName(data.party.name);

        // Ordem importa: o estado da MINHA parte vem antes do estado do contrato
        if (data.party.signedAt) { setState(data.status === "fully_signed" ? "fully_signed" : "already_signed"); return; }
        if (data.party.rejectedAt) { setState("rejected"); return; }
        if (data.status === "rejected" || (data.rejectedBy?.length ?? 0) > 0) { setState("rejected_by_other"); return; }
        if (data.status === "cancelled") { setState("cancelled"); return; }
        if (data.status === "expired") { setState("expired"); return; }
        if (data.status === "draft") { setState("draft"); return; }
        if (data.status === "fully_signed") { setState("fully_signed"); return; }
        if (!data.canSign) { setState("error"); setError("Este contrato não está disponível para assinatura no momento."); return; }

        setState("ready");
      } catch {
        setState("error");
        setError("Link de assinatura inválido ou expirado.");
      }
    };
    fetchContract();
  }, [token]);

  const handleSign = async () => {
    if (!agreedToTerms) { setError("Você precisa aceitar os termos para assinar."); return; }
    if (confirmName.trim().toLowerCase() !== fullName.trim().toLowerCase()) {
      setError("O nome digitado não confere. Digite exatamente como aparece no contrato.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/contracts/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, document }),
      });
      if (!res.ok) throw new Error(await readMessage(res, "Erro ao assinar"));
      const data = await res.json();
      setSignatureHash(data.signatureHash ?? "");
      setSignResult({
        completed: data.signaturesCompleted ?? (contract?.signaturesCompleted ?? 0) + 1,
        total: data.signaturesTotal ?? contract?.signaturesTotal ?? 2,
        status: data.contractStatus,
        message: data.message,
      });
      setState("signed");
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message ?? "Erro ao registrar assinatura. Tente novamente.");
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
      const res = await fetch(`${API_URL}/contracts/sign/${token}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(await readMessage(res, "Erro ao registrar recusa."));
      setContract((prev) => prev ? { ...prev, status: "rejected", party: { ...prev.party, rejectedAt: new Date().toISOString(), rejectionReason: reason } } : prev);
      setState("rejected");
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message ?? "Erro ao registrar recusa.");
    } finally {
      setSubmitting(false);
    }
  };

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
      <SigningLayout>
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
      <SigningLayout>
        <div className="text-center space-y-5 py-12">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
            <PenLine className="h-8 w-8 text-gray-500" />
          </div>
          <h1 className="text-2xl font-bold">Contrato ainda em rascunho</h1>
          <p className="text-muted-foreground">
            {contract?.ownerName ?? "O remetente"} ainda não enviou este contrato para assinatura. Você será avisado quando ele estiver pronto.
          </p>
        </div>
      </SigningLayout>
    );
  }

  if (state === "cancelled") {
    return (
      <SigningLayout>
        <div className="text-center space-y-5 py-12">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
            <XCircle className="h-8 w-8 text-gray-500" />
          </div>
          <h1 className="text-2xl font-bold">Contrato cancelado</h1>
          <p className="text-muted-foreground">
            {contract?.supersededBy
              ? "Este contrato foi substituído por uma nova versão. Aguarde o novo link de assinatura."
              : "Este contrato foi cancelado pelo remetente."}
          </p>
        </div>
      </SigningLayout>
    );
  }

  if (state === "expired") {
    return (
      <SigningLayout>
        <div className="text-center space-y-5 py-12">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold">Prazo expirado</h1>
          <p className="text-muted-foreground">O prazo para assinar este contrato expirou. Entre em contato com o remetente para receber uma nova versão.</p>
        </div>
      </SigningLayout>
    );
  }

  if (state === "fully_signed" && contract) {
    return (
      <SigningLayout>
        <div className="text-center space-y-5 py-12">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-green-700">Contrato totalmente assinado</h1>
          <p className="text-muted-foreground">
            Todas as partes já assinaram este contrato
            {contract.party.signedAt && <> — a sua assinatura foi registrada em {new Date(contract.party.signedAt).toLocaleString("pt-BR")}</>}.
          </p>
          {contract.serviceStartDate && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
              <CalendarCheck className="h-4 w-4 text-green-500" />
              Serviço em {fmtDate(contract.serviceStartDate)}{contract.serviceEndDate && contract.serviceEndDate !== contract.serviceStartDate && ` a ${fmtDate(contract.serviceEndDate)}`} — data bloqueada na agenda.
            </p>
          )}
        </div>
      </SigningLayout>
    );
  }

  if (state === "already_signed" && contract) {
    return (
      <SigningLayout>
        <div className="text-center space-y-5 py-12">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-green-700">Você já assinou!</h1>
          <p className="text-muted-foreground">
            Sua assinatura foi registrada em{" "}
            {contract.party.signedAt ? new Date(contract.party.signedAt).toLocaleString("pt-BR") : ""}.
          </p>
          <p className="text-sm text-muted-foreground">
            {contract.signaturesCompleted}/{contract.signaturesTotal} partes assinaram — aguardando a outra parte.
          </p>
        </div>
      </SigningLayout>
    );
  }

  if (state === "rejected" && contract) {
    return (
      <SigningLayout>
        <div className="text-center space-y-5 py-12">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold">Assinatura recusada</h1>
          <p className="text-muted-foreground">
            Você recusou assinar este contrato. {contract.ownerName} foi notificado e poderá enviar uma nova versão com os termos ajustados.
          </p>
          {contract.party.rejectionReason && (
            <p className="text-sm text-muted-foreground italic">Motivo informado: "{contract.party.rejectionReason}"</p>
          )}
        </div>
      </SigningLayout>
    );
  }

  if (state === "rejected_by_other" && contract) {
    const other = contract.rejectedBy?.[0];
    return (
      <SigningLayout>
        <div className="text-center space-y-5 py-12">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold">Contrato recusado</h1>
          <p className="text-muted-foreground">
            {other?.name ?? "A outra parte"} recusou assinar este contrato, por isso ele não pode mais ser assinado.
            {other?.rejectedAt && <> Recusa registrada em {new Date(other.rejectedAt).toLocaleString("pt-BR")}.</>}
          </p>
          {other?.reason && <p className="text-sm text-muted-foreground italic">Motivo: "{other.reason}"</p>}
          <p className="text-sm text-muted-foreground">Se os termos forem ajustados, uma nova versão será enviada com um novo link.</p>
        </div>
      </SigningLayout>
    );
  }

  if (state === "signed") {
    const completed = signResult?.completed ?? 0;
    const total = signResult?.total ?? 0;
    const isComplete = signResult?.status === "fully_signed" || (total > 0 && completed >= total);
    return (
      <SigningLayout>
        <div className="text-center space-y-6 py-12">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-green-700">Contrato assinado!</h1>
            <p className="text-muted-foreground mt-2">
              {signResult?.message ?? "Sua assinatura digital foi registrada com sucesso."}
            </p>
          </div>
          {total > 0 && (
            <p className="text-sm text-muted-foreground">
              {completed}/{total} partes assinaram.
              {!isComplete && <span className="block mt-1">Aguardando a outra parte assinar.</span>}
              {isComplete && (
                <span className="block mt-1 font-medium text-green-600">
                  Contrato totalmente assinado
                  {contract?.serviceStartDate ? ` — a data de ${fmtDate(contract.serviceStartDate)} foi bloqueada na agenda das duas partes.` : "."}
                </span>
              )}
            </p>
          )}
          {signatureHash && (
            <div className="mt-4 rounded-xl bg-muted p-4 text-left space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hash de validade</p>
              <p className="text-xs font-mono break-all text-muted-foreground">{signatureHash}</p>
              <p className="text-xs text-muted-foreground">Este código comprova a autenticidade da sua assinatura. Guarde-o.</p>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4">
            <Shield className="h-4 w-4 text-green-500" />
            Assinatura registrada com segurança pela ISO Scanning
          </div>
        </div>
      </SigningLayout>
    );
  }

  // ─── ESTADO PRINCIPAL: PRONTO PARA ASSINAR ───────────────────────────────

  if (state === "ready" && contract) {
    const otherSigned = contract.signaturesCompleted > 0;
    return (
      <SigningLayout>
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
              Assinatura digital com validade jurídica — sua identidade e IP serão registrados
            </div>
            {contract.serviceStartDate && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/60 dark:bg-black/20 rounded-lg px-3 py-2">
                <CalendarCheck className="h-3.5 w-3.5 text-green-500" />
                Quando as duas partes assinarem, a data do serviço é bloqueada automaticamente na agenda de ambos.
              </div>
            )}
          </div>

          {/* Conteúdo do Contrato (colapsável) */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <button
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
              <div
                className="px-5 pb-6 prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed border-t bg-muted/10 max-h-[500px] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: contract.body }}
              />
            )}
          </div>

          {/* Status das assinaturas */}
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Partes do contrato ({contract.signaturesCompleted}/{contract.signaturesTotal} assinaram)
            </p>
            <div className="space-y-2">
              {contract.party.partyRole === "recipient" && (
                <div className="flex items-center gap-2 text-sm">
                  {otherSigned
                    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                    : <Clock className="h-4 w-4 text-yellow-500" />}
                  <span className="font-medium">{contract.ownerName}</span>
                  <span className="text-xs text-muted-foreground">(Remetente)</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">{contract.party.name}</span>
                <span className="text-xs text-muted-foreground">(Você)</span>
              </div>
              {contract.party.partyRole === "sender" && (
                <div className="flex items-center gap-2 text-sm">
                  {otherSigned
                    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                    : <Clock className="h-4 w-4 text-yellow-500" />}
                  <span className="font-medium">{contract.clientName}</span>
                  <span className="text-xs text-muted-foreground">(Outra parte)</span>
                </div>
              )}
            </div>
          </div>

          {/* Form de Assinatura */}
          {!showRejectForm ? (
            <div className="rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 p-6 space-y-5">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Lock className="h-5 w-5 text-indigo-500" />
                Assinar contrato
              </h2>

              <div className="space-y-2">
                <label className="text-sm font-medium">Seu nome completo</label>
                <p className="text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2 font-medium">
                  {fullName}
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
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Confirme seu nome para assinar
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Digite exatamente: <strong>{fullName}</strong>
                </p>
                <input
                  type="text"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  placeholder={`Digite: ${fullName}`}
                />
                {confirmName && confirmName.trim().toLowerCase() !== fullName.trim().toLowerCase() && (
                  <p className="text-xs text-red-500">Nome não confere.</p>
                )}
                {confirmName && confirmName.trim().toLowerCase() === fullName.trim().toLowerCase() && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Nome confirmado
                  </p>
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
                  Declaro que li e concordo com todos os termos do contrato acima. Estou ciente de que esta
                  assinatura digital tem validade jurídica e que meu endereço IP e a data/hora serão registrados.
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
                  disabled={submitting || !agreedToTerms || confirmName.trim().toLowerCase() !== fullName.trim().toLowerCase()}
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
                Conexão segura — assinatura com criptografia SHA-256
              </p>
            </div>
          ) : (
            /* Form de Recusa */
            <div className="rounded-2xl border-2 border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20 p-6 space-y-4">
              <h2 className="font-bold text-lg text-red-700 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Recusar assinatura
              </h2>
              <p className="text-sm text-muted-foreground">
                Explique o que precisa mudar. {contract.ownerName} será notificado, verá o motivo e poderá enviar uma nova versão do contrato.
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

function SigningLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header simples */}
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto max-w-4xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <FileSignature className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm">ISO Scanning</span>
            <span className="text-muted-foreground text-sm hidden sm:block">· Assinatura Digital</span>
          </div>
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-indigo-600 transition-colors flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Conhecer plataforma
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-2xl px-4 py-10">
        {children}
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-xs text-muted-foreground space-y-1">
        <p className="flex items-center justify-center gap-1">
          <Shield className="h-3 w-3 text-green-500" />
          Assinatura digital com validade jurídica · Lei 14.063/2020
        </p>
        <p>© ISO Scanning · Todos os direitos reservados</p>
      </div>
    </div>
  );
}
