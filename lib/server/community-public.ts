// Leitura PÚBLICA da comunidade direto do Supabase (anon key), para uso em
// Server Components / sitemap. As tabelas communities, posts, post_comments e
// post_comment_likes têm RLS de SELECT aberto (SQL 16/57), então a anon key
// basta. Ler daqui (e não da API no Render) evita o cold start do backend na
// renderização do servidor e deixa as páginas cacheáveis via ISR.
//
// Escritas (post, like, comentário) continuam passando pela API NestJS com o
// token do usuário — nada aqui grava.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  MediaType,
  PublicAuthor,
  PublicComment,
  PublicCommunity,
  PublicPost,
} from "@/lib/community-types";

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas.");
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

/** Slugs de rota: só [a-z0-9-]. Evita bater no banco com lixo vindo da URL. */
export function isValidSlug(value: string | undefined | null): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,254}$/.test(value);
}

// PostgREST devolve relações como objeto ou array conforme a cardinalidade.
function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function count(value: unknown): number {
  const row = one(value as { count?: number } | { count?: number }[] | null);
  return row?.count ?? 0;
}

/**
 * Só aceita URLs http(s) curtas para imagens renderizadas no servidor.
 *
 * Vários `profiles.avatar_url` em produção são imagens base64 (`data:image/...`)
 * de 1 a 4 MB. Cada avatar aparece várias vezes no HTML + payload RSC de uma
 * página (autor, comentários, cards), e o render acumulava >100 MB de strings —
 * o processo estourava os 512 MB do Render (502 em cascata). Descartar aqui faz
 * o Avatar cair no fallback de iniciais; a UI logada (API) continua igual.
 */
const MAX_IMAGE_URL_LENGTH = 2048;
function safeImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url || url.length > MAX_IMAGE_URL_LENGTH) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

function author(profile: unknown): PublicAuthor {
  const p = one(profile as { display_name?: string; avatar_url?: string | null } | null);
  return { name: p?.display_name || "Usuário", avatarUrl: safeImageUrl(p?.avatar_url) };
}

const COMMUNITY_SELECT = `
  id, name, slug, description, avatar_url, banner_url, owner_id, rules, created_at, updated_at,
  owner:profiles!owner_id(display_name),
  members:community_members(count),
  posts(count)
`;

const POST_SELECT = `
  id, community_id, slug, title, content, excerpt, media_url, media_type,
  likes_count, comments_count, created_at, updated_at,
  profile:profiles!author_id(display_name, avatar_url)
`;

const COMMENT_SELECT = `
  id, post_id, parent_id, author_id, content, created_at,
  profile:profiles!author_id(display_name, avatar_url),
  likes:post_comment_likes(count)
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCommunity(row: any): PublicCommunity {
  const owner = one(row.owner as { display_name?: string } | null);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    avatarUrl: safeImageUrl(row.avatar_url),
    bannerUrl: safeImageUrl(row.banner_url),
    ownerId: row.owner_id,
    ownerName: owner?.display_name || "Iso Scanning",
    rules: Array.isArray(row.rules) ? row.rules : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    _count: { members: count(row.members), posts: count(row.posts) },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPost(row: any): PublicPost {
  const community = one(row.community as { slug: string; name: string } | null);
  return {
    id: row.id,
    communityId: row.community_id,
    slug: row.slug ?? null,
    title: row.title,
    content: row.content ?? "",
    excerpt: row.excerpt ?? null,
    mediaUrl: safeImageUrl(row.media_url),
    mediaType: (row.media_type as MediaType | null) ?? null,
    likesCount: row.likes_count ?? 0,
    commentsCount: row.comments_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: author(row.profile),
    community: community ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapComment(row: any): PublicComment {
  return {
    id: row.id,
    postId: row.post_id,
    parentId: row.parent_id ?? null,
    authorId: row.author_id,
    content: row.content,
    createdAt: row.created_at,
    likesCount: count(row.likes),
    hasLiked: false,
    author: author(row.profile),
  };
}

export async function listCommunities(): Promise<PublicCommunity[]> {
  const { data, error } = await getClient()
    .from("communities")
    .select(COMMUNITY_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`communities: ${error.message}`);
  return (data ?? []).map(mapCommunity);
}

export async function getCommunityBySlug(slug: string): Promise<PublicCommunity | null> {
  const { data, error } = await getClient()
    .from("communities")
    .select(COMMUNITY_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`community ${slug}: ${error.message}`);
  return data ? mapCommunity(data) : null;
}

export async function listCommunityPosts(communityId: string): Promise<PublicPost[]> {
  const { data, error } = await getClient()
    .from("posts")
    .select(POST_SELECT)
    .eq("community_id", communityId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`posts of ${communityId}: ${error.message}`);
  return (data ?? []).map(mapPost);
}

export async function getPostBySlug(communityId: string, postSlug: string): Promise<PublicPost | null> {
  const { data, error } = await getClient()
    .from("posts")
    .select(POST_SELECT)
    .eq("community_id", communityId)
    .eq("slug", postSlug)
    .maybeSingle();
  if (error) throw new Error(`post ${postSlug}: ${error.message}`);
  return data ? mapPost(data) : null;
}

/** Usado pela rota legada /c/[slug]/comments/[postId] para redirecionar à URL canônica. */
export async function getPostById(id: string): Promise<PublicPost | null> {
  const { data, error } = await getClient()
    .from("posts")
    .select(`${POST_SELECT}, community:communities!community_id(slug, name)`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`post ${id}: ${error.message}`);
  return data ? mapPost(data) : null;
}

export async function listPostComments(postId: string): Promise<PublicComment[]> {
  const { data, error } = await getClient()
    .from("post_comments")
    .select(COMMENT_SELECT)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`comments of ${postId}: ${error.message}`);
  return (data ?? []).map(mapComment);
}

export interface SitemapEntries {
  communities: { slug: string; updatedAt: string }[];
  posts: { communitySlug: string; slug: string; updatedAt: string }[];
}

export async function listSitemapEntries(): Promise<SitemapEntries> {
  const supabase = getClient();
  const [communitiesRes, postsRes] = await Promise.all([
    supabase.from("communities").select("slug, updated_at").order("created_at", { ascending: true }),
    supabase
      .from("posts")
      .select("slug, updated_at, community:communities!community_id(slug)")
      .order("created_at", { ascending: false }),
  ]);
  if (communitiesRes.error) throw new Error(`sitemap communities: ${communitiesRes.error.message}`);
  if (postsRes.error) throw new Error(`sitemap posts: ${postsRes.error.message}`);

  const communities = (communitiesRes.data ?? [])
    .filter((c) => isValidSlug(c.slug))
    .map((c) => ({ slug: c.slug as string, updatedAt: c.updated_at as string }));

  const posts = (postsRes.data ?? [])
    .map((p) => {
      const community = one(p.community as { slug: string } | { slug: string }[] | null);
      return { communitySlug: community?.slug, slug: p.slug as string | null, updatedAt: p.updated_at as string };
    })
    .filter((p): p is { communitySlug: string; slug: string; updatedAt: string } =>
      isValidSlug(p.communitySlug) && isValidSlug(p.slug),
    );

  return { communities, posts };
}
