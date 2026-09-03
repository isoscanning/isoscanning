"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api-service";
import { apiErrorMessage, apiErrorStatus } from "@/lib/contracts/contract-utils";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  FileX2,
  Info,
  AlertCircle,
  FileSignature,
} from "lucide-react";

const HASH_RE = /^[a-f0-9]{64}$/;
const PUBLIC_HEADERS = { "X-Skip-Auth-Redirect": "1", "X-Skip-Plan-Modal": "1" };

interface VerifyResult {
  found: boolean;
  hash: string;
  contract?: {
    id: string;
    title: string;
    status: string;
    ownerName: string;
    clientName: string;
    sentAt: string | null;
    createdAt: string | null;
    terminatedAt: string | null;
    supersededBy: string | null;
    signatures: Array<{
      role: string;
      name: string;
      signedAt: string | null;
      signatureHashPrefix: string | null;
      authenticated: boolean;
    }>;
    fullySigned: boolean;
  };
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho (ainda não enviado para assinatura)",
  sent: "Enviado — aguardando assinaturas",
  partially_signed: "Parcialmente assinado",
  fully_signed: "Totalmente assinado",
  rejected: "Recusado por uma das partes",
  cancelled: "Cancelado",
  expired: "Expirado sem assinatura",
  terminated: "Encerrado por distrato",
};

const ROLE_LABELS: Record<string, string> = {
  sender: "Contratado(a)",
  owner: "Contratado(a)",
  recipient: "Contratante",
};

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString("pt-BR") : "");

export default function VerificarContratoPage() {
  return (
    <Suspense fallback={null}>
      <VerificarInner />
    </Suspense>
  );
}

