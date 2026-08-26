import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { CommunityDetail } from "@/components/community/community-detail";
import { JsonLd } from "@/components/community/json-ld";
import { getCommunityBySlug, isValidSlug, listCommunityPosts } from "@/lib/server/community-public";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { communityPath, postPath } from "@/lib/community-paths";

// Server Component + ISR (5 min). Dados lidos direto do Supabase (anon, RLS
// pública) — sem depender da API no Render para renderizar o HTML.
export const revalidate = 300;

// Sem isto a rota dinâmica é renderizada por request (streaming): o status sai
// como 200 antes do notFound() e nada é cacheado. Com [] + dynamicParams (default
// true) cada slug é gerado sob demanda no 1º acesso, cacheado e revalidado —
// e um slug inexistente responde 404 de verdade. Nenhum acesso ao banco no build.
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

// cache(): generateMetadata e a página compartilham a mesma consulta no render.
const loadCommunity = cache(async (slug: string) => {
  if (!isValidSlug(slug)) return null;
  return getCommunityBySlug(slug);
});

function describe(description: string, name: string): string {
  const clean = (description || "").replace(/\s+/g, " ").trim();
  if (clean) return clean.length > 160 ? `${clean.slice(0, 157).trimEnd()}…` : clean;
  return `Discussões sobre ${name} na comunidade ${SITE_NAME}: fotografia, vídeo, social media e tecnologia.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const community = await loadCommunity(slug);
  if (!community) {
    return { title: `Comunidade não encontrada | ${SITE_NAME}`, robots: { index: false, follow: false } };
  }

  const path = communityPath(community.slug);
  const title = `${community.name} — Comunidade`;
  const description = describe(community.description, community.name);
  const image = community.bannerUrl || community.avatarUrl || undefined;

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title,
      description,
      url: absoluteUrl(path),
      siteName: SITE_NAME,
      locale: "pt_BR",
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description },
  };
}

export default async function CommunityPage({ params }: Props) {
  const { slug } = await params;
  const community = await loadCommunity(slug);
  if (!community) notFound();

  const posts = await listCommunityPosts(community.id);
  const url = absoluteUrl(communityPath(community.slug));

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Comunidade", item: absoluteUrl("/comunidade") },
      { "@type": "ListItem", position: 2, name: community.name, item: url },
    ],
  };

  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": url,
    url,
    name: community.name,
    description: describe(community.description, community.name),
    inLanguage: "pt-BR",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/") },
    hasPart: posts.slice(0, 50).map((post) => ({
      "@type": "DiscussionForumPosting",
      headline: post.title,
      url: absoluteUrl(postPath(community.slug, post)),
      datePublished: post.createdAt,
      author: { "@type": "Person", name: post.author.name },
    })),
  };

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={collection} />
      <CommunityDetail community={community} posts={posts} />
    </>
  );
}
