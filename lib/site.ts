// Identidade pública do site — usada em metadata, canonical, sitemap, robots e JSON-LD.
// Defina NEXT_PUBLIC_SITE_URL no ambiente (sem barra final) com o domínio que responde
// 200 — em produção (Render) é o www: isoscanning.com faz 301 para www.isoscanning.com.
// Se o canonical apontar para o domínio que redireciona, o Google reporta
// "página com redirecionamento" e não indexa.

export const SITE_NAME = "IsoScanning";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.isoscanning.com").replace(/\/+$/, "");

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
