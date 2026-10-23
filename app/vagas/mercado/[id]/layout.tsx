import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

// Vaga externa é conteúdo de outra plataforma: fora do índice do Google para
// não virar conteúdo duplicado (e o detalhe exige login de qualquer forma).
export const metadata: Metadata = {
  title: `Vaga do mercado | ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default function ExternalJobLayout({ children }: { children: React.ReactNode }) {
  return children;
}
