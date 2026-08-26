// Identidade pública do site — usada em metadata, canonical, sitemap, robots e JSON-LD.
// Defina NEXT_PUBLIC_SITE_URL no ambiente (sem barra final). Fallback: domínio de produção.

export const SITE_NAME = "IsoScanning";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://isoscanning.com").replace(/\/+$/, "");

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
