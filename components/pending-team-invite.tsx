"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { teamsService, teamsApiError } from "@/lib/teams-service";
import { clearPendingTeamInvite, readPendingTeamInvite } from "@/lib/teams-invite";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";

/**
 * Conclui a entrada num time quando há um convite pendente e a pessoa acaba
 * de ganhar sessão (cadastro por e-mail, Google ou login). Montado uma vez no
 * layout raiz. Não renderiza nada.
 *
 * Durante o onboarding (telefone) só entra no time e guarda o destino; o
 * onboarding leva para o time ao terminar.
 */
export function PendingTeamInviteHandler() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const running = useRef(false);

  useEffect(() => {
    if (!userProfile || running.current) return;
    const token = readPendingTeamInvite();
    if (!token) return;
    // A própria página do convite cuida do botão "Entrar no time"
    if (pathname?.startsWith("/times/entrar/")) return;

    running.current = true;
    teamsService
      .joinByToken(token)
      .then((result) => {
        clearPendingTeamInvite();
        const target = `/dashboard/times/${result.team_id}`;
        toast.success(result.status === "already_member" ? "Você já faz parte deste time" : "Você entrou no time!");
        if (pathname?.startsWith("/onboarding")) {
          try {
            localStorage.setItem("redirectAfterLogin", target);
          } catch {
            /* storage indisponível */
          }
        } else {
          router.push(target);
        }
      })
      .catch((err) => {
        clearPendingTeamInvite();
        if (!isPlanErrorBody((err as { response?: { data?: unknown } })?.response?.data)) {
          toast.error(teamsApiError(err, "Não foi possível entrar no time pelo link"));
        }
      })
      .finally(() => {
        running.current = false;
      });
  }, [userProfile, pathname, router]);

  return null;
}
