// Controle de acesso do painel administrativo da plataforma.
// A checagem no frontend é apenas UX (esconder menu/rota); a proteção
// real dos dados é feita no backend pelo AdminGuard (GET /api/admin/metrics),
// que valida o JWT e compara o e-mail com ADMIN_EMAIL no servidor.
export const PLATFORM_ADMIN_EMAIL = "andersonfranco19@gmail.com";

export function isPlatformAdmin(email?: string | null): boolean {
  return (
    !!email && email.toLowerCase().trim() === PLATFORM_ADMIN_EMAIL
  );
}
