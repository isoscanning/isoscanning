"use client";

import { ContractHtml } from "@/components/contracts/contract-html";
import { buildVerifyUrl } from "@/lib/contracts/contract-utils";
import { ShieldCheck } from "lucide-react";

export interface DocumentSignature {
  role: string;
  name: string;
  email?: string | null;
  document?: string | null;
  signedAt?: string | null;
  signatureHash?: string | null;
  signatureIp?: string | null;
  authenticated?: boolean;
}

interface ContractDocumentProps {
  title: string;
  body: string;
  bodyHash?: string | null;
  sentAt?: string | null;
  status: string;
  signatures: DocumentSignature[];
  contractId?: string;
  terminatedAt?: string | null;
  terminationReason?: string | null;
  /** Ultra: sem a marca IsoScanning no rodapé. O código de verificação permanece. */
  whiteLabel?: boolean;
  className?: string;
}

const ROLE_LABELS: Record<string, string> = {
  sender: "Contratado(a)",
  owner: "Contratado(a)",
  recipient: "Contratante",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho — sem validade",
  sent: "Aguardando assinaturas",
  partially_signed: "Parcialmente assinado",
  fully_signed: "Assinado por todas as partes",
  rejected: "Recusado",
  cancelled: "Cancelado",
  expired: "Expirado sem assinatura",
  terminated: "Encerrado por distrato",
};

/**
 * Versão "papel" do contrato: corpo congelado + bloco de assinaturas + rodapé
 * com o código de verificação. É o que se imprime / salva em PDF (Ctrl+P).
 */
export function ContractDocument({
  title, body, bodyHash, sentAt, status, signatures, contractId,
  terminatedAt, terminationReason, whiteLabel, className,
}: ContractDocumentProps) {
  const fmtDateTime = (v?: string | null) => (v ? new Date(v).toLocaleString("pt-BR") : "");
  const verifyUrl = buildVerifyUrl(bodyHash);

  return (
    <article
      aria-label={title}
      className={`contract-document bg-white text-black rounded-xl border shadow-sm print:shadow-none print:border-0 print:rounded-none ${className ?? ""}`}
    >
      <div className="px-8 py-10 print:px-0 print:py-0">
        <ContractHtml html={body} className="text-black [&_*]:text-black [&_a]:text-blue-700" />

        {/* Bloco de assinaturas eletrônicas */}
        <section className="mt-12 pt-6 border-t-2 border-gray-300 break-inside-avoid">
          <h2 className="text-base font-bold uppercase tracking-wide text-gray-800 mb-4">Assinaturas eletrônicas</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {signatures.map((s, i) => (
              <div key={`${s.role}-${i}`} className="text-sm">
                <div className="border-b border-gray-500 pb-1 mb-2 min-h-[2.5rem] flex items-end">
                  <span className="font-semibold text-gray-900">{s.name}</span>
                </div>
                <p className="text-xs text-gray-600">{ROLE_LABELS[s.role] ?? s.role}</p>
                {s.document && <p className="text-xs text-gray-600">CPF/CNPJ: {s.document}</p>}
                {s.email && <p className="text-xs text-gray-600">{s.email}</p>}
                {s.signedAt ? (
                  <div className="mt-1.5 text-[11px] text-gray-700 space-y-0.5">
                    <p>Assinado eletronicamente em {fmtDateTime(s.signedAt)}</p>
                    {s.signatureIp && <p>IP: {s.signatureIp}</p>}
                    {s.authenticated && <p>Conta autenticada na plataforma</p>}
                    {s.signatureHash && (
                      <p className="font-mono break-all text-[10px] text-gray-500">Assinatura: {s.signatureHash}</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-1.5 text-[11px] text-gray-500 italic">Pendente de assinatura</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {terminatedAt && (
          <section className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-700 break-inside-avoid">
            <p className="font-semibold">Distrato registrado em {fmtDateTime(terminatedAt)}</p>
            {terminationReason && <p className="italic mt-1">&quot;{terminationReason}&quot;</p>}
          </section>
        )}

        {/* Rodapé de verificação */}
        <footer className="mt-10 pt-4 border-t border-gray-300 text-[10px] text-gray-600 space-y-1 break-inside-avoid">
          <p className="flex items-center gap-1 font-semibold text-gray-800">
            <ShieldCheck className="h-3 w-3" /> {STATUS_LABELS[status] ?? status}
            {sentAt && <span className="font-normal"> · enviado para assinatura em {fmtDateTime(sentAt)}</span>}
          </p>
          {bodyHash ? (
            <>
              <p className="font-mono break-all">Código de verificação (SHA-256 do conteúdo): {bodyHash}</p>
              <p>
                Confira a autenticidade deste documento em <span className="font-mono">{verifyUrl}</span>.
                Qualquer alteração no texto gera um código diferente.
              </p>
            </>
          ) : (
            <p>Este documento ainda não foi enviado para assinatura; o código de verificação é gerado no envio.</p>
          )}
          {contractId && <p>Identificador: {contractId}</p>}
          {!whiteLabel && (
            <p>
              Assinatura eletrônica registrada pela plataforma IsoScanning (www.isoscanning.com), com data, hora,
              endereço IP e hash criptográfico — Lei nº 14.063/2020 e MP nº 2.200-2/2001.
            </p>
          )}
          <p>Impresso em {new Date().toLocaleString("pt-BR")}.</p>
        </footer>
      </div>
    </article>
  );
}
