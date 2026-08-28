import type { SupportChannel } from "./plan-limits";

/**
 * Canais de suporte por plano (Free → comunidade, Pro → e-mail, Ultra → WhatsApp).
 *
 * Configure no ambiente:
 *   NEXT_PUBLIC_SUPPORT_EMAIL     e-mail de suporte (default isoscanning@gmail.com)
 *   NEXT_PUBLIC_SUPPORT_WHATSAPP  número comercial em formato internacional, só dígitos
 *                                 (ex.: 5511999999999). Vazio = "número em configuração".
 */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "isoscanning@gmail.com";
export const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "";

export const SUPPORT_CHANNEL_LABELS: Record<SupportChannel, string> = {
  community: "Comunidade",
  email: "E-mail",
  whatsapp: "WhatsApp prioritário",
};

export const SUPPORT_CHANNEL_DESCRIPTIONS: Record<SupportChannel, string> = {
  community: "Tire dúvidas e troque experiências com outros profissionais na comunidade IsoScanning.",
  email: "Fale com nossa equipe por e-mail. Respondemos em até 1 dia útil.",
  whatsapp: "Atendimento prioritário direto no WhatsApp com a equipe IsoScanning.",
};

/** Só dígitos do número de WhatsApp — vazio quando não configurado. */
export function supportWhatsappDigits(): string {
  return SUPPORT_WHATSAPP.replace(/\D/g, "");
}

/**
 * Link do canal de suporte. Retorna `null` para WhatsApp enquanto
 * NEXT_PUBLIC_SUPPORT_WHATSAPP não estiver definido (evita link quebrado).
 */
export function supportHref(channel: SupportChannel): string | null {
  switch (channel) {
    case "community":
      return "/comunidade";
    case "email":
      return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Suporte IsoScanning")}`;
    case "whatsapp": {
      const digits = supportWhatsappDigits();
      if (!digits) return null;
      return `https://wa.me/${digits}?text=${encodeURIComponent("Olá! Preciso de suporte na IsoScanning.")}`;
    }
    default:
      return null;
  }
}
