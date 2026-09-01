import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import DetalhesVagaPage from "./job-offer-client";
import { JsonLd } from "@/components/community/json-ld";
import { getPublicJobOffer, isUuid, summarize } from "@/lib/server/public-catalog";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

// Server Component + ISR (5 min) para <head> e JSON-LD (JobPosting); a página
// em si continua sendo o client component. Padrão de app/c/[slug]/page.tsx.
export const revalidate = 300;

export async function generateStaticParams(): Promise<{ id: string }[]> {
  return [];
}

type Props = { params: Promise<{ id: string }> };

const load = cache(async (id: string) => (isUuid(id) ? getPublicJobOffer(id) : null));

const JOB_TYPE_LABEL: Record<string, string> = {
  freelance: "Freelance",
  freela: "Freelance",
  contract: "Contrato",
  temporary: "Temporário",
  full_time: "Tempo integral",
  part_time: "Meio período",
  project: "Projeto",
};

/** schema.org employmentType a partir do nosso job_type (fallback CONTRACTOR). */
function employmentType(jobType: string | null): string {
  const t = (jobType ?? "").toLowerCase();
  if (t.includes("full")) return "FULL_TIME";
  if (t.includes("part")) return "PART_TIME";
  if (t.includes("temp")) return "TEMPORARY";
  return "CONTRACTOR";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = await load(id);
  if (!job) {
    return { title: `Vaga não encontrada | ${SITE_NAME}`, robots: { index: false, follow: false } };
  }

  const path = `/vagas/${job.id}`;
  const remote = (job.locationType ?? "").toLowerCase().includes("remot");
  const where = remote ? "remoto" : [job.city, job.state].filter(Boolean).join("/");
  const kind = job.jobType ? JOB_TYPE_LABEL[job.jobType.toLowerCase()] ?? job.jobType : "";
  const title = `${job.title}${where ? ` — ${where}` : ""}`;
  const description =
    summarize(job.description) ||
    `Vaga${kind ? ` ${kind.toLowerCase()}` : ""} para ${job.title}${where ? ` (${where})` : ""}${job.employerName ? ` com ${job.employerName}` : ""}. Candidate-se na ${SITE_NAME}.`;

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: path },
    // Vaga encerrada continua acessível para quem tem o link, mas sai do índice
    ...(job.isActive ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      type: "website",
      title,
      description,
      url: absoluteUrl(path),
      siteName: SITE_NAME,
      locale: "pt_BR",
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function JobOfferPage({ params }: Props) {
  const { id } = await params;
  const job = await load(id);
  if (!job) notFound();

  const url = absoluteUrl(`/vagas/${job.id}`);
  const remote = (job.locationType ?? "").toLowerCase().includes("remot");

  // JobPosting só para vaga ativa: o Google penaliza posting expirado sem validThrough.
  const posting: Record<string, unknown> | null = job.isActive
    ? {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: job.title,
      description: summarize(job.description, 1000) || job.title,
      datePosted: job.createdAt,
      ...(job.endDate ? { validThrough: job.endDate } : {}),
      employmentType: employmentType(job.jobType),
      hiringOrganization: {
        "@type": "Organization",
        name: job.employerName || SITE_NAME,
      },
      ...(remote
        ? { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: "Brasil" } }
        : {
          jobLocation: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              ...(job.city ? { addressLocality: job.city } : {}),
              ...(job.state ? { addressRegion: job.state } : {}),
              addressCountry: "BR",
            },
          },
        }),
      url,
      directApply: true,
    }
    : null;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Vagas", item: absoluteUrl("/vagas") },
      { "@type": "ListItem", position: 2, name: job.title, item: url },
    ],
  };

  return (
    <>
      {posting && <JsonLd data={posting} />}
      <JsonLd data={breadcrumb} />
      <DetalhesVagaPage />
    </>
  );
}
