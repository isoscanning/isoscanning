"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import apiClient from "@/lib/api-service";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollReveal } from "@/components/scroll-reveal";
import { useToast } from "@/components/ui/use-toast";
import { trackEvent } from "@/lib/analytics";
import {
  ArrowLeft,
  Award,
  CalendarPlus,
  Check,
  Copy,
  Gift,
  Link2,
  MessageCircle,
  Percent,
  Search,
  Share2,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

interface ReferralSummary {
  enabled: boolean;
  code: string;
  link: string;
  /** Indicador no plano anual: prêmios não viram desconto (regra 2026-09-01). */
  annualPlan?: boolean;
  settings: {
    referredBonusDays: number;
    referredTrialDays: number;
    rewardPercent: number;
    maxDiscountPercent: number;
    ambassadorMinReferrals: number;
    rewardValidityDays?: number;
  };
  stats: { signups: number; converted: number; referralCount: number; isAmbassador: boolean };
  rewards: {
    pendingCount: number;
    availableCount: number;
    appliedCount: number;
    availablePercent: number;
    nextInvoiceDiscountPercent: number;
    appliedTotalPercent: number;
    expiredCount?: number;
    nextExpiryAt?: string | null;
  };
  referred: Array<{
    displayName: string;
    avatarUrl: string | null;
    redeemedAt: string;
    status: "signed_up" | "converted" | "cancelled";
  }>;
}

const STATUS_LABEL: Record<ReferralSummary["referred"][number]["status"], { label: string; className: string }> = {
  signed_up: { label: "Criou a conta", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  converted: { label: "Assinou ✓", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  cancelled: { label: "Cancelou", className: "bg-muted text-muted-foreground border-border" },
};

export default function IndicacoesPage() {
  const router = useRouter();
  const { userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    if (!authLoading && !userProfile) router.push("/login?redirect=/dashboard/indicacoes");
  }, [authLoading, userProfile, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<ReferralSummary>("/referrals/me");
      setSummary(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Não foi possível carregar suas indicações.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userProfile?.id) load();
  }, [userProfile?.id, load]);

  const copy = async (what: "code" | "link") => {
    if (!summary) return;
    const text = what === "code" ? summary.code : summary.link;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      trackEvent({ action: "click_cta", category: "Referral", label: `copy_${what}` });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast({ title: "Não foi possível copiar", description: text });
    }
  };

  const shareMessage = summary
    ? `Estou usando a IsoScanning para organizar meus trabalhos como profissional criativo. Cria sua conta com o meu código ${summary.code} e você ganha ${summary.settings.referredBonusDays} dias a mais quando assinar: ${summary.link}`
    : "";

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  const rewardPercent = summary?.settings.rewardPercent ?? 5;
  const maxPercent = summary?.settings.maxDiscountPercent ?? 50;
  const validityDays = summary?.settings.rewardValidityDays ?? 90;
  const stepsToMax = Math.max(1, Math.floor(maxPercent / Math.max(rewardPercent, 1)));
  const nextPercent = summary?.rewards.nextInvoiceDiscountPercent ?? 0;
  const progress = Math.min(100, Math.round((nextPercent / maxPercent) * 100));

  if (authLoading || !userProfile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container max-w-5xl mx-auto py-8 px-4 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container max-w-5xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 rounded-full hover:bg-accent transition-colors" aria-label="Voltar">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Gift className="h-7 w-7 text-emerald-500" />
              Indique e Ganhe
            </h1>
            <p className="text-muted-foreground">
              Traga outros profissionais para a IsoScanning e pague menos todo mês.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={load}>Tentar de novo</Button>
          </div>
        )}

        {loading && !summary && (
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        )}

        {summary && !summary.enabled && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-6 text-sm text-muted-foreground">
              O programa de indicação está em preparação. Seu código já existe (<span className="font-mono font-semibold text-foreground">{summary.code}</span>),
              mas ele só passa a valer quando o programa for liberado.
            </CardContent>
          </Card>
        )}

        {summary && (
          <>
            {/* ── Código + compartilhar ── */}
            <ScrollReveal>
              <Card className="border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card overflow-hidden">
                <CardContent className="p-6 md:p-8">
                  <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
                    <div className="space-y-4">
                      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                        Seu código de indicação
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-3xl md:text-4xl font-bold tracking-widest">{summary.code}</span>
                        <Button variant="outline" size="sm" onClick={() => copy("code")} className="gap-2">
                          {copied === "code" ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                          {copied === "code" ? "Copiado" : "Copiar código"}
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Link2 className="h-4 w-4 shrink-0" />
                        <span className="truncate max-w-full font-mono text-xs md:text-sm">{summary.link}</span>
                        <button
                          type="button"
                          onClick={() => copy("link")}
                          className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                        >
                          {copied === "link" ? "copiado!" : "copiar link"}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 md:min-w-[220px]">
                      <a href={whatsappHref} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent({ action: "click_cta", category: "Referral", label: "share_whatsapp" })}>
                        <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-11">
                          <MessageCircle className="h-4 w-4" />
                          Enviar no WhatsApp
                        </Button>
                      </a>
                      {typeof navigator !== "undefined" && "share" in navigator && (
                        <Button
                          variant="outline"
                          className="w-full gap-2 h-11"
                          onClick={() => navigator.share({ title: "IsoScanning", text: shareMessage, url: summary.link }).catch(() => undefined)}
                        >
                          <Share2 className="h-4 w-4" />
                          Compartilhar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* ── Desconto na próxima fatura ── */}
            <ScrollReveal delay={0.05}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Percent className="h-5 w-5 text-emerald-500" />
                        Desconto na sua próxima fatura
                      </CardTitle>
                      <CardDescription>
                        Cada indicado que assina vale <strong>{rewardPercent}%</strong>. Acumula até <strong>{maxPercent}%</strong> por fatura; o que passar fica para a seguinte. Cada prêmio vale por <strong>{validityDays} dias</strong>.
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{nextPercent}%</p>
                      <p className="text-xs text-muted-foreground">
                        {summary.rewards.availableCount} de {stepsToMax} indicações no teto
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>0%</span>
                    <span>{Math.round(maxPercent / 2)}%</span>
                    <span>{maxPercent}% (máximo)</span>
                  </div>
                  {summary.rewards.availablePercent > maxPercent && (
                    <p className="text-xs text-muted-foreground">
                      Você tem {summary.rewards.availablePercent - maxPercent}% guardados para as próximas faturas.
                    </p>
                  )}
                  {summary.rewards.appliedTotalPercent > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Já usados: {summary.rewards.appliedTotalPercent}% em {summary.rewards.appliedCount} fatura{summary.rewards.appliedCount === 1 ? "" : "s"}.
                    </p>
                  )}
                  {summary.rewards.nextExpiryAt && (
                    <p className="text-xs text-muted-foreground">
                      Próximo prêmio vence em {new Date(summary.rewards.nextExpiryAt).toLocaleDateString("pt-BR")} — use antes para não perder.
                    </p>
                  )}
                  {(summary.rewards.expiredCount ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {summary.rewards.expiredCount} prêmio{summary.rewards.expiredCount === 1 ? "" : "s"} venceu sem uso.
                    </p>
                  )}
                  {summary.annualPlan && (
                    <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                      Você está no plano anual: o desconto de indicação vale apenas para o plano mensal. Seus prêmios
                      ficam guardados (dentro da validade) caso você mude para o mensal.
                    </p>
                  )}
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* ── Números ── */}
            <ScrollReveal delay={0.08}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: UserPlus, label: "Criaram conta", value: summary.stats.signups },
                  { icon: Sparkles, label: "Assinaram", value: summary.stats.converted },
                  { icon: Percent, label: "Desconto disponível", value: `${summary.rewards.availablePercent}%` },
                  { icon: TrendingUp, label: "Já economizado", value: `${summary.rewards.appliedTotalPercent}%` },
                ].map(({ icon: Icon, label, value }) => (
                  <Card key={label}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollReveal>

            {/* ── Como funciona ── */}
            <ScrollReveal delay={0.1}>
              <Card>
                <CardHeader>
                  <CardTitle>Como funciona</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    {[
                      {
                        icon: Share2,
                        title: "1. Compartilhe seu código",
                        text: "Mande o link para colegas fotógrafos, videomakers e criadores. Eles criam a conta com o seu código.",
                      },
                      {
                        icon: CalendarPlus,
                        title: `2. Quem entra ganha +${summary.settings.referredBonusDays} dias`,
                        text: `Além do teste grátis do Pro, ao assinar a pessoa ganha ${summary.settings.referredBonusDays} dias a mais no primeiro período pago.`,
                      },
                      {
                        icon: Percent,
                        title: `3. Você ganha ${rewardPercent}% por assinatura`,
                        text: `Quando o indicado paga a primeira fatura, ${rewardPercent}% de desconto entram na sua próxima cobrança — até ${maxPercent}% por fatura.`,
                      },
                    ].map(({ icon: Icon, title, text }) => (
                      <div key={title} className="flex gap-3">
                        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{title}</p>
                          <p className="text-sm text-muted-foreground leading-relaxed mt-1">{text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* ── Embaixador + busca ── */}
            <ScrollReveal delay={0.12}>
              <Card className={summary.stats.isAmbassador ? "border-amber-500/40 bg-amber-500/5" : ""}>
                <CardContent className="p-6 flex flex-col md:flex-row md:items-center gap-5">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${summary.stats.isAmbassador ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>
                    <Award className="h-7 w-7" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        {summary.stats.isAmbassador ? "Você é Embaixador IsoScanning" : "Selo Embaixador"}
                      </p>
                      {summary.stats.isAmbassador && <Badge className="bg-amber-500 text-white">Ativo</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {summary.stats.isAmbassador
                        ? `Suas ${summary.stats.referralCount} indicações convertidas dão selo no seu perfil e prioridade na busca de profissionais dentro do seu plano.`
                        : `A partir de ${summary.settings.ambassadorMinReferrals} indicações que assinam, você ganha o selo no perfil e sobe na busca de profissionais — quem contrata vê você antes. Faltam ${Math.max(0, summary.settings.ambassadorMinReferrals - summary.stats.referralCount)}.`}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5" />
                      Ordem da busca: plano → indicações convertidas → avaliação.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>

            {/* ── Indicados ── */}
            <ScrollReveal delay={0.14}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Suas indicações
                  </CardTitle>
                  <CardDescription>
                    {summary.referred.length === 0
                      ? "Ninguém entrou com o seu código ainda. Compartilhe o link acima."
                      : `${summary.referred.length} pessoa${summary.referred.length === 1 ? "" : "s"} entrou com o seu código.`}
                  </CardDescription>
                </CardHeader>
                {summary.referred.length > 0 && (
                  <CardContent>
                    <ul className="divide-y divide-border">
                      {summary.referred.map((r, i) => (
                        <li key={`${r.displayName}-${i}`} className="flex items-center gap-3 py-3">
                          <div className="h-9 w-9 rounded-full bg-muted overflow-hidden flex items-center justify-center text-sm font-semibold shrink-0">
                            {r.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={r.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              (r.displayName || "?").charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{r.displayName}</p>
                            <p className="text-xs text-muted-foreground">
                              entrou em {r.redeemedAt ? new Date(r.redeemedAt).toLocaleDateString("pt-BR") : "—"}
                            </p>
                          </div>
                          <Badge variant="outline" className={STATUS_LABEL[r.status].className}>
                            {STATUS_LABEL[r.status].label}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                )}
              </Card>
            </ScrollReveal>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
