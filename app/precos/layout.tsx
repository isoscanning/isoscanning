import type { Metadata } from "next";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

// A página é client-side; title/description/canonical vêm deste layout.
const TITLE = "Planos e Preços";
const DESCRIPTION =
  "Ferramentas de gestão para profissionais do audiovisual: orçamentos, contratos com assinatura eletrônica, finanças, agenda e social media. Comece grátis; Pro com 14 dias de teste.";

export const metadata: Metadata = {
  title: `${TITLE} | ${SITE_NAME}`,
  description: DESCRIPTION,
  alternates: { canonical: "/precos" },
  openGraph: {
    type: "website",
    title: `${TITLE} — ${SITE_NAME}`,
    description: DESCRIPTION,
    url: absoluteUrl("/precos"),
    siteName: SITE_NAME,
    locale: "pt_BR",
  },
  twitter: { card: "summary", title: `${TITLE} — ${SITE_NAME}`, description: DESCRIPTION },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
