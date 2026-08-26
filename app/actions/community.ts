"use server";

import { revalidatePath } from "next/cache";

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]{0,254}$/;

/**
 * As páginas públicas da comunidade são ISR (revalidate = 300 s). Depois de
 * criar um post ou comentário, o cliente chama esta action para o autor ver o
 * conteúdo na hora, sem esperar a janela de revalidação.
 */
export async function revalidateCommunityPaths(communitySlug: string, postSlug?: string | null): Promise<void> {
  if (!SAFE_SLUG.test(communitySlug)) return;
  revalidatePath("/comunidade");
  revalidatePath(`/c/${communitySlug}`);
  if (postSlug && SAFE_SLUG.test(postSlug)) {
    revalidatePath(`/c/${communitySlug}/${postSlug}`);
  }
}
