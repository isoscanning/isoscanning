"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import {
  ArrowLeft, Bell, Briefcase, CheckCircle2, ExternalLink, EyeOff, Loader2, MousePointerClick, Play, Sparkles, Wand2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { isPlatformAdmin } from "@/lib/admin-config";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { jobTypeLabel } from "@/lib/jobs/job-offer-display";
import {
  createManualExternalJob,
  extractExternalJobDraft,
  fetchExternalJobsAdmin,
  runExternalJobsImportNow,
  sendExternalJobsDigestNow,
  updateExternalJob,
} from "@/lib/external-jobs/client";
import {
  externalJobLocation,
  externalJobPath,
  type ExternalJobAdmin,
  type ExternalJobDraft,
  type ExternalJobStatus,
} from "@/lib/external-jobs/types";

// Painel do admin das vagas externas (SQL 83): revisão do que a IA deixou em
// dúvida, publicadas/ocultas, cadastro manual (texto colado de grupo de
// WhatsApp etc. lido pela IA), execuções da rotina e aviso aos profissionais.

const TABS: { value: ExternalJobStatus; label: string }[] = [
  { value: "pending", label: "Para revisar" },
  { value: "published", label: "Publicadas" },
  { value: "hidden", label: "Ocultas" },
  { value: "expired", label: "Expiradas" },
  { value: "new", label: "Na fila da IA" },
];

const JOB_TYPES = ["freelance", "full_time", "part_time", "project"] as const;
const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
const NONE = "__none__";

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function scoreClass(score: number | null): string {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 70) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  if (score >= 45) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
}