function VerificarInner() {
  const searchParams = useSearchParams();
  const [hash, setHash] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normalize = (v: string) => v.trim().toLowerCase().replace(/[^a-f0-9]/g, "");

  const verify = async (raw: string) => {
    const clean = normalize(raw);
    setResult(null);
    if (!HASH_RE.test(clean)) {
      setError("O código de verificação tem 64 caracteres (letras de a–f e números). Confira o rodapé do documento.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await apiClient.get(`/contracts/verify/${clean}`, { headers: PUBLIC_HEADERS });
      setResult(res.data);
    } catch (e) {
      setError(
        apiErrorStatus(e) === 429
          ? apiErrorMessage(e, "Muitas consultas em pouco tempo. Aguarde um instante e tente de novo.")
          : apiErrorMessage(e, "Não foi possível consultar agora. Tente novamente em instantes.")
      );
    } finally {
      setLoading(false);
    }
  };

  // Link do rodapé do PDF / da página do contrato já traz o hash
  useEffect(() => {
    const fromUrl = searchParams.get("hash");
    if (fromUrl) {
      setHash(fromUrl);
      verify(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const c = result?.contract;
  const signedCount = c?.signatures.filter((s) => s.signedAt).length ?? 0;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto max-w-3xl px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <FileSignature className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm">IsoScanning</span>
            <span className="text-muted-foreground text-sm hidden sm:block">· Verificação de contrato</span>
          </Link>
          <Link href="/" className="text-xs text-muted-foreground hover:text-indigo-600">Conhecer plataforma</Link>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-10 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-green-600" /> Verificar autenticidade de um contrato
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Todo contrato enviado para assinatura pela IsoScanning tem o texto congelado e identificado por um
            código SHA-256. Cole o código abaixo para confirmar que o documento que você tem em mãos existe na
            plataforma, qual é o status dele e quem assinou. A consulta não mostra o texto do contrato nem dados de contato.
          </p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); verify(hash); }}
          className="rounded-2xl border bg-card p-5 space-y-3"
        >
          <label className="text-sm font-medium" htmlFor="hash">Código de verificação</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="hash"
              value={hash}
              onChange={(e) => setHash(e.target.value)}
              placeholder="64 caracteres — ex.: 3f9a1c…"
              spellCheck={false}
              autoComplete="off"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <Search className="h-4 w-4" /> {loading ? "Consultando..." : "Verificar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>
              Onde encontrar: no rodapé do PDF/impressão do contrato (“Código de verificação”), na página de assinatura
              (abaixo do texto) e, para quem tem conta, no card “Autenticidade do documento” dentro do contrato.
            </span>
          </p>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}
        </form>

        {result && !result.found && (
          <div className="rounded-2xl border-2 border-red-200 bg-red-50/60 dark:bg-red-950/20 p-6 space-y-2">
            <h2 className="font-bold text-lg text-red-700 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Nenhum contrato encontrado com este código
            </h2>
            <p className="text-sm text-red-800/80 dark:text-red-200/80">
              Ou o código foi digitado errado, ou o documento não corresponde a nenhum contrato enviado pela plataforma.
              Qualquer alteração no texto — uma vírgula que seja — gera um código diferente. Confira o código no rodapé
              do documento e tente de novo.
            </p>
            <p className="text-xs font-mono break-all text-muted-foreground">{result.hash}</p>
          </div>
        )}

        {result && result.found && c && (
          <div className="space-y-4">
            <div className={`rounded-2xl border-2 p-6 space-y-3 ${c.fullySigned ? "border-green-300 bg-green-50/60 dark:bg-green-950/20" : "border-amber-300 bg-amber-50/60 dark:bg-amber-950/20"}`}>
              <h2 className={`font-bold text-lg flex items-center gap-2 ${c.fullySigned ? "text-green-700" : "text-amber-800"}`}>
                {c.fullySigned ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                {c.fullySigned ? "Documento autêntico e totalmente assinado" : "Documento encontrado — ainda não totalmente assinado"}
              </h2>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><dt className="text-xs text-muted-foreground">Título</dt><dd className="font-medium">{c.title}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Status</dt><dd className="font-medium">{STATUS_LABELS[c.status] ?? c.status}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Contratado(a)</dt><dd>{c.ownerName}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Contratante</dt><dd>{c.clientName}</dd></div>
                {c.sentAt && <div><dt className="text-xs text-muted-foreground">Texto congelado em</dt><dd>{fmt(c.sentAt)}</dd></div>}
                {c.terminatedAt && <div><dt className="text-xs text-muted-foreground">Encerrado (distrato) em</dt><dd>{fmt(c.terminatedAt)}</dd></div>}
              </dl>
              {c.supersededBy && (
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  Este contrato foi substituído por uma versão mais recente. Confira se o documento em mãos é a versão vigente.
                </p>
              )}
              {c.status === "terminated" && (
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <FileX2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  As assinaturas são válidas, mas o contrato foi encerrado por acordo entre as partes (distrato).
                </p>
              )}
            </div>

            <div className="rounded-2xl border bg-card p-5 space-y-3">
              <h3 className="font-semibold text-sm">Assinaturas ({signedCount}/{c.signatures.length})</h3>
              <ul className="space-y-2">
                {c.signatures.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {s.signedAt ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" /> : <Clock className="h-4 w-4 text-yellow-500 mt-0.5" />}
                    <div>
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground"> · {ROLE_LABELS[s.role] ?? s.role}</span>
                      {s.signedAt ? (
                        <p className="text-xs text-muted-foreground">
                          Assinou em {fmt(s.signedAt)}
                          {s.signatureHashPrefix && <> · hash da assinatura começa com <span className="font-mono">{s.signatureHashPrefix}</span></>}
                          {s.authenticated && " · assinou logado(a) na conta"}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Ainda não assinou</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Compare o início do hash de cada assinatura com o que aparece no bloco “Assinaturas eletrônicas” do documento impresso.
              </p>
            </div>
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground py-6">
          Assinatura eletrônica com validade jurídica · Lei 14.063/2020 · MP 2.200-2/2001
        </div>
      </div>
    </main>
  );
}
