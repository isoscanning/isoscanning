// Tipos públicos da comunidade compartilhados entre o servidor (lib/server/community-public.ts)
// e os client components. Datas sempre como string ISO (serializáveis via RSC).

export type MediaType = "image" | "video" | "none";

export interface PublicAuthor {
  name: string;
  avatarUrl?: string | null;
}

export interface PublicCommunity {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  ownerId: string;
  ownerName: string;
  rules: string[];
  createdAt: string;
  updatedAt: string;
  _count: { members: number; posts: number };
}

export interface PublicPost {
  id: string;
  communityId: string;
  slug: string | null;
  title: string;
  content: string;
  excerpt: string | null;
  mediaUrl?: string | null;
  mediaType?: MediaType | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  author: PublicAuthor;
  /** Presente apenas quando o post é carregado por id (rota legada). */
  community?: { slug: string; name: string } | null;
}

export interface PublicComment {
  id: string;
  postId: string;
  parentId?: string | null;
  authorId: string;
  content: string;
  createdAt: string;
  likesCount: number;
  hasLiked: boolean;
  author: PublicAuthor;
}
