import type { Metadata } from "next";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

// Title/description/canonical da Central de Ajuda.
const TITLE = "Central de Ajuda";
const DESCRIPTION =
  "Perguntas frequentes sobre contratação, orçamentos, contratos, pagamentos, equipamentos, avaliações e conta na IsoScanning.";

export const metadata: Metadata = {
  title: `${TITLE} | ${SITE_NAME}`,
  description: DESCRIPTION,
  alternates: { canonical: "/ajuda" },
  openGraph: {
    type: "website",
    title: `${TITLE} — ${SITE_NAME}`,
    description: DESCRIPTION,
    url: absoluteUrl("/ajuda"),
    siteName: SITE_NAME,
    locale: "pt_BR",
  },
  twitter: { card: "summary", title: `${TITLE} — ${SITE_NAME}`, description: DESCRIPTION },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
