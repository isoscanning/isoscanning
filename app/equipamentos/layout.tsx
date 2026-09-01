import type { Metadata } from "next";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

// A página é client-side; title/description/canonical vêm deste layout.
const TITLE = "Aluguel e Venda de Equipamentos de Fotografia e Vídeo";
const DESCRIPTION =
  "Câmeras, lentes, iluminação, áudio, drones e acessórios para alugar ou comprar direto de outros profissionais. Anuncie grátis o equipamento que está parado.";

export const metadata: Metadata = {
  title: `${TITLE} | ${SITE_NAME}`,
  description: DESCRIPTION,
  alternates: { canonical: "/equipamentos" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/equipamentos"),
    siteName: SITE_NAME,
    locale: "pt_BR",
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

export default function EquipmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
