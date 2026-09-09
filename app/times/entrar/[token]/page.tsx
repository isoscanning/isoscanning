"use client";

// Entrada em um time pelo link de convite (/times/entrar/<token>).
// Exige login: sem sessão, guarda o destino e manda para /login.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, LogIn, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { isPlanErrorBody } from "@/lib/plans/plan-limits";
import { teamsService, teamsApiError } from "@/lib/teams-service";
import { initials, type TeamInvitePreview } from "@/lib/teams-types";

export default function JoinTeamPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { userProfile, loading: authLoading } = useAuth();

  const [preview, setPreview] = useState<TeamInvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!userProfile) {
      try {
        localStorage.setItem("redirectAfterLogin", `/times/entrar/${token}`);
      } catch {
        /* storage indisponível */
      }
      return;
    }
    teamsService
      .previewInvite(token)
      .then(setPreview)
      .catch((err) => setError(teamsApiError(err, "Este link de convite não é mais válido")));
  }, [authLoading, userProfile, token]);

  async function join() {
    setJoining(true);
    try {
      const result = await teamsService.joinByToken(token);
      toast.success(result.status === "already_member" ? "Você já faz parte deste time" : `Você entrou no time ${preview?.team.name ?? ""}!`);
      router.push(`/dashboard/times/${result.team_id}`);
    } catch (err) {
      if (!isPlanErrorBody((err as { response?: { data?: unknown } })?.response?.data)) toast.error(teamsApiError(err, "Não foi possível entrar no time"));
      setJoining(false);
    }
  }

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
              <Button asChild variant="outline"><Link href="/dashboard/times">Meus times</Link></Button>
            </>
          ) : !userProfile ? (
            authLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div className="h-14 w-14 mx-auto rounded-2xl bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 flex items-center justify-center">
                  <Users className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Convite para um time</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Entre na sua conta (ou crie uma) para ver o convite e participar do time.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button asChild><Link href="/login"><LogIn className="mr-2 h-4 w-4" /> Entrar</Link></Button>
                  <Button asChild variant="outline"><Link href="/cadastro">Criar conta</Link></Button>
                </div>
              </>
            )
          ) : !preview ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <div className="h-16 w-16 mx-auto rounded-2xl flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: preview.team.color }}>
                {initials(preview.team.name)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Você foi convidado para o time</p>
                <p className="font-bold text-2xl">{preview.team.name}</p>
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
              <Button size="lg" className="w-full" onClick={join} disabled={joining}>
                {joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                Entrar no time
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
