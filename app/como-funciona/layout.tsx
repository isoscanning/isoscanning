import type { Metadata } from "next";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

// A página é client-side; title/description/canonical vêm deste layout.
const TITLE = "Como Funciona a IsoScanning";
const DESCRIPTION =
  "Do orçamento à entrega: veja como encontrar profissionais de fotografia e vídeo, contratar com segurança, alugar equipamentos e gerenciar seus trabalhos na plataforma.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/como-funciona" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/como-funciona"),
    siteName: SITE_NAME,
    locale: "pt_BR",
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
