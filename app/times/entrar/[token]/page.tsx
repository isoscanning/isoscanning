"use client";

// Entrada em um time pelo link de convite (/times/entrar/<token>) — fluxo de
// "link de grupo do WhatsApp":
//   - a prévia (nome do time, gestor, quantos membros) é pública;
//   - com sessão: um clique em "Entrar no time";
//   - sem conta: "Criar conta e entrar" leva ao cadastro já sabendo do convite;
//     ao ganhar sessão (e-mail, Google ou login) o PendingTeamInviteHandler
//     conclui a entrada e leva a pessoa para o time.
// Uma pessoa pode estar em quantos times quiser.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, LogIn, Loader2, AlertTriangle, CheckCircle2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";
import { teamsService, teamsApiError } from "@/lib/teams-service";
import { clearPendingTeamInvite, rememberPendingTeamInvite } from "@/lib/teams-invite";
import { initials, type TeamInvitePreview } from "@/lib/teams-types";

export default function JoinTeamPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { userProfile, loading: authLoading } = useAuth();

  const [preview, setPreview] = useState<TeamInvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  // Prévia pública — não depende de sessão
  useEffect(() => {
    teamsService
      .previewInvite(token)
      .then(setPreview)
      .catch((err) => setError(teamsApiError(err, "Este link de convite não é mais válido")));
  }, [token]);

  async function join() {
    setJoining(true);
    try {
      const result = await teamsService.joinByToken(token);
      clearPendingTeamInvite();
      toast.success(result.status === "already_member" ? "Você já faz parte deste time" : `Você entrou no time ${preview?.team.name ?? ""}!`);
      router.push(`/dashboard/times/${result.team_id}`);
    } catch (err) {
      if (!isPlanErrorBody((err as { response?: { data?: unknown } })?.response?.data)) toast.error(teamsApiError(err, "Não foi possível entrar no time"));
      setJoining(false);
    }
  }

  function goSignup() {
    rememberPendingTeamInvite(token);
    router.push(`/cadastro?time=${encodeURIComponent(token)}`);
  }

  function goLogin() {
    rememberPendingTeamInvite(token);
    router.push("/login");
  }

  const teamName = preview?.team.name ?? "";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="py-10 text-center space-y-5">
          {error ? (
            <>
              <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <div>
                <p className="font-medium">{error}</p>
                <p className="text-sm text-muted-foreground mt-1">Peça um novo link a quem gerencia o time.</p>
              </div>
              <Button asChild variant="outline"><Link href={userProfile ? "/dashboard/times" : "/"}>{userProfile ? "Meus times" : "Ir para a IsoScanning"}</Link></Button>
            </>
          ) : !preview || authLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-16 mx-auto rounded-2xl" />
              <Skeleton className="h-6 w-2/3 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
              <Skeleton className="h-11 w-full" />
            </div>
          ) : (
            <>
              <div className="h-16 w-16 mx-auto rounded-2xl flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: preview.team.color }}>
                {initials(teamName)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Você foi convidado para o time</p>
                <p className="font-bold text-2xl">{teamName}</p>
                {preview.team.description && <p className="text-sm text-muted-foreground mt-2">{preview.team.description}</p>}
                <p className="text-xs text-muted-foreground mt-3">
                  Gestor: {preview.owner?.display_name ?? "—"} · {preview.members_count} {preview.members_count === 1 ? "membro" : "membros"}
                </p>
              </div>
              <ul className="text-left text-sm text-muted-foreground space-y-1 mx-auto max-w-xs">
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Veja os jobs publicados só para o time</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Seja convocado e confirme sua escalação</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Chat e avisos do time em um só lugar</li>
              </ul>

              {userProfile ? (
                <Button size="lg" className="w-full" onClick={join} disabled={joining}>
                  {joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                  Entrar no time
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button size="lg" className="w-full" onClick={goSignup}>
                    <UserPlus className="mr-2 h-4 w-4" /> Criar conta e entrar no time
                  </Button>
                  <Button size="lg" variant="outline" className="w-full" onClick={goLogin}>
                    <LogIn className="mr-2 h-4 w-4" /> Já tenho conta
                  </Button>
                  <p className="text-xs text-muted-foreground">Leva menos de um minuto. Você entra no time assim que a conta estiver pronta.</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
