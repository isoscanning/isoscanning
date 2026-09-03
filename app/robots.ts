import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL } from "@/lib/site";

// Servido em /robots.txt. Bloqueia áreas logadas/privadas e formulários;
// conteúdo público (home, comunidade, posts, profissionais, equipamentos,
// vagas) fica liberado. As rotas legadas /c/*/comments/* NÃO são bloqueadas
// de propósito: o Google precisa seguir o 301 para a URL nova.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard/",
          "/onboarding",
          "/social-media/",
          "/briefing/",
          "/matching/",
          "/negociar-equipamento/",
          "/agendar/",
          "/assinar",
          "/contratos/verificar",
          "/login",
          "/cadastro",
          "/recuperar-senha",
          "/gerador-particulas",
          "/comunidade/criar",
          "/c/*/novo",
          "/c/*/editar",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
