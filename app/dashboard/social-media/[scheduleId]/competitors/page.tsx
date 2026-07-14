"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { tokenManager } from "@/lib/token-manager";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Sparkles, Loader2, Users, AtSign, Plus, X,
  TrendingUp, AlertTriangle, Lightbulb, Target, Globe, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { SocialMediaSchedule, CompetitorAnalysis } from "@/lib/social-media-types";

// Análise de concorrentes com IA: pesquisa até 3 @s do Instagram na web
// (groq/compound-mini) e devolve comparação + recomendações de diferenciação.
// O resultado fica salvo no cronograma (competitor_analysis, migration 48).

export default function CompetitorsPage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = params.scheduleId as string;
  const { userProfile, loading: authLoading } = useAuth();

  const [schedule, setSchedule] = useState<SocialMediaSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [handles, setHandles] = useState<string[]>([""]);
  const [analysis, setAnalysis] = useState<CompetitorAnalysis | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!userProfile) {
      router.push("/login");
      return;
    }
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("social_media_schedules")
          .select("*")
          .eq("id", scheduleId)
          .single();
        if (error || !data) {
          router.push("/dashboard/social-media");
          return;
        }
        const sched = data as SocialMediaSchedule;
        setSchedule(sched);
        if (sched.competitor_analysis) {
          setAnalysis(sched.competitor_analysis);
          const saved = sched.competitor_analysis.competitors?.map((c) => c.handle).filter(Boolean);
          if (saved?.length) setHandles(saved);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authLoading, userProfile, scheduleId, router]);

  const cleanHandles = handles.map((h) => h.replace(/^@/, "").trim()).filter(Boolean);
  const isOwner = schedule?.owner_id === userProfile?.id;

  async function handleAnalyze() {
    if (!schedule || !cleanHandles.length || analyzing) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/social-media/competitor-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenManager.authHeader() },
        body: JSON.stringify({
          competitors: cleanHandles,
          clientName: schedule.client_name,
          clientNiche: schedule.client_niche,
          accountHandle: schedule.account_handle,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string })?.error || "Erro ao analisar concorrentes");

      const result = data.analysis as CompetitorAnalysis;
      setAnalysis(result);

      // Persiste no cronograma (RLS: apenas o owner consegue atualizar)
      if (isOwner) {
        const { error } = await supabase
          .from("social_media_schedules")
          .update({ competitor_analysis: result })
          .eq("id", scheduleId);
        if (error) console.error("Erro ao salvar análise de concorrentes:", error);
      }

      toast.success(
        result.web_research
          ? "Análise de concorrentes gerada com pesquisa na web!"
          : "Análise gerada com base no nicho (a pesquisa web não estava disponível)."
      );
    } catch (err) {
      const msg = (err as { message?: string })?.message || "Erro ao analisar concorrentes";
      console.error("competitor-analysis error:", msg, err);
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  }

  if (authLoading || loading || !schedule) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">

        {/* Breadcrumb */}
        <div>
          <Link
            href={`/dashboard/social-media/${scheduleId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao cronograma
          </Link>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-violet-500" />
            <h1 className="text-2xl font-bold">Análise de Concorrentes</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            A IA pesquisa os concorrentes de <span className="font-medium text-foreground">{schedule.client_name}</span> na
            web e sugere como se diferenciar no conteúdo.
          </p>
        </div>

        {/* Handles input */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <p className="text-sm font-medium">Contas concorrentes no Instagram (até 3)</p>
          {handles.map((h, i) => (
            <div key={i} className="flex gap-2">
              <div className="relative flex-1">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={h}
                  onChange={(e) => setHandles((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                  placeholder="concorrente"
                  className="pl-9"
                  disabled={analyzing}
                />
              </div>
              {handles.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => setHandles((prev) => prev.filter((_, idx) => idx !== i))} disabled={analyzing}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 pt-1">
            {handles.length < 3 ? (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setHandles((prev) => [...prev, ""])} disabled={analyzing}>
                <Plus className="h-3.5 w-3.5" /> Adicionar concorrente
              </Button>
            ) : <span />}
            <Button
              onClick={handleAnalyze}
              disabled={analyzing || !cleanHandles.length}
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
            >
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : analysis ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {analyzing ? "Pesquisando na web..." : analysis ? "Refazer análise" : "Analisar concorrentes"}
            </Button>
          </div>
        </div>

        {/* Results */}
        {analysis && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              {analysis.web_research ? "Gerado com pesquisa na web" : "Gerado com base no nicho (sem pesquisa web)"}
              {analysis.generated_at && <> · {new Date(analysis.generated_at).toLocaleString("pt-BR")}</>}
            </div>

            {/* Competitor cards */}
            <div className="grid md:grid-cols-2 gap-4">
              {analysis.competitors.map((c) => (
                <div key={c.handle} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={`https://instagram.com/${c.handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      @{c.handle}
                    </a>
                    {!c.found && <Badge variant="outline" className="text-[10px]">análise por nicho</Badge>}
                  </div>
                  {c.summary && <p className="text-sm text-muted-foreground">{c.summary}</p>}
                  {c.content_strategy && (
                    <div className="text-sm">
                      <p className="text-xs font-semibold text-foreground/70 mb-0.5">Estratégia de conteúdo</p>
                      <p className="text-muted-foreground">{c.content_strategy}</p>
                    </div>
                  )}
                  {c.posting_style && (
                    <div className="text-sm">
                      <p className="text-xs font-semibold text-foreground/70 mb-0.5">Estilo</p>
                      <p className="text-muted-foreground">{c.posting_style}</p>
                    </div>
                  )}
                  {c.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-600 mb-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Pontos fortes</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5 list-disc pl-4">
                        {c.strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {c.weaknesses.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-600 mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Pontos fracos</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5 list-disc pl-4">
                        {c.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Gaps / Differentiation / Recommendations */}
            <div className="grid md:grid-cols-3 gap-4">
              {analysis.gaps.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" /> Espaços vazios
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                    {analysis.gaps.map((g, i) => <li key={i}>{g}</li>)}
                  </ul>
                </div>
              )}
              {analysis.differentiation.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                    <Target className="h-4 w-4 text-violet-500" /> Como se diferenciar
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                    {analysis.differentiation.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
              )}
              {analysis.recommendations.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                    <Sparkles className="h-4 w-4 text-blue-500" /> Ações recomendadas
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                    {analysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {!analysis && !analyzing && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Informe os @s dos concorrentes e clique em "Analisar concorrentes" para gerar a comparação com IA.
          </div>
        )}
      </main>
    </div>
  );
}
