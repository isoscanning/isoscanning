import { supabase } from "./supabase";

/**
 * Remoção de arquivos do Supabase Storage a partir das URLs públicas.
 *
 * Motivo: o upload acontece no navegador ANTES do POST/PUT que grava o
 * registro. Quando a gravação falha (403 de limite de plano, validação, RLS)
 * os arquivos ficam no bucket para sempre — em 2026-08-28 havia 70 arquivos
 * órfãos (181 MB) em produção justamente por isso. Todo caminho de erro que
 * já subiu arquivo deve chamar `removeStorageFiles` no `catch`.
 *
 * Nunca lança: limpeza é best-effort e não pode mascarar o erro original.
 */

/**
 * Extrai o path interno do bucket a partir de uma URL pública do Storage.
 * `https://<proj>.supabase.co/storage/v1/object/public/portfolio/<uid>/a.jpg`
 * → `<uid>/a.jpg`. Devolve null para URLs de outro host/bucket.
 */
export function storagePathFromPublicUrl(bucket: string, url: string): string | null {
  if (typeof url !== "string" || !url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const path = url.slice(index + marker.length).split("?")[0];
  if (!path) return null;
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * Apaga do bucket os arquivos referenciados pelas URLs públicas informadas.
 * URLs que não pertencem ao bucket são ignoradas silenciosamente.
 *
 * @returns quantidade de arquivos efetivamente solicitados para remoção
 */
export async function removeStorageFiles(bucket: string, urls: (string | null | undefined)[]): Promise<number> {
  const paths = urls
    .map((url) => (url ? storagePathFromPublicUrl(bucket, url) : null))
    .filter((path): path is string => !!path);

  if (paths.length === 0) return 0;

  try {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) {
      console.warn(`[storage-cleanup] Falha ao remover ${paths.length} arquivo(s) de "${bucket}":`, error.message);
      return 0;
    }
    return paths.length;
  } catch (error) {
    console.warn(`[storage-cleanup] Erro inesperado ao limpar "${bucket}":`, error);
    return 0;
  }
}

/**
 * Envolve uma operação que já subiu arquivos: se ela falhar, remove os
 * arquivos antes de repropagar o erro.
 *
 *   const item = await withStorageRollback("portfolio", uploadedUrls, () =>
 *     createPortfolioItem({ ...data, media })
 *   );
 */
export async function withStorageRollback<T>(
  bucket: string,
  uploadedUrls: (string | null | undefined)[],
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    await removeStorageFiles(bucket, uploadedUrls);
    throw error;
  }
}
