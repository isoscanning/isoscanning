import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import EquipmentDetailsPage from "./equipment-details-client";
import { JsonLd } from "@/components/community/json-ld";
import { getPublicEquipment, isUuid, summarize } from "@/lib/server/public-catalog";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

// Server Component + ISR (5 min) para <head> e JSON-LD (Product); a página em
// si continua sendo o client component. Padrão de app/c/[slug]/page.tsx.
export const revalidate = 300;

export async function generateStaticParams(): Promise<{ id: string }[]> {
  return [];
}

type Props = { params: Promise<{ id: string }> };

const load = cache(async (id: string) => (isUuid(id) ? getPublicEquipment(id) : null));

const NEGOTIATION_LABEL: Record<string, string> = {
  sale: "à venda",
  sell: "à venda",
  rent: "para alugar",
  rental: "para alugar",
  both: "venda ou aluguel",
  exchange: "para troca",
  trade: "para troca",
};

const CONDITION_LABEL: Record<string, string> = {
  new: "novo",
  used: "usado",
  refurbished: "recondicionado",
};

function money(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const e = await load(id);
  if (!e) {
    return { title: `Equipamento não encontrado | ${SITE_NAME}`, robots: { index: false, follow: false } };
  }

  const path = `/equipamentos/${e.id}`;
  const where = [e.city, e.state].filter(Boolean).join("/");
  const deal = e.negotiationType ? NEGOTIATION_LABEL[e.negotiationType.toLowerCase()] ?? "" : "";
  const fullName = [e.name, e.brand && !e.name.toLowerCase().includes(e.brand.toLowerCase()) ? e.brand : null]
    .filter(Boolean)
    .join(" ");
  const title = `${fullName}${deal ? ` ${deal}` : ""}${where ? ` em ${where}` : ""}`;
  const price = money(e.price);
  const condition = e.condition ? CONDITION_LABEL[e.condition.toLowerCase()] ?? e.condition : "";
  const description =
    summarize(e.description) ||
    `${fullName}${condition ? ` ${condition}` : ""}${deal ? ` ${deal}` : ""}${price ? ` por ${price}` : ""}${where ? ` em ${where}` : ""}. Negocie direto com o dono na ${SITE_NAME}.`;

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: path },
    // Equipamento já vendido/indisponível fica acessível mas sai do índice
    ...(e.isAvailable ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      type: "website",
      title,
      description,
      url: absoluteUrl(path),
      siteName: SITE_NAME,
      locale: "pt_BR",
      ...(e.imageUrls.length ? { images: e.imageUrls.slice(0, 3).map((u) => ({ url: u })) } : {}),
    },
    twitter: { card: e.imageUrls.length ? "summary_large_image" : "summary", title, description },
  };
}

export default async function EquipmentPage({ params }: Props) {
  const { id } = await params;
  const e = await load(id);
  if (!e) notFound();

  const url = absoluteUrl(`/equipamentos/${e.id}`);
  const product: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: e.name,
    url,
    ...(e.imageUrls.length ? { image: e.imageUrls } : {}),
    ...(e.description ? { description: summarize(e.description, 500) } : {}),
    ...(e.brand ? { brand: { "@type": "Brand", name: e.brand } } : {}),
    ...(e.model ? { model: e.model } : {}),
    ...(e.category ? { category: e.category } : {}),
    ...(e.price !== null
      ? {
        offers: {
          "@type": "Offer",
          url,
          priceCurrency: "BRL",
          price: e.price,
          availability: e.isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          itemCondition:
            e.condition && e.condition.toLowerCase() === "new"
              ? "https://schema.org/NewCondition"
              : "https://schema.org/UsedCondition",
          ...(e.city || e.state
            ? {
              areaServed: {
                "@type": "Place",
                address: {
                  "@type": "PostalAddress",
                  ...(e.city ? { addressLocality: e.city } : {}),
                  ...(e.state ? { addressRegion: e.state } : {}),
                  addressCountry: "BR",
                },
              },
            }
            : {}),
        },
      }
      : {}),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Equipamentos", item: absoluteUrl("/equipamentos") },
      { "@type": "ListItem", position: 2, name: e.name, item: url },
    ],
  };

  return (
    <>
      <JsonLd data={product} />
      <JsonLd data={breadcrumb} />
      <EquipmentDetailsPage />
    </>
  );
}
