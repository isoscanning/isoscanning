"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, MessageCircle, Mail, Link2, Eye } from "lucide-react";
import { copyToClipboard, mailtoShareHref, whatsappShareHref } from "@/lib/contracts/contract-utils";
import { buildProposalShareMessage, buildProposalUrl, formatDateTime } from "@/lib/budget/budget-calc";

interface ProposalSharePanelProps {
  token: string;
  eventName: string;
  ownerName: string;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  price: number;
  validUntil?: string | null;
  viewCount: number;
  viewedAt?: string | null;
  compact?: boolean;
}

/**
 * A plataforma NÃO envia e-mail: quem criou a proposta compartilha o link
 * público por WhatsApp, e-mail ou como preferir. Mesmo padrão do painel de
 * assinatura dos contratos.
 */
export function ProposalSharePanel({
  token, eventName, ownerName, clientName, clientEmail, clientPhone, price, validUntil, viewCount, viewedAt, compact,
}: ProposalSharePanelProps) {
  const [copied, setCopied] = useState<"link" | "message" | null>(null);

  const link = buildProposalUrl(token);
  const message = buildProposalShareMessage({ eventName, ownerName, clientName, price, link, validUntil });

  const handleCopy = async (text: string, kind: "link" | "message") => {
    if (await copyToClipboard(text)) {
      setCopied(kind);
      setTimeout(() => setCopied(null), 2500);
    }
  };

  return (
    <div className={`rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/10 ${compact ? "p-4 space-y-3" : "p-5 space-y-4"}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
          <Link2 className="h-4 w-4" />
        </div>
        <div className="space-y-1 min-w-0">
          <h3 className="font-semibold text-sm">Compartilhar proposta com o cliente</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A IsoScanning <strong>não envia e-mails automaticamente</strong>. Copie o link e envie por WhatsApp,
            e-mail ou outro canal. O cliente abre, vê o valor e aprova ou recusa sem precisar criar conta —
            você recebe uma notificação na hora.
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-background p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{clientName || "Cliente"}</div>
            {clientEmail && <div className="text-xs text-muted-foreground truncate">{clientEmail}</div>}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {viewCount > 0
              ? `Visualizada ${viewCount}× · última em ${formatDateTime(viewedAt)}`
              : "Ainda não abriu o link"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-md border bg-muted/40 text-xs font-mono truncate"
          />
          <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs flex-shrink-0" onClick={() => handleCopy(link, "link")}>
            {copied === "link" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied === "link" ? "Copiado" : "Copiar link"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={whatsappShareHref(message, clientPhone)} target="_blank" rel="noopener noreferrer">
            <Button type="button" size="sm" className="gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white">
              <MessageCircle className="h-3.5 w-3.5" /> Enviar por WhatsApp
            </Button>
          </a>
          {clientEmail && (
            <a href={mailtoShareHref(clientEmail, `Proposta: ${eventName}`, message)}>
              <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs">
                <Mail className="h-3.5 w-3.5" /> Abrir no seu e-mail
              </Button>
            </a>
          )}
          <Button type="button" size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={() => handleCopy(message, "message")}>
            {copied === "message" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            Copiar mensagem pronta
          </Button>
        </div>
      </div>
    </div>
  );
}
