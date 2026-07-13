"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { tokenManager } from "@/lib/token-manager";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Sparkles, Loader2, Printer, BarChart3, TrendingUp, TrendingDown,
  Heart, MessageCircle, Share2, Bookmark, Eye, Trophy, Lightbulb, CalendarDays, Check, Instagram, Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  SocialMediaSchedule, SocialMediaPost, MonthlyReportStats, MonthlyReportAI,
  MONTHS_PT, POST_TYPE_CONFIG, PostType, InstagramConnection, AudienceDemographics, AudienceSlice,
  isPremiumSmTier,
} from "@/lib/social-media-types";
import { PremiumGate } from "@/components/social-media/premium-gate";

const pad = (n: number) => String(n).padStart(2, "0");

const GENDER_LABELS: Record<string, string> = { F: "Feminino", M: "Masculino", U: "Não informado" };

// Gráfico de barras horizontais simples (theme-aware e imprimível)
function AudienceBars({ title, slices, barClass, labelMap }: {
  title: string;
  slices: AudienceSlice[];
  barClass: string;
  labelMap?: Record<string, string>;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) {
    return (
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">{title}</p>
        <p className="text-xs text-muted-foreground italic">Sem dados</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-2">{title}</p>
      <div className="space-y-1.5">
        {slices.slice(0, 8).map((s) => {
          const pct = (s.value / total) * 100;
          return (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-xs w-24 truncate shrink-0" title={s.label}>
                {labelMap?.[s.label] ?? s.label}
              </span>
              <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.max(2, pct)}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-12 text-right">{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MonthlyReportPage() {
  // useSearchParams exige Suspense boundary no build do Next
  return (
    <Suspense fallback={null}>
      <MonthlyReportInner />
    </Suspense>
  );
}

function MonthlyReportInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { userProfile, loading } = useAuth();
  const scheduleId = params.scheduleId as string;

  const now = new Date();
  const [month, setMonth] = useState(() => Number(searchParams.get("month")) || now.getMonth() + 1);
  const [year, setYear] = useState(() => Number(searchParams.get("year")) || now.getFullYear());

  const [schedule, setSchedule] = useState<SocialMediaSchedule | null>(null);
  const [posts, setPosts] = useState<SocialMediaPost[]>([]);
  const [fetching, setFetching] = useState(true);
  const [canGenerate, setCanGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<MonthlyReportStats | null>(null);
  const [report, setReport] = useState<MonthlyReportAI | null>(null);
  const [reportDate, setReportDate] = useState<string | null>(null);
  const [igConnection, setIgConnection] = useState<InstagramConnection | null>(null);
  const [igSyncing, setIgSyncing] = useState(false);
  // Demografia dos seguidores (idade, gênero, cidade, país)
  const [audience, setAudience] = useState<AudienceDemographics | null>(null);
  const [audienceNote, setAudienceNote] = useState<string | null>(null);
  const [audienceTried, setAudienceTried] = useState(false);
  // Plano do DONO do cronograma libera o recurso para toda a equipe
  const [ownerAllowed, setOwnerAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && userProfile) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userProfile, scheduleId, month, year]);

  async function fetchData() {
    if (!userProfile) return;
    setFetching(true);
    try {
      const { data: sched, error: schedErr } = await supabase
        .from("social_media_schedules")
        .select("*")
        .eq("id", scheduleId)
        .single();
      if (schedErr) throw schedErr;
      setSchedule(sched as SocialMediaSchedule);

      // Recurso Pro/Ultra — validado pelo plano do dono do cronograma
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", (sched as SocialMediaSchedule).owner_id)
        .maybeSingle();
      const allowed = isPremiumSmTier(ownerProfile?.subscription_tier as string | null);
      setOwnerAllowed(allowed);
      if (!allowed) {
        setFetching(false);
        return;
      }

      if ((sched as SocialMediaSchedule).owner_id === userProfile.id) {
        setCanGenerate(true);
      } else {
        const { data: member } = await supabase
          .from("social_media_team_members")
          .select("role")
          .eq("schedule_id", scheduleId)
          .eq("user_id", userProfile.id)
          .eq("status", "active")
          .maybeSingle();
        setCanGenerate(member?.role === "editor" || member?.role === "approver");
      }

      // Conexão com o Instagram (falha silenciosa sem a migration 44)
      supabase
        .rpc("sm_get_instagram_connection", { p_schedule_id: scheduleId })
        .then(({ data, error }) => {
          if (!error && data) setIgConnection(data as InstagramConnection);
        });

      const daysInMonth = new Date(year, month, 0).getDate();
      const { data: monthPosts, error: postsErr } = await supabase
        .from("social_media_posts")
        .select("*")
        .eq("schedule_id", scheduleId)
        .gte("scheduled_date", `${year}-${pad(month)}-01`)
        .lte("scheduled_date", `${year}-${pad(month)}-${pad(daysInMonth)}`)
        .order("scheduled_date");
      if (postsErr) throw postsErr;
      setPosts((monthPosts as SocialMediaPost[]) || []);

      // Relatório já salvo para este mês?
      const { data: saved } = await supabase
        .from("sm_monthly_reports")
        .select("*")
        .eq("schedule_id", scheduleId)
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();
      if (saved) {
        setStats(saved.stats as MonthlyReportStats);
        setReport(saved.report as MonthlyReportAI);
        setReportDate(saved.updated_at || saved.created_at);
        // Reaproveita o snapshot demográfico salvo no relatório
        if ((saved.stats as MonthlyReportStats)?.audience) {
          setAudience((saved.stats as MonthlyReportStats).audience!);
        }
      } else {
        setStats(null);
        setReport(null);
        setReportDate(null);
      }
    } catch (err) {
      console.error("report fetchData error:", err);
      toast.error("Erro ao carregar dados do relatório");
    } finally {
      setFetching(false);
    }
  }

  const postsWithMetrics = useMemo(
    () => posts.filter((p) =>
      (p.metric_likes ?? 0) + (p.metric_comments ?? 0) + (p.metric_shares ?? 0) +
      (p.metric_saves ?? 0) + (p.metric_reach ?? 0) + (p.metric_views ?? 0) > 0
    ),
    [posts]
  );

  // Busca a demografia atual assim que a conexão é detectada (1x por visita)
  useEffect(() => {
    if (!igConnection?.connected || audience || audienceTried || !tokenManager.get()) return;
    setAudienceTried(true);
    fetch("/api/social-media/instagram/demographics", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...tokenManager.authHeader() },
      body: JSON.stringify({ scheduleId }),
    })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (data?.audience) setAudience(data.audience as AudienceDemographics);
        else if (data?.note) setAudienceNote(data.note as string);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [igConnection?.connected, audience, audienceTried]);

  async function handleIgSync() {
    if (!tokenManager.get()) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }
    setIgSyncing(true);
    try {
      const res = await fetch("/api/social-media/instagram/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenManager.authHeader() },
        body: JSON.stringify({ scheduleId, month, year }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Erro na sincronização");
      const parts: string[] = [];
      if (data.updated > 0) parts.push(`${data.updated} post(s) atualizados com métricas reais`);
      if (data.created > 0) parts.push(`${data.created} publicação(ões) importadas para o calendário`);
      toast.success(
        parts.length > 0
          ? `${parts.join(" e ")}.`
          : "Nenhuma publicação do Instagram foi associada aos posts deste mês."
      );
      await fetchData();
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Erro ao sincronizar métricas");
    } finally {
      setIgSyncing(false);
    }
  }

  async function handleGenerateReport() {
    if (!schedule || !userProfile) return;
    if (!tokenManager.get()) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/social-media/monthly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenManager.authHeader() },
        body: JSON.stringify({
          scheduleId,
          clientName: schedule.client_name,
          clientNiche: schedule.client_niche,
          objective: schedule.objective,
          tone: schedule.tone_of_voice,
          targetAudience: schedule.target_audience,
          accountHandle: schedule.account_handle,
          month,
          year,
          posts: posts.map((p) => ({
            id: p.id,
            title: p.title,
            post_type: p.post_type,
            network: p.network,
            scheduled_date: p.scheduled_date,
            status: p.status,
            metric_likes: p.metric_likes,
            metric_comments: p.metric_comments,
            metric_shares: p.metric_shares,
            metric_saves: p.metric_saves,
            metric_reach: p.metric_reach,
            metric_views: p.metric_views,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Erro ao gerar relatório");

      // Anexa o snapshot demográfico ao relatório (fica no PDF e no histórico)
      const statsWithAudience = { ...(data.stats as MonthlyReportStats), audience: audience ?? null };
      setStats(statsWithAudience);
      setReport(data.report as MonthlyReportAI);
      setReportDate(new Date().toISOString());

      // Persiste (1 relatório por cronograma/mês)
      const { error: upsertErr } = await supabase
        .from("sm_monthly_reports")
        .upsert(
          {
            schedule_id: scheduleId,
            month,
            year,
            stats: statsWithAudience,
            report: data.report,
            created_by: userProfile.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "schedule_id,month,year" }
        );
      if (upsertErr) {
        console.error("save report error:", upsertErr);
        toast.warning("Relatório gerado, mas não foi salvo. Execute a migration 43-social-media-analytics.sql no Supabase.");
      } else {
        toast.success("Relatório gerado e salvo!");
      }
    } catch (err) {
      const msg = (err as { message?: string })?.message || "Erro ao gerar relatório";
      console.error("monthly-report error:", msg, err);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  }

  const monthName = MONTHS_PT[month - 1];
  const yearOptions = [year - 1, year, year + 1].filter((v, i, a) => a.indexOf(v) === i);

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-background/50">
        <Header />
        <main className="container mx-auto max-w-4xl py-12 px-4 space-y-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </main>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen bg-background/50">
        <Header />
        <main className="container mx-auto max-w-4xl py-12 px-4">
          <p className="text-muted-foreground">Cronograma não encontrado.</p>
        </main>
      </div>
    );
  }

  // Paywall: dono do cronograma não é Pro/Ultra
  if (ownerAllowed === false) {
    return (
      <div className="min-h-screen bg-background/50">
        <Header />
        <main className="container mx-auto max-w-lg py-10 px-4 space-y-4">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/social-media/${scheduleId}`}>
              <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Relatório Mensal
            </h1>
          </div>
          <PremiumGate
            title="Relatórios de resultados com IA"
            description="Entregue ao seu cliente um relatório mensal profissional, gerado automaticamente a partir das métricas reais."
            bullets={[
              "Ranking dos melhores posts e análise por formato",
              "Diagnóstico com IA: o que funcionou e o que corrigir",
              "Demografia do público (idade, gênero, região)",
              "Sugestões de posts e estratégia para o próximo mês",
              "Exportação em PDF para enviar ao cliente",
            ]}
          />
        </main>
      </div>
    );
  }

  const statCards = stats
    ? [
        { label: "Curtidas", value: stats.totalLikes, icon: Heart, color: "text-pink-500" },
        { label: "Comentários", value: stats.totalComments, icon: MessageCircle, color: "text-blue-500" },
        { label: "Compartilhamentos", value: stats.totalShares, icon: Share2, color: "text-emerald-500" },
        { label: "Salvos", value: stats.totalSaves, icon: Bookmark, color: "text-amber-500" },
        { label: "Alcance", value: stats.totalReach, icon: Eye, color: "text-violet-500" },
        { label: "Engajamento total", value: stats.totalEngagement, icon: TrendingUp, color: "text-blue-600" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background/50">
      <div className="print:hidden">
        <Header />
      </div>
      <main className="container mx-auto max-w-4xl py-10 px-4 space-y-6 print:py-4">

        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/social-media/${scheduleId}`}>
              <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-500" />
                Relatório Mensal
              </h1>
              <p className="text-sm text-muted-foreground">
                {schedule.client_name}{schedule.account_handle ? ` · @${schedule.account_handle}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {MONTHS_PT.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {report && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5" />
                PDF
              </Button>
            )}
          </div>
        </div>

        {/* Cabeçalho de impressão */}
        <div className="hidden print:block border-b border-border pb-4">
          <h1 className="text-2xl font-bold">Relatório de Resultados — {monthName} {year}</h1>
          <p className="text-sm text-muted-foreground">
            {schedule.client_name}{schedule.account_handle ? ` · @${schedule.account_handle}` : ""}
          </p>
        </div>

        {/* Cobertura de métricas + gerar */}
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between gap-4 flex-wrap print:hidden">
          <div>
            <p className="text-sm font-medium">
              {posts.length} posts em {monthName} {year} · <strong>{postsWithMetrics.length}</strong> com métricas registradas
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {postsWithMetrics.length === 0
                ? igConnection?.connected
                  ? "Clique em \"Sincronizar do Instagram\" para puxar as métricas automaticamente."
                  : "Conecte o Instagram no calendário para puxar métricas automaticamente, ou preencha a seção \"Desempenho do post\" em cada post publicado."
                : reportDate
                  ? `Último relatório gerado em ${new Date(reportDate).toLocaleDateString("pt-BR")}. Gere novamente se atualizou métricas.`
                  : "Métricas prontas — gere o relatório com IA."}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {igConnection?.connected && canGenerate && (
              <Button
                variant="outline"
                onClick={handleIgSync}
                disabled={igSyncing}
                className="gap-2"
              >
                {igSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4 text-pink-500" />}
                {igSyncing ? "Sincronizando..." : "Sincronizar do Instagram"}
              </Button>
            )}
            {canGenerate && (
              <Button
                onClick={handleGenerateReport}
                disabled={generating || postsWithMetrics.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? "Analisando resultados..." : report ? "Regerar relatório" : "Gerar relatório com IA"}
              </Button>
            )}
          </div>
        </div>

        {/* Público da conta (demografia dos seguidores via Instagram) */}
        {audience ? (
          <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-pink-500" />
                Público da conta
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {typeof audience.followers === "number" && (
                  <span className="px-2.5 py-1 rounded-full bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 font-medium">
                    {audience.followers.toLocaleString("pt-BR")} seguidores
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Instagram className="h-3 w-3" />
                  dados do Instagram
                </span>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
              <AudienceBars title="Faixa etária" slices={audience.age} barClass="bg-blue-500" />
              <AudienceBars title="Gênero" slices={audience.gender} barClass="bg-pink-500" labelMap={GENDER_LABELS} />
              <AudienceBars title="Principais cidades" slices={audience.city} barClass="bg-emerald-500" />
              <AudienceBars title="Principais países" slices={audience.country} barClass="bg-violet-500" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Demografia dos seguidores fornecida pela API do Instagram (snapshot atual da conta).
              A Meta não disponibiliza esses dados por publicação individual — apenas no nível da conta.
            </p>
          </section>
        ) : audienceNote ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground flex items-center gap-2 print:hidden">
            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            {audienceNote}
          </div>
        ) : null}

        {/* Corpo do relatório */}
        {stats && report ? (
          <div className="space-y-6">

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {statCards.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                    {label}
                  </div>
                  <p className="text-2xl font-bold mt-1">{value.toLocaleString("pt-BR")}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3 flex-wrap text-sm">
              <span className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
                {stats.publishedPosts}/{stats.totalPosts} posts publicados
              </span>
              <span className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
                Engajamento médio: <strong className="text-foreground">{stats.avgEngagementPerPost.toLocaleString("pt-BR")}</strong>/post
              </span>
              {stats.engagementRate !== null && (
                <span className="px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  Taxa de engajamento: <strong>{stats.engagementRate}%</strong>
                </span>
              )}
            </div>

            {/* Resumo executivo */}
            <section className="rounded-2xl border border-border bg-card p-6 space-y-2">
              <h2 className="font-bold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-500" /> Resumo executivo</h2>
              <p className="text-sm leading-relaxed">{report.executive_summary}</p>
              {(report.highlights?.length ?? 0) > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {report.highlights.map((h, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Top posts */}
            <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <h2 className="font-bold flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Melhores posts do mês</h2>
              <div className="space-y-2">
                {stats.topPosts.map((p, i) => {
                  const cfg = POST_TYPE_CONFIG[p.post_type as PostType];
                  return (
                    <div key={p.id || i} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-muted text-muted-foreground"
                      }`}>
                        {i + 1}º
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.scheduled_date} · {cfg?.label || p.post_type} · {p.network}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-pink-500" />{p.likes.toLocaleString("pt-BR")}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3 text-blue-500" />{p.comments.toLocaleString("pt-BR")}</span>
                        <span className="font-semibold text-foreground">{p.engagement.toLocaleString("pt-BR")} eng.</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {(stats.formatBreakdown?.length ?? 0) > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Engajamento médio por formato</p>
                  <div className="flex flex-wrap gap-2">
                    {stats.formatBreakdown.map((f) => {
                      const cfg = POST_TYPE_CONFIG[f.post_type as PostType];
                      return (
                        <span key={f.post_type} className="text-xs px-2.5 py-1 rounded-full border border-border flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-sm ${cfg?.bgColor || "bg-muted"}`} />
                          {cfg?.label || f.post_type}: <strong>{f.avgEngagement.toLocaleString("pt-BR")}</strong> ({f.count} posts)
                        </span>
                      );
                    })}
                  </div>
                  {report.format_insights && (
                    <p className="text-sm mt-3 leading-relaxed">{report.format_insights}</p>
                  )}
                </div>
              )}
            </section>

            {/* O que funcionou / abaixo do esperado */}
            <div className="grid md:grid-cols-2 gap-4">
              <section className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 space-y-2">
                <h2 className="font-bold text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <TrendingUp className="h-4 w-4" /> O que funcionou
                </h2>
                <ul className="space-y-1.5">
                  {(report.what_worked || []).map((w, i) => <li key={i} className="text-sm leading-relaxed">• {w}</li>)}
                </ul>
              </section>
              <section className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-5 space-y-2">
                <h2 className="font-bold text-sm flex items-center gap-2 text-red-700 dark:text-red-300">
                  <TrendingDown className="h-4 w-4" /> Abaixo do esperado
                </h2>
                <ul className="space-y-1.5">
                  {(report.what_underperformed || []).map((w, i) => <li key={i} className="text-sm leading-relaxed">• {w}</li>)}
                </ul>
              </section>
            </div>

            {/* Recomendações + estratégia */}
            <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <h2 className="font-bold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Recomendações</h2>
              <ol className="space-y-2">
                {(report.recommendations || []).map((r, i) => (
                  <li key={i} className="text-sm flex gap-2 leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    {r}
                  </li>
                ))}
              </ol>
              {report.next_month_strategy && (
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 mt-2">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Estratégia para o próximo mês</p>
                  <p className="text-sm leading-relaxed">{report.next_month_strategy}</p>
                </div>
              )}
            </section>

            {/* Posts sugeridos */}
            {(report.suggested_posts?.length ?? 0) > 0 && (
              <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <h2 className="font-bold flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-500" /> Posts sugeridos para o próximo mês</h2>
                <div className="space-y-2">
                  {report.suggested_posts.map((s, i) => {
                    const cfg = POST_TYPE_CONFIG[s.post_type as PostType];
                    return (
                      <div key={i} className="p-3 rounded-xl border border-border">
                        <div className="flex items-center gap-2 flex-wrap">
                          {cfg && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cfg.bgColor} ${cfg.color}`}>{cfg.label}</span>
                          )}
                          <p className="text-sm font-medium">{s.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.rationale}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground print:hidden flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  Para aplicar: volte ao calendário, avance para o próximo mês e clique em "Gerar cronograma" — marque a opção
                  "Aplicar diagnóstico do relatório" para a IA usar esta estratégia.
                </div>
              </section>
            )}

            <p className="text-xs text-muted-foreground text-center print:block">
              Relatório gerado com IA em {reportDate ? new Date(reportDate).toLocaleDateString("pt-BR") : ""} · {schedule.client_name} · {monthName} {year}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center mx-auto">
              <BarChart3 className="h-7 w-7" />
            </div>
            <p className="font-medium">Nenhum relatório gerado para {monthName} {year}</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Registre as métricas dos posts publicados (curtidas, comentários, alcance...) na seção
              "Desempenho do post" de cada post e clique em "Gerar relatório com IA".
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
