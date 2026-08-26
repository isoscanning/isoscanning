import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Header } from "@/components/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MarkdownContent } from "@/components/community/markdown-content";
import { PostActions } from "@/components/community/post-actions";
import { PostComments } from "@/components/community/post-comments";
import { JsonLd } from "@/components/community/json-ld";
import {
  getCommunityBySlug,
  getPostBySlug,
  isValidSlug,
  listPostComments,
} from "@/lib/server/community-public";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { communityPath, postPath } from "@/lib/community-paths";
import type { PublicPost } from "@/lib/community-types";

// Página canônica do post: /c/<comunidade>/<slug>. Server Component + ISR (5 min).
// Conteúdo completo (markdown → HTML), metadata, JSON-LD e comentários no HTML.
export const revalidate = 300;

// Ver comentário em app/c/[slug]/page.tsx: garante ISR sob demanda + 404 real.
export async function generateStaticParams(): Promise<{ slug: string; postSlug: string }[]> {
  return [];
}

type Props = { params: Promise<{ slug: string; postSlug: string }> };

const loadPost = cache(async (slug: string, postSlug: string) => {
  if (!isValidSlug(slug) || !isValidSlug(postSlug)) return null;
  const community = await getCommunityBySlug(slug);
  if (!community) return null;
  const post = await getPostBySlug(community.id, postSlug);
  if (!post) return null;
  return { community, post };
});

function describe(post: PublicPost): string {
  const text = (post.excerpt || post.content || "").replace(/\s+/g, " ").trim();
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}

function hasImage(post: PublicPost): post is PublicPost & { mediaUrl: string } {
  return !!post.mediaUrl && post.mediaType === "image";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, postSlug } = await params;
  const data = await loadPost(slug, postSlug);
  if (!data) {
    return { title: `Publicação não encontrada | ${SITE_NAME}`, robots: { index: false, follow: false } };
  }

  const { community, post } = data;
  const path = postPath(community.slug, post);
  const title = `${post.title} · c/${community.slug}`;
  const description = describe(post);

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: path },
    authors: [{ name: post.author.name }],
    openGraph: {
      type: "article",
      title,
      description,
      url: absoluteUrl(path),
      siteName: SITE_NAME,
      locale: "pt_BR",
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      section: community.name,
      ...(hasImage(post) ? { images: [{ url: post.mediaUrl, alt: post.title }] } : {}),
    },
    twitter: { card: hasImage(post) ? "summary_large_image" : "summary", title, description },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug, postSlug } = await params;
  const data = await loadPost(slug, postSlug);
  if (!data) notFound();

  const { community, post } = data;
  const comments = await listPostComments(post.id);

  const path = postPath(community.slug, post);
  const url = absoluteUrl(path);
  const communityUrl = absoluteUrl(communityPath(community.slug));
  const publishedAt = new Date(post.createdAt);
  const publishedLabel = format(publishedAt, "d 'de' MMMM 'de' yyyy", { locale: ptBR });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "@id": url,
    url,
    mainEntityOfPage: url,
    headline: post.title,
    text: post.content,
    inLanguage: "pt-BR",
    datePublished: post.createdAt,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: post.author.name },
    publisher: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
    isPartOf: { "@type": "CollectionPage", name: community.name, url: communityUrl },
    ...(hasImage(post) ? { image: post.mediaUrl } : {}),
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: post.likesCount,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: post.commentsCount,
      },
    ],
    ...(comments.length
      ? {
          comment: comments
            .filter((c) => !c.parentId)
            .slice(0, 20)
            .map((c) => ({
              "@type": "Comment",
              text: c.content,
              dateCreated: c.createdAt,
              author: { "@type": "Person", name: c.author.name },
            })),
        }
      : {}),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Comunidade", item: absoluteUrl("/comunidade") },
      { "@type": "ListItem", position: 2, name: community.name, item: communityUrl },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <Header />
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumb} />

      <div className="container mx-auto max-w-3xl px-4 py-8">
        <nav aria-label="Navegação estrutural" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link href="/comunidade" className="hover:text-foreground">
            Comunidade
          </Link>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          <Link href={communityPath(community.slug)} className="hover:text-foreground">
            c/{community.slug}
          </Link>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          <span className="truncate text-foreground">{post.title}</span>
        </nav>

        <article>
          <header className="mb-6">
            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">{post.title}</h1>
            <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
              <Avatar className="h-9 w-9">
                <AvatarImage src={post.author.avatarUrl ?? undefined} alt={post.author.name} />
                <AvatarFallback>{post.author.name?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{post.author.name}</span>
                <span>
                  em{" "}
                  <Link href={communityPath(community.slug)} className="font-medium hover:underline">
                    c/{community.slug}
                  </Link>{" "}
                  · <time dateTime={post.createdAt}>{publishedLabel}</time>
                </span>
              </div>
            </div>
          </header>

          {hasImage(post) && (
            <figure className="mb-6 flex justify-center overflow-hidden rounded-lg bg-muted">
              <Image
                src={post.mediaUrl}
                alt={post.title}
                width={0}
                height={0}
                sizes="(max-width: 768px) 100vw, 768px"
                className="h-auto w-full object-contain"
                style={{ maxHeight: "32rem" }}
                priority
              />
            </figure>
          )}

          <MarkdownContent content={post.content} />

          <div className="mt-6 border-t border-border pt-4">
            <PostActions
              postId={post.id}
              initialLikes={post.likesCount}
              commentsCount={post.commentsCount}
              title={post.title}
              path={path}
            />
          </div>
        </article>

        <section id="comentarios" className="mt-10 scroll-mt-24">
          <PostComments
            postId={post.id}
            communitySlug={community.slug}
            postSlug={post.slug}
            initialComments={comments}
          />
        </section>
      </div>
    </div>
  );
}
