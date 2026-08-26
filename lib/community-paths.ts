// Caminhos das rotas públicas da comunidade. Sem dependências de servidor —
// pode ser importado tanto em Server Components quanto em client components.

export function communityPath(communitySlug: string): string {
  return `/c/${communitySlug}`;
}

/**
 * URL canônica de um post: /c/<comunidade>/<slug>.
 * Fallback para a rota antiga por UUID enquanto o post não tiver slug
 * (a rota antiga responde com redirect 301 para a nova).
 */
export function postPath(communitySlug: string, post: { slug?: string | null; id: string }): string {
  return post.slug ? `/c/${communitySlug}/${post.slug}` : `/c/${communitySlug}/comments/${post.id}`;
}
