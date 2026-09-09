// Convite de time pendente — fluxo "link de grupo do WhatsApp".
//
// Quem abre /times/entrar/<token> sem conta guarda o token aqui, cria a conta
// (ou entra) e o PendingTeamInviteHandler (montado no layout raiz) conclui a
// entrada no time assim que houver sessão, em qualquer página que a pessoa
// caia (dashboard, onboarding, callback do Google...).

const PENDING_KEY = "pendingTeamInvite";

export function rememberPendingTeamInvite(token: string): void {
  try {
    localStorage.setItem(PENDING_KEY, token);
  } catch {
    /* storage indisponível */
  }
}

export function readPendingTeamInvite(): string | null {
  try {
    return localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

export function clearPendingTeamInvite(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage indisponível */
  }
}

/** Lê e apaga o destino pós-login guardado pelo fluxo de auth. */
export function takeRedirectAfterLogin(fallback: string): string {
  try {
    const url = localStorage.getItem("redirectAfterLogin");
    localStorage.removeItem("redirectAfterLogin");
    return url && url.startsWith("/") ? url : fallback;
  } catch {
    return fallback;
  }
}

/** Texto pronto para o gestor mandar no WhatsApp. */
export function buildInviteShareText(teamName: string, url: string): string {
  return `Você foi convidado para o time "${teamName}" na IsoScanning. Abra o link para entrar — se ainda não tiver conta, cria na hora: ${url}`;
}
