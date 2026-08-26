import type { Metadata } from "next";
import { CommunityDirectory } from "@/components/community/community-directory";
import { listCommunities } from "@/lib/server/community-public";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import type { PublicCommunity } from "@/lib/community-types";

// Server Component + ISR: a lista de comunidades vai no HTML (indexável) e é
// regenerada a cada 5 min ou via revalidateCommunityPaths().
export const revalidate = 300;

const DESCRIPTION =
  "Comunidades de fotografia, vídeo, drones, social media e tecnologia. Tire dúvidas, compartilhe dicas de equipamentos, precificação e bastidores com profissionais do audiovisual.";

export const metadata: Metadata = {
  title: `Comunidade | ${SITE_NAME}`,
  description: DESCRIPTION,
  alternates: { canonical: "/comunidade" },
  openGraph: {
    type: "website",
    title: `Comunidade ${SITE_NAME}`,
    description: DESCRIPTION,
    url: absoluteUrl("/comunidade"),
    siteName: SITE_NAME,
    locale: "pt_BR",
  },
  twitter: { card: "summary", title: `Comunidade ${SITE_NAME}`, description: DESCRIPTION },
};

export default async function CommunityPage() {
  let communities: PublicCommunity[] = [];
  try {
    communities = await listCommunities();
  } catch (error) {
    // Não derruba a página (nem o build) se o banco estiver indisponível;
    // a próxima revalidação tenta de novo.
    console.error("[comunidade] falha ao listar comunidades:", error);
  }

  return <CommunityDirectory communities={communities} />;
}
