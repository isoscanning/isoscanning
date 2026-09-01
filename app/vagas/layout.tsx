import type { Metadata } from "next";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

// A página é client-side; title/description/canonical vêm deste layout.
const TITLE = "Vagas e Freelas de Fotografia, Vídeo e Social Media";
const DESCRIPTION =
  "Oportunidades para fotógrafos, videomakers, editores e social media: freelas, cobertura de eventos e trabalhos fixos. Publique sua vaga grátis e receba candidaturas.";

export const metadata: Metadata = {
  title: `${TITLE} | ${SITE_NAME}`,
  description: DESCRIPTION,
  alternates: { canonical: "/vagas" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/vagas"),
    siteName: SITE_NAME,
    locale: "pt_BR",
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
