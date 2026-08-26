import { notFound, permanentRedirect, redirect } from "next/navigation";
import { getPostById, isValidSlug } from "@/lib/server/community-public";
import { communityPath, postPath } from "@/lib/community-paths";

// Rota LEGADA (/c/<comunidade>/comments/<uuid>). Responde 301 para a URL
// canônica /c/<comunidade>/<slug>, preservando links antigos e sinais de SEO.
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { params: Promise<{ slug: string; postId: string }> };

export default async function LegacyPostRedirect({ params }: Props) {
  const { slug, postId } = await params;
  if (!UUID.test(postId)) notFound();

  const post = await getPostById(postId);
  if (!post) notFound();

  const communitySlug = post.community?.slug || (isValidSlug(slug) ? slug : null);
  if (!communitySlug) notFound();

  // Sem slug (migration 60 ainda não aplicada): manda para a comunidade, sem 301.
  if (!post.slug) redirect(communityPath(communitySlug));

  permanentRedirect(postPath(communitySlug, post));
}
