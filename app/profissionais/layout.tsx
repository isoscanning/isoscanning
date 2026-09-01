import type { Metadata } from "next";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

// A página é client-side; title/description/canonical vêm deste layout.
const TITLE = "Contratar Fotógrafo, Videomaker e Social Media";
const DESCRIPTION =
  "Encontre fotógrafos, videomakers, editores, pilotos de drone e social media por cidade e especialidade. Compare portfólios e avaliações e peça um orçamento grátis.";

export const metadata: Metadata = {
  title: `${TITLE} | ${SITE_NAME}`,
  description: DESCRIPTION,
  alternates: { canonical: "/profissionais" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/profissionais"),
    siteName: SITE_NAME,
    locale: "pt_BR",
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function ProfessionalsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
