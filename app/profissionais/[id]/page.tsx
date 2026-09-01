import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import ProfessionalProfilePage from "./professional-profile-client";
import { JsonLd } from "@/components/community/json-ld";
import { getPublicProfessional, isUuid, summarize } from "@/lib/server/public-catalog";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

// Server Component + ISR (5 min) só para o <head> (title/description/canonical/
// OG) e o JSON-LD; a página em si continua sendo o client component (busca
// portfólio, avaliações e agenda pela API com o token do visitante).
// Mesmo padrão de app/c/[slug]/page.tsx.
export const revalidate = 300;

// [] + dynamicParams: cada id é gerado sob demanda no 1º acesso e cacheado; id
// inexistente responde 404 de verdade (sem isto o notFound() saía como 200).
export async function generateStaticParams(): Promise<{ id: string }[]> {
  return [];
}

type Props = { params: Promise<{ id: string }> };

const load = cache(async (id: string) => (isUuid(id) ? getPublicProfessional(id) : null));

function placeOf(city: string | null, state: string | null): string {
  return [city, state].filter(Boolean).join("/");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await load(id);
  if (!p) {
    return { title: `Profissional não encontrado | ${SITE_NAME}`, robots: { index: false, follow: false } };
  }

  const path = `/profissionais/${p.id}`;
  const where = placeOf(p.city, p.state);
  const title = `${p.name}${p.specialty ? ` — ${p.specialty}` : ""}${where ? ` em ${where}` : ""}`;
  const description =
    summarize(p.description) ||
    `${p.name}${p.specialty ? `, ${p.specialty.toLowerCase()}` : ""}${where ? ` em ${where}` : ""}: veja portfólio, avaliações e disponibilidade e peça um orçamento na ${SITE_NAME}.`;

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "profile",
      title,
      description,
      url: absoluteUrl(path),
      siteName: SITE_NAME,
      locale: "pt_BR",
      ...(p.avatarUrl ? { images: [{ url: p.avatarUrl }] } : {}),
    },
    twitter: { card: p.avatarUrl ? "summary_large_image" : "summary", title, description },
  };
}

export default async function ProfessionalPage({ params }: Props) {
  const { id } = await params;
  const p = await load(id);
  if (!p) notFound();

  const url = absoluteUrl(`/profissionais/${p.id}`);
  const person: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: p.name,
    url,
    ...(p.specialty ? { jobTitle: p.specialty } : {}),
    ...(p.avatarUrl ? { image: p.avatarUrl } : {}),
    ...(p.description ? { description: summarize(p.description, 300) } : {}),
    ...(p.city || p.state
      ? {
        address: {
          "@type": "PostalAddress",
          ...(p.city ? { addressLocality: p.city } : {}),
          ...(p.state ? { addressRegion: p.state } : {}),
          addressCountry: "BR",
        },
      }
      : {}),
    ...(p.totalReviews > 0 && p.averageRating > 0
      ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: Number(p.averageRating.toFixed(1)),
          reviewCount: p.totalReviews,
          bestRating: 5,
        },
      }
      : {}),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Profissionais", item: absoluteUrl("/profissionais") },
      { "@type": "ListItem", position: 2, name: p.name, item: url },
    ],
  };

  return (
    <>
      <JsonLd data={person} />
      <JsonLd data={breadcrumb} />
      <ProfessionalProfilePage />
    </>
  );
}
