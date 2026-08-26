import type { MetadataRoute } from "next";
import { listSitemapEntries } from "@/lib/server/community-public";
import { absoluteUrl } from "@/lib/site";
import { communityPath, postPath } from "@/lib/community-paths";

// Servido em /sitemap.xml. Regenerado a cada hora. Páginas estáticas públicas +
// todas as comunidades e posts (lastModified = updated_at do banco).
export const revalidate = 3600;

const STATIC_PAGES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/comunidade", priority: 0.9, changeFrequency: "daily" },
  { path: "/profissionais", priority: 0.8, changeFrequency: "daily" },
  { path: "/equipamentos", priority: 0.8, changeFrequency: "daily" },
  { path: "/vagas", priority: 0.7, changeFrequency: "daily" },
  { path: "/como-funciona", priority: 0.6, changeFrequency: "monthly" },
  { path: "/precos", priority: 0.6, changeFrequency: "monthly" },
  { path: "/ajuda", priority: 0.4, changeFrequency: "monthly" },
  { path: "/termos", priority: 0.2, changeFrequency: "monthly" },
  { path: "/privacidade", priority: 0.2, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: absoluteUrl(page.path),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  try {
    const { communities, posts } = await listSitemapEntries();

    for (const community of communities) {
      entries.push({
        url: absoluteUrl(communityPath(community.slug)),
        lastModified: new Date(community.updatedAt),
        changeFrequency: "daily",
        priority: 0.8,
      });
    }

    for (const post of posts) {
      entries.push({
        url: absoluteUrl(postPath(post.communitySlug, { id: "", slug: post.slug })),
        lastModified: new Date(post.updatedAt),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch (error) {
    // Mantém as páginas estáticas mesmo se o banco falhar; a próxima
    // regeneração (1 h) tenta de novo.
    console.error("[sitemap] falha ao carregar comunidade:", error);
  }

  return entries;
}
