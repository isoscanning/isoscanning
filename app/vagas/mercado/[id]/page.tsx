"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowLeft, Briefcase, Building2, Clock, DollarSign, ExternalLink, Lock, MapPin, MessageCircle,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { trackEvent } from "@/lib/analytics";
import { rememberRedirectAfterLogin } from "@/lib/contracts/contract-utils";
import { jobTypeColor, jobTypeLabel, publishedAgo } from "@/lib/jobs/job-offer-display";
import { fetchExternalJob, trackExternalJobClick, type ExternalJobResponse } from "@/lib/external-jobs/client";
import { externalJobLocation, externalJobPath } from "@/lib/external-jobs/types";

// Detalhe de uma vaga EXTERNA (SQL 83). Sem candidatura no IsoScanning: a
// pessoa vê a vaga e é levada ao site de origem. Visitante sem conta vê só o
// básico e é convidado a se cadastrar para liberar o restante.

export default function ExternalJobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const [data, setData] = useState<ExternalJobResponse | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (authLoading || !id) return;
    let cancelled = false;
    fetchExternalJob(id)
      .then((res) => !cancelled && setData(res))
      .catch(() => !cancelled && setNotFound(true));
    return () => {
      cancelled = true;
    };
    // Recarrega ao logar: o mesmo endpoint passa a devolver a vaga completa
  }, [id, authLoading, userProfile?.id]);

  const goToSignup = (target: "/cadastro" | "/login") => {
    rememberRedirectAfterLogin(externalJobPath(id));
    trackEvent({ action: "click_cta", category: "ExternalJobs", label: target === "/cadastro" ? "Signup gate" : "Login gate" });
    router.push(target);
  };

  const job = data?.job;
  const when = job ? job.postedAt ?? job.publishedAt : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-10 md:py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <Link
            href="/vagas?origem=mercado"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para as vagas
          </Link>

          {notFound ? (
            <Card className="border-2">
              <CardContent className="p-10 text-center space-y-4">
                <Briefcase className="h-10 w-10 mx-auto text-muted-foreground" />
                <h1 className="text-xl font-semibold">Vaga não encontrada ou encerrada</h1>
                <p className="text-muted-foreground">Ela pode ter sido preenchida ou removida do site de origem.</p>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/vagas">Ver outras vagas</Link>
                </Button>
              </CardContent>
            </Card>
          ) : !data || !job ? (
            <Card className="border-2">
              <CardContent className="p-8 space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-9 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="border-2">
                <CardContent className="p-6 md:p-8 space-y-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full gap-1">
                      <ExternalLink className="h-3 w-3" />
                      Vaga externa · via {job.sourceLabel}
                    </Badge>
                    {job.category && <Badge variant="secondary" className="rounded-full">{job.category}</Badge>}
                    {job.jobType && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${jobTypeColor(job.jobType)}`}>
                        {jobTypeLabel(job.jobType)}
                      </span>
                    )}
                  </div>

                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground break-words">{job.title}</h1>
                    {!data.locked && data.job.companyName && (
                      <p className="mt-2 flex items-center gap-2 text-primary font-medium">
                        <Building2 className="h-4 w-4 shrink-0" />
                        {data.job.companyName}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>{externalJobLocation(job)}</span>
                    </div>
                    {when && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>Publicada {publishedAgo(when).toLowerCase()}</span>
                      </div>
                    )}
                    {!data.locked && data.job.salaryText && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 shrink-0" />
                        <span>{data.job.salaryText}</span>
                      </div>
                    )}
                  </div>

                  {data.locked ? (
                    <div className="rounded-xl border-2 border-dashed p-6 text-center space-y-4 bg-muted/30">
                      <Lock className="h-8 w-8 mx-auto text-primary" />
                      <div className="space-y-1">
                        <h2 className="text-lg font-semibold">Cadastre-se para ver a vaga completa</h2>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                          Crie sua conta grátis para ver a descrição, quem está contratando, a remuneração e o link para se candidatar.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button className="rounded-full" onClick={() => goToSignup("/cadastro")}>
                          Criar conta grátis
                        </Button>
                        <Button variant="outline" className="rounded-full" onClick={() => goToSignup("/login")}>
                          Já tenho conta
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {data.job.description && (
                        <div className="space-y-2">
                          <h2 className="font-semibold text-foreground">Sobre a vaga</h2>
                          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line break-words">
                            {data.job.description}
                          </p>
                          {data.job.source !== "manual" && (
                            <p className="text-xs text-muted-foreground/80">Trecho do anúncio. A descrição completa está no site de origem.</p>
                          )}
                        </div>
                      )}

                      <div className="space-y-3">
                        {data.job.externalUrl && (
                          <Button asChild size="lg" className="w-full rounded-full">
                            <a
                              href={data.job.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              onClick={() => {
                                trackExternalJobClick(data.job.id);
                                trackEvent({ action: "apply_to_job", category: "ExternalJobs", label: data.job.sourceLabel });
                              }}
                            >
                              Candidatar-se no site original
                              <ExternalLink className="ml-2 h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {data.job.applyContact && (
                          <div className="flex items-start gap-3 rounded-xl border p-4 text-sm">
                            <MessageCircle className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                            <div>
                              <p className="font-medium text-foreground">Como se candidatar</p>
                              <p className="text-muted-foreground break-words">{data.job.applyContact}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                <p>
                  Esta vaga foi publicada fora do IsoScanning ({job.sourceLabel}). Nós apenas divulgamos: a seleção, a
                  contratação e o pagamento são combinados direto com quem anunciou. Desconfie de qualquer pedido de
                  pagamento para participar de um processo seletivo.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