export default function AdminVagasExternasPage() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const { toast } = useToast();
  const isAdmin = isPlatformAdmin(userProfile?.email);
  const [tab, setTab] = useState<ExternalJobStatus>("pending");
  const [running, setRunning] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!userProfile || !isAdmin)) router.replace("/dashboard");
  }, [loading, userProfile, isAdmin, router]);

  const { data, error, mutate, isLoading } = useSWR(
    isAdmin ? ["admin-external-jobs", tab] : null,
    () => fetchExternalJobsAdmin(tab)
  );

  if (loading || !userProfile || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-5xl space-y-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-64 rounded-2xl" />
        </main>
      </div>
    );
  }

  const runNow = async () => {
    setRunning(true);
    try {
      const r = await runExternalJobsImportNow();
      toast({
        title: "Rotina concluída",
        description: `${r.fetched} encontradas · ${r.inserted} novas · ${r.published} publicadas · ${r.pending} para revisar${
          r.errors.length ? ` · ${r.errors.length} erro(s)` : ""
        }`,
      });
      await mutate();
    } catch (err) {
      toast({ title: "Falha na rotina", description: (err as Error).message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const notifyNow = async () => {
    if (!confirm("Enviar agora o aviso de vagas novas para todos os profissionais?")) return;
    setNotifying(true);
    try {
      const r = await sendExternalJobsDigestNow();
      toast({
        title: r.notified > 0 ? "Aviso enviado" : "Nada para avisar",
        description: r.notified > 0 ? `${r.offers} vagas · ${r.notified} profissionais avisados` : r.skipped,
      });
      await mutate();
    } catch (err) {
      toast({ title: "Falha ao avisar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setNotifying(false);
    }
  };

  const patch = async (job: ExternalJobAdmin, changes: Parameters<typeof updateExternalJob>[1]) => {
    setBusyId(job.id);
    try {
      await updateExternalJob(job.id, changes);
      await mutate();
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/dashboard/admin"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Painel Admin
            </Link>
            <div className="flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Vagas do mercado</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Vagas de outras plataformas (APIs oficiais) e indicações cadastradas à mão. Só divulgação: a candidatura é no site de origem.
            </p>
            {data && (
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant={data.sources.jooble ? "default" : "outline"}>Jooble {data.sources.jooble ? "ligada" : "sem chave"}</Badge>
                <Badge variant={data.sources.adzuna ? "default" : "outline"}>Adzuna {data.sources.adzuna ? "ligada" : "sem chave"}</Badge>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={notifyNow} disabled={notifying}>
              {notifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
              Avisar profissionais
            </Button>
            <Button onClick={runNow} disabled={running}>
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              {running ? "Rodando (até 5 min)…" : "Rodar agora"}
            </Button>
          </div>
        </div>

        <ManualImportCard categories={data?.categories ?? []} onCreated={() => mutate()} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Vagas</CardTitle>
            <CardDescription>A IA publica sozinha as de nota alta; as de nota média esperam sua revisão aqui.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as ExternalJobStatus)}>
              <TabsList className="flex h-auto flex-wrap justify-start">
                {TABS.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>
                    {t.label}
                    {data?.totals && <span className="ml-1.5 text-xs text-muted-foreground">{data.totals[t.value] ?? 0}</span>}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {error ? (
              <p className="text-sm text-destructive">{(error as Error).message}</p>
            ) : isLoading || !data ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
            ) : data.jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma vaga aqui.</p>
            ) : (
              <div className="space-y-3">
                {data.jobs.map((job) => (
                  <div key={job.id} className="rounded-xl border p-4 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold break-words">{job.title}</p>
                        <p className="text-xs text-muted-foreground">
                          via {job.sourceLabel}
                          {job.companyName ? ` · ${job.companyName}` : ""} · {externalJobLocation(job)}
                          {job.jobType ? ` · ${jobTypeLabel(job.jobType)}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${scoreClass(job.relevanceScore)}`}>
                          IA {job.relevanceScore ?? "—"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MousePointerClick className="h-3.5 w-3.5" /> {job.clickCount}
                        </span>
                      </div>
                    </div>
                    {job.aiReason && <p className="text-xs text-muted-foreground italic">“{job.aiReason}”</p>}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Select
                        value={job.category ?? NONE}
                        onValueChange={(v) => patch(job, { category: v === NONE ? null : v })}
                        disabled={busyId === job.id}
                      >
                        <SelectTrigger className="h-8 w-full sm:w-56 text-xs">
                          <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Sem categoria</SelectItem>
                          {data.categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap gap-2">
                        {job.externalUrl && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={job.externalUrl} target="_blank" rel="noopener noreferrer nofollow">
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Original
                            </a>
                          </Button>
                        )}
                        {job.status === "published" && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={externalJobPath(job.id)} target="_blank">Ver no site</Link>
                          </Button>
                        )}
                        {job.status !== "published" && (
                          <Button size="sm" onClick={() => patch(job, { status: "published" })} disabled={busyId === job.id}>
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Publicar
                          </Button>
                        )}
                        {job.status !== "hidden" && (
                          <Button size="sm" variant="outline" onClick={() => patch(job, { status: "hidden" })} disabled={busyId === job.id}>
                            <EyeOff className="mr-1.5 h-3.5 w-3.5" /> Ocultar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Execuções da rotina</CardTitle>
            <CardDescription>
              O cron roda a cada 3 h: busca nas APIs 1x por dia e, nas outras rodadas, termina a classificação e expira as antigas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!data?.runs.length ? (
              <p className="text-sm text-muted-foreground">Nenhuma execução ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr className="text-left">
                      <th className="py-2 pr-3 font-medium">Início</th>
                      <th className="py-2 pr-3 font-medium">Origem</th>
                      <th className="py-2 pr-3 font-medium text-right">Achadas</th>
                      <th className="py-2 pr-3 font-medium text-right">Novas</th>
                      <th className="py-2 pr-3 font-medium text-right">Publicadas</th>
                      <th className="py-2 pr-3 font-medium text-right">Revisar</th>
                      <th className="py-2 pr-3 font-medium text-right">Descartadas</th>
                      <th className="py-2 pr-3 font-medium text-right">Avisados</th>
                      <th className="py-2 font-medium">Erros</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.runs.map((run) => (
                      <tr key={run.id} className="border-t align-top">
                        <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(run.startedAt)}</td>
                        <td className="py-2 pr-3">{run.trigger === "cron" ? "Cron" : "Admin"}</td>
                        <td className="py-2 pr-3 text-right">{run.fetched}</td>
                        <td className="py-2 pr-3 text-right">{run.inserted}</td>
                        <td className="py-2 pr-3 text-right">{run.published}</td>
                        <td className="py-2 pr-3 text-right">{run.pending}</td>
                        <td className="py-2 pr-3 text-right">{run.discarded}</td>
                        <td className="py-2 pr-3 text-right">{run.notified}</td>
                        <td className="py-2 text-destructive max-w-xs">
                          {run.errors.length > 0 ? (
                            <details>
                              <summary className="cursor-pointer">{run.errors.length}</summary>
                              <ul className="mt-1 space-y-1 break-words">
                                {run.errors.map((e, i) => <li key={i}>{e}</li>)}
                              </ul>
                            </details>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// ─── Cadastro manual (texto colado → IA → conferência → publicar) ───────────

const EMPTY_DRAFT: ExternalJobDraft = {
  title: "", companyName: null, description: null, city: null, state: null, isRemote: false,
  jobType: null, category: null, salaryText: null, externalUrl: null, applyContact: null,
};

function ManualImportCard({ categories, onCreated }: { categories: string[]; onCreated: () => void }) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<ExternalJobDraft | null>(null);
  const [sourceLabel, setSourceLabel] = useState("Indicação");
  const [days, setDays] = useState(21);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ExternalJobDraft>(key: K, value: ExternalJobDraft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const read = async () => {
    setReading(true);
    try {
      const { draft: d } = await extractExternalJobDraft(text);
      setDraft(d);
    } catch (err) {
      toast({ title: "A IA não conseguiu ler", description: (err as Error).message, variant: "destructive" });
    } finally {
      setReading(false);
    }
  };

  const publish = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await createManualExternalJob({ ...draft, sourceLabel, expiresInDays: days });
      toast({ title: "Vaga publicada", description: "Já aparece em /vagas, na seção Vagas do mercado." });
      setDraft(null);
      setText("");
      onCreated();
    } catch (err) {
      toast({ title: "Não foi possível publicar", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" /> Adicionar vaga manualmente
        </CardTitle>
        <CardDescription>
          Cole o texto da vaga (grupo de WhatsApp, post, e-mail). A IA preenche os campos e você confere antes de publicar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!draft ? (
          <>
            <Textarea
              rows={5}
              placeholder="Ex.: Procuro fotógrafo para casamento dia 14/11 em Campinas, cobertura de 6h, cachê R$ 1.200. Interessados chamar no (19) 9..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={read} disabled={reading || text.trim().length < 20}>
                {reading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Ler com IA
              </Button>
              <Button variant="ghost" onClick={() => setDraft({ ...EMPTY_DRAFT })}>Preencher à mão</Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Título</Label>
                <Input value={draft.title} onChange={(e) => set("title", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Quem contrata</Label>
                <Input value={draft.companyName ?? ""} onChange={(e) => set("companyName", e.target.value || null)} />
              </div>
              <div className="space-y-1.5">
                <Label>Origem (selo “via …”)</Label>
                <Input value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} placeholder="Ex.: Grupo Fotógrafos SP" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Descrição</Label>
                <Textarea rows={5} value={draft.description ?? ""} onChange={(e) => set("description", e.target.value || null)} />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input value={draft.city ?? ""} onChange={(e) => set("city", e.target.value || null)} />
              </div>
              <div className="space-y-1.5">
                <Label>UF</Label>
                <Select value={draft.state ?? NONE} onValueChange={(v) => set("state", v === NONE ? null : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {UFS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={draft.jobType ?? NONE} onValueChange={(v) => set("jobType", v === NONE ? null : (v as ExternalJobDraft["jobType"]))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Não informado</SelectItem>
                    {JOB_TYPES.map((t) => <SelectItem key={t} value={t}>{jobTypeLabel(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={draft.category ?? NONE} onValueChange={(v) => set("category", v === NONE ? null : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem categoria</SelectItem>
                    {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Remuneração</Label>
                <Input value={draft.salaryText ?? ""} onChange={(e) => set("salaryText", e.target.value || null)} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={draft.isRemote} onCheckedChange={(v) => set("isRemote", v)} id="remote" />
                <Label htmlFor="remote">Aceita remoto</Label>
              </div>
              <div className="space-y-1.5">
                <Label>Link para candidatura</Label>
                <Input value={draft.externalUrl ?? ""} onChange={(e) => set("externalUrl", e.target.value || null)} placeholder="https://…" />
              </div>
              <div className="space-y-1.5">
                <Label>Ou contato</Label>
                <Input value={draft.applyContact ?? ""} onChange={(e) => set("applyContact", e.target.value || null)} placeholder="WhatsApp, e-mail…" />
              </div>
              <div className="space-y-1.5">
                <Label>Fica no ar por (dias)</Label>
                <Input type="number" min={1} max={90} value={days} onChange={(e) => setDays(Number(e.target.value) || 21)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Só publique contato pessoal (telefone/e-mail) se o anunciante divulgou a vaga publicamente para receber candidatos.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={publish}
                disabled={saving || !draft.title.trim() || (!draft.externalUrl && !draft.applyContact)}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Publicar vaga
              </Button>
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancelar</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
