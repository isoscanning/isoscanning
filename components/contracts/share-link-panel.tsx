"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, MessageCircle, Mail, Link2, Info } from "lucide-react";
import {
  buildShareMessage,
  buildSigningUrl,
  copyToClipboard,
  mailtoShareHref,
  whatsappShareHref,
} from "@/lib/contracts/contract-utils";

export interface ShareParty {
  id: string;
  name: string;
  email: string;
  partyRole: string;
  signatureToken: string;
  signedAt?: string | null;
  rejectedAt?: string | null;
  viewedAt?: string | null;
  /** Parte vinculada a uma conta: assina logada, mas o link é o mesmo. */
  userId?: string | null;
}

interface ShareLinkPanelProps {
  title: string;
  ownerName: string;
  expiresAt?: string | null;
  parties: ShareParty[];
  /** Título da caixa (default "Compartilhar link de assinatura"). */
  heading?: string;
  compact?: boolean;
  /** A própria parte do leitor não aparece aqui — ele assina pelo botão "Assinar". */
  viewerId?: string | null;
}

/**
 * A plataforma NÃO envia e-mail: quem criou o contrato compartilha o link de
 * assinatura por WhatsApp, e-mail ou como preferir. Este painel deixa isso
 * explícito e entrega o link e a mensagem prontos.
 */
export function ShareLinkPanel({ title, ownerName, expiresAt, parties, heading, compact, viewerId }: ShareLinkPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const pending = parties.filter(
    (p) => p.signatureToken && !p.signedAt && !p.rejectedAt && !(viewerId && p.userId === viewerId)
  );
  if (pending.length === 0) return null;

  const handleCopy = async (party: ShareParty, text: string, kind: "link" | "message") => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(`${party.id}:${kind}`);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  return (
    <div className={`rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-900/10 ${compact ? "p-4 space-y-3" : "p-5 space-y-4"}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
          <Link2 className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-sm">{heading ?? "Compartilhar link de assinatura"}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A IsoScanning <strong>não envia e-mails automaticamente</strong>. Copie o link abaixo e envie por
            WhatsApp, e-mail ou outro canal — a outra parte abre, lê e assina sem precisar criar conta.
            Nesta página você acompanha quando ela abrir o link e recebe uma notificação quando assinar ou recusar.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {pending.map((party) => {
          const link = buildSigningUrl(party.signatureToken);
          const message = buildShareMessage({ title, ownerName, partyName: party.name, link, expiresAt });
          const roleLabel = party.partyRole === "recipient" ? "Contratante" : party.partyRole === "sender" ? "Contratado(a)" : "Parte";
          return (
            <div key={party.id} className="rounded-lg border bg-background p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {party.name} <span className="text-xs text-muted-foreground font-normal">· {roleLabel}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{party.email}</div>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {party.rejectedAt ? "Recusou" : party.viewedAt ? "Já visualizou o link" : "Ainda não abriu o link"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={link}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-md border bg-muted/40 text-xs font-mono truncate"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs flex-shrink-0"
                  onClick={() => handleCopy(party, link, "link")}
                >
                  {copiedId === `${party.id}:link` ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedId === `${party.id}:link` ? "Copiado" : "Copiar link"}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <a href={whatsappShareHref(message)} target="_blank" rel="noopener noreferrer">
                  <Button type="button" size="sm" className="gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white">
                    <MessageCircle className="h-3.5 w-3.5" /> Enviar por WhatsApp
                  </Button>
                </a>
                <a href={mailtoShareHref(party.email, `Contrato para assinatura: ${title}`, message)}>
                  <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs">
                    <Mail className="h-3.5 w-3.5" /> Abrir no seu e-mail
                  </Button>
                </a>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-xs"
                  onClick={() => handleCopy(party, message, "message")}
                >
                  {copiedId === `${party.id}:message` ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  Copiar mensagem pronta
                </Button>
              </div>

              {party.userId && (
                <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  Esta parte tem conta na IsoScanning: ela também recebe a notificação aqui e precisa estar logada para assinar.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
