"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, Sparkles, Loader2,
  Instagram, Facebook, Youtube, Linkedin, Twitter, Music2, Check, CalendarClock, ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import {
  NetworkType, PostType, MONTHS_PT, NETWORK_OPTIONS, TONE_OPTIONS, OBJECTIVE_OPTIONS,
  SocialMediaPost, POST_TYPE_CONFIG, AccountAnalysis
} from "@/lib/social-media-types";
import { HolidayPicker } from "@/components/social-media/holiday-picker";
import { SelectedHoliday } from "@/lib/holidays-data";
import { tokenManager } from "@/lib/token-manager";

// Limites de contas (cronogramas) por plano — espelha /precos e a RLS do banco
const SCHEDULE_LIMITS: Record<string, number | null> = {
  free: 1,
  standard: 5,
  pro: 5,
  vip: null, // ilimitado
};

const STEPS = ["Briefing", "Configuração", "Geração com IA"];

const NETWORK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
};

const POST_TYPE_OPTIONS: { value: PostType; label: string; description: string }[] = [
  { value: "feed_image", label: "Post Estático", description: "Imagem única no feed" },
  { value: "reels",      label: "Reels",         description: "Vídeo curto vertical" },
  { value: "carrossel",  label: "Carrossel",      description: "Slides / múltiplas imagens" },
  { value: "story",      label: "Stories",        description: "Conteúdo temporário 24h" },
  { value: "shorts",     label: "Shorts",         description: "Vídeo curto YouTube" },
  { value: "thread",     label: "Thread",         description: "Sequência de textos" },
];

export default function NewSchedulePage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<SocialMediaPost[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Ajustes livres aplicados ao regerar (ex.: "mais posts de venda na 2ª quinzena")
  const [adjustInstructions, setAdjustInstructions] = useState("");
  // Anamnese da conta via @ do Instagram (pesquisa web com IA)
  const [analyzing, setAnalyzing] = useState(false);
  const [accountAnalysis, setAccountAnalysis] = useState<AccountAnalysis | null>(null);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();

  const [form, setForm] = useState({
    clientName: "",
    clientNiche: "",
    instagramHandle: "",
    description: "",
    objective: "engajamento",
    productsServices: "",
    differentials: "",
    avoidTopics: "",
    preferredCta: "",
    month: currentMonth,
    year: currentYear,
    networks: [] as NetworkType[],
    postTypes: ["feed_image", "reels", "carrossel", "story"] as PostType[],
    frequency: 4,
    tone: "Profissional e engajante",
    targetAudience: "",
    startFromToday: false,
    holidays: [] as SelectedHoliday[],
  });

  const isCurrentMonth = form.month === currentMonth && form.year === currentYear;

  function toggleNetwork(net: NetworkType) {
    setForm((prev) => ({
      ...prev,
      networks: prev.networks.includes(net)
        ? prev.networks.filter((n) => n !== net)
        : [...prev.networks, net],
    }));
  }

  function togglePostType(type: PostType) {
    setForm((prev) => ({
      ...prev,
      postTypes: prev.postTypes.includes(type)
        ? prev.postTypes.filter((t) => t !== type)
        : [...prev.postTypes, type],
    }));
  }

  function canAdvance() {
    if (step === 0) return form.clientName.trim().length > 0;
    if (step === 1) return form.networks.length > 0 && form.postTypes.length > 0;
    return true;
  }

  async function handleAnalyzeAccount() {
    const handle = form.instagramHandle.replace(/^@/, "").trim();
    if (!handle) {
      toast.error("Informe o @ da conta para analisar");
      return;
    }
    if (!tokenManager.get()) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/social-media/account-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenManager.authHeader() },
        body: JSON.stringify({
          handle,
          clientName: form.clientName || undefined,
          clientNiche: form.clientNiche || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Erro na análise da conta");

      setAccountAnalysis(data.analysis as AccountAnalysis);
      // Aproveita a anamnese para preencher campos vazios do briefing
      if (data.analysis?.target_audience && !form.targetAudience) {
        setForm((p) => ({ ...p, targetAudience: data.analysis.target_audience }));
      }
      toast.success(
        data.analysis?.web_research === false
          ? "Análise gerada com base no nicho (pesquisa web indisponível)."
          : "Conta analisada! A anamnese será usada na geração do cronograma."
      );
    } catch (err) {
      const msg = (err as { message?: string })?.message || "Erro ao analisar a conta";
      console.error("account-analysis error:", msg, err);
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleGenerate() {
    // A autenticação da geração é feita no servidor via token Bearer (requireUser).
    // Não dependemos de `userProfile` aqui — ele pode ainda não ter carregado
    // (ex.: /auth/me lenta em produção) e não é usado no corpo da requisição.
    if (!tokenManager.get()) {
      toast.error("Sessão expirada. Faça login novamente para gerar o cronograma.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/social-media/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenManager.authHeader() },
        body: JSON.stringify({
          clientName: form.clientName,
          clientNiche: form.clientNiche,
          instagramHandle: form.instagramHandle.replace(/^@/, "").trim() || undefined,
          accountAnalysis: accountAnalysis || undefined,
          description: form.description || undefined,
          objective: form.objective || undefined,
          productsServices: form.productsServices || undefined,
          differentials: form.differentials || undefined,
          avoidTopics: form.avoidTopics || undefined,
          preferredCta: form.preferredCta || undefined,
          month: form.month,
          year: form.year,
          networks: form.networks,
          postTypes: form.postTypes,
          frequency: form.frequency,
          tone: form.tone,
          targetAudience: form.targetAudience,
          extraContext: adjustInstructions.trim() || undefined,
          startDay: form.startFromToday && isCurrentMonth ? currentDay : undefined,
          holidays: form.holidays.length > 0 ? form.holidays : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro na geração");
      }

      const data = await res.json();
      setGeneratedPosts(data.posts || []);
      toast.success(`${data.posts?.length || 0} posts gerados com sucesso!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar cronograma");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (generatedPosts.length === 0) return;
    if (!userProfile) {
      toast.error("Não foi possível identificar seu perfil. Recarregue a página e faça login novamente.");
      return;
    }
    setSaving(true);
    try {
      // Limite do plano: contas de social media (Free 1 | Pro 5 | Ultra ilimitado)
      const tier = (userProfile as any).subscriptionTier ?? "vip";
      const limit = SCHEDULE_LIMITS[tier] ?? null;
      if (limit !== null) {
        const { count } = await supabase
          .from("social_media_schedules")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", userProfile.id);
        if ((count ?? 0) >= limit) {
          toast.error(
            `Seu plano permite gerenciar até ${limit} conta(s) de social media. ` +
            `Faça upgrade em /precos para adicionar mais contas.`
          );
          setSaving(false);
          return;
        }
      }

      // Create schedule
      const { data: schedule, error: scheduleErr } = await supabase
        .from("social_media_schedules")
        .insert({
          owner_id: userProfile.id,
          client_name: form.clientName,
          client_niche: form.clientNiche || null,
          description: form.description || null,
          month: form.month,
          year: form.year,
          networks: form.networks,
          tone_of_voice: form.tone,
          target_audience: form.targetAudience || null,
          posting_frequency: form.frequency,
          objective: form.objective || null,
          products_services: form.productsServices || null,
          differentials: form.differentials || null,
          avoid_topics: form.avoidTopics || null,
          preferred_cta: form.preferredCta || null,
          account_handle: form.instagramHandle.replace(/^@/, "").trim() || null,
          account_analysis: accountAnalysis || null,
          status: "active",
        })
        .select()
        .single();

      if (scheduleErr) throw scheduleErr;

      // Insert posts
      const postsToInsert = generatedPosts.map((post) => ({
        schedule_id: schedule.id,
        title: post.title,
        post_type: post.post_type,
        network: post.network,
        scheduled_date: post.scheduled_date,
        scheduled_time: post.scheduled_time || null,
        status: "draft",
        copy: post.copy || null,
        hashtags: post.hashtags || [],
        content_description: post.content_description || null,
        ai_generated: true,
        position_number: post.position_number || null,
        created_by: userProfile.id,
      }));

      const { error: postsErr } = await supabase
        .from("social_media_posts")
        .insert(postsToInsert);

      if (postsErr) throw postsErr;

      toast.success("Cronograma salvo com sucesso!");
      router.push(`/dashboard/social-media/${schedule.id}`);
    } catch (err: any) {
      const msg = err?.message || err?.details || err?.hint || JSON.stringify(err);
      console.error("handleSave error:", msg, err);

      if (err?.code === "42703" || msg?.includes("column")) {
        toast.error("Banco desatualizado. Execute a migration 42-social-media-briefing-fields.sql no Supabase.");
      } else if (msg?.includes("does not exist") || msg?.includes("relation") || err?.code === "42P01") {
        toast.error("Tabela não encontrada. Execute o arquivo social_media_tables.sql no Supabase primeiro.");
      } else if (err?.code === "42501" || msg?.includes("policy")) {
        toast.error(
          "Não foi possível criar o cronograma. Você pode ter atingido o limite de contas do seu plano — faça upgrade em /precos."
        );
      } else {
        toast.error(`Erro ao salvar: ${msg || "verifique o console"}`);
      }
    } finally {
      setSaving(false);
    }
  }

  const monthOptions = MONTHS_PT.map((m, i) => ({ value: i + 1, label: m }));
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="min-h-screen flex flex-col bg-background/50">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-3xl space-y-8">

          {/* Back + Title */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard/social-media">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Novo Cronograma</h1>
              <p className="text-sm text-muted-foreground">Gere um cronograma completo com IA</p>
            </div>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${i < step
                  ? "bg-blue-600 text-white"
                  : i === step
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-2 border-blue-500"
                    : "bg-muted text-muted-foreground"
                  }`}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-sm hidden sm:block ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {s}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px ${i < step ? "bg-blue-500" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 0: Briefing */}
          {step === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Briefing do Cliente</CardTitle>
                <CardDescription>Informe os dados básicos para personalizar o cronograma</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Nome do Cliente / Marca *</Label>
                  <Input
                    id="clientName"
                    placeholder="Ex: Academia Fitness Plus"
                    value={form.clientName}
                    onChange={(e) => setForm((p) => ({ ...p, clientName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientNiche">Nicho / Segmento</Label>
                  <Input
                    id="clientNiche"
                    placeholder="Ex: Academia e fitness, Restaurante, E-commerce de moda..."
                    value={form.clientNiche}
                    onChange={(e) => setForm((p) => ({ ...p, clientNiche: e.target.value }))}
                  />
                </div>
                {/* @ da conta + anamnese com IA */}
                <div className="space-y-2">
                  <Label htmlFor="instagramHandle">@ da conta no Instagram</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                      <Input
                        id="instagramHandle"
                        placeholder="conta.do.cliente"
                        value={form.instagramHandle}
                        onChange={(e) => {
                          setForm((p) => ({ ...p, instagramHandle: e.target.value.replace(/^@/, "") }));
                          setAccountAnalysis(null);
                        }}
                        className="pl-8"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAnalyzeAccount}
                      disabled={analyzing || !form.instagramHandle.trim()}
                      className="gap-2 shrink-0"
                    >
                      {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-blue-500" />}
                      {analyzing ? "Analisando..." : "Analisar com IA"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A IA pesquisa a conta e a empresa na internet e faz uma anamnese (tom de voz, temas, público, oportunidades) usada na geração do cronograma.
                  </p>
                </div>

                {/* Resultado da anamnese */}
                {accountAnalysis && (
                  <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        <Instagram className="h-4 w-4" />
                        Anamnese de @{form.instagramHandle.replace(/^@/, "")}
                      </p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                        {accountAnalysis.web_research === false ? "Baseada no nicho" : "Pesquisa na internet"}
                      </span>
                    </div>
                    {accountAnalysis.summary && (
                      <p className="text-sm text-foreground/90">{accountAnalysis.summary}</p>
                    )}
                    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      {accountAnalysis.tone_of_voice && (
                        <div>
                          <p className="font-semibold text-muted-foreground">Tom de voz percebido</p>
                          <p>{accountAnalysis.tone_of_voice}</p>
                        </div>
                      )}
                      {accountAnalysis.positioning && (
                        <div>
                          <p className="font-semibold text-muted-foreground">Posicionamento</p>
                          <p>{accountAnalysis.positioning}</p>
                        </div>
                      )}
                    </div>
                    {(accountAnalysis.content_themes?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {accountAnalysis.content_themes!.map((t) => (
                          <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-background border border-blue-200 dark:border-blue-800">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {(accountAnalysis.opportunities?.length ?? 0) > 0 && (
                      <div className="text-xs space-y-1">
                        <p className="font-semibold text-muted-foreground">Oportunidades identificadas</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {accountAnalysis.opportunities!.slice(0, 4).map((o) => <li key={o}>{o}</li>)}
                        </ul>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      ✓ Esta anamnese será enviada à IA junto com o briefing na geração do cronograma.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Objetivo principal do mês</Label>
                  <Select
                    value={form.objective}
                    onValueChange={(v) => setForm((p) => ({ ...p, objective: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OBJECTIVE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    A IA ajusta o mix de conteúdo (educativo, engajamento, venda...) conforme o objetivo.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição adicional</Label>
                  <Textarea
                    id="description"
                    placeholder="Alguma informação importante sobre o cliente, diferencial, produto principal..."
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Público-alvo</Label>
                  <Input
                    id="targetAudience"
                    placeholder="Ex: Mulheres de 25-40 anos, interessadas em saúde e bem-estar"
                    value={form.targetAudience}
                    onChange={(e) => setForm((p) => ({ ...p, targetAudience: e.target.value }))}
                  />
                </div>

                {/* Briefing avançado (opcional) — quanto mais contexto, melhor o cronograma */}
                <div className="rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="w-full flex items-center justify-between p-3.5 text-sm font-medium hover:bg-muted/40 transition-colors rounded-xl"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      Briefing avançado (opcional)
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                  </button>
                  {showAdvanced && (
                    <div className="p-4 pt-1 space-y-4 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Estes campos deixam os posts muito mais personalizados — a IA cita produtos, usa os diferenciais e respeita as restrições.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="productsServices">Produtos / serviços em destaque</Label>
                        <Textarea
                          id="productsServices"
                          placeholder="Ex: Plano trimestral com personal incluso, aulas de spinning, avaliação física gratuita..."
                          value={form.productsServices}
                          onChange={(e) => setForm((p) => ({ ...p, productsServices: e.target.value }))}
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="differentials">Diferenciais do cliente</Label>
                        <Textarea
                          id="differentials"
                          placeholder="Ex: Única academia 24h da região, equipe com 10 anos de experiência, resultados comprovados..."
                          value={form.differentials}
                          onChange={(e) => setForm((p) => ({ ...p, differentials: e.target.value }))}
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="avoidTopics">O que a IA deve evitar</Label>
                        <Textarea
                          id="avoidTopics"
                          placeholder="Ex: Não falar de preço, evitar humor, não prometer resultados garantidos..."
                          value={form.avoidTopics}
                          onChange={(e) => setForm((p) => ({ ...p, avoidTopics: e.target.value }))}
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="preferredCta">CTA preferido</Label>
                        <Input
                          id="preferredCta"
                          placeholder="Ex: Agende sua aula experimental pelo link da bio"
                          value={form.preferredCta}
                          onChange={(e) => setForm((p) => ({ ...p, preferredCta: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Configuration */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Configuração do Cronograma</CardTitle>
                <CardDescription>Defina o período, redes sociais e frequência de postagem</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Month + Year */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mês</Label>
                    <Select
                      value={String(form.month)}
                      onValueChange={(v) => setForm((p) => ({ ...p, month: Number(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ano</Label>
                    <Select
                      value={String(form.year)}
                      onValueChange={(v) => setForm((p) => ({ ...p, year: Number(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Networks */}
                <div className="space-y-3">
                  <Label>Redes Sociais *</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {NETWORK_OPTIONS.map(({ value, label }) => {
                      const Icon = NETWORK_ICONS[value];
                      const selected = form.networks.includes(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleNetwork(value)}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-sm font-medium ${selected
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                            : "border-border hover:border-blue-300 text-foreground"
                            }`}
                        >
                          {Icon && <Icon className="h-5 w-5 shrink-0" />}
                          {label}
                          {selected && <Check className="h-4 w-4 ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Post Types */}
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <Label>Formatos de conteúdo *</Label>
                    <span className="text-xs text-muted-foreground">
                      {form.postTypes.length} selecionado{form.postTypes.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {POST_TYPE_OPTIONS.map(({ value, label, description }) => {
                      const cfg = POST_TYPE_CONFIG[value];
                      const selected = form.postTypes.includes(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => togglePostType(value)}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left ${selected
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-border hover:border-blue-300"
                            }`}
                        >
                          <div className={`w-2.5 h-2.5 rounded-sm shrink-0 ${cfg.bgColor}`} />
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium leading-none ${selected ? "text-blue-700 dark:text-blue-300" : "text-foreground"}`}>
                              {label}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight truncate">
                              {description}
                            </p>
                          </div>
                          {selected && <Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  {form.postTypes.length === 0 && (
                    <p className="text-xs text-red-500">Selecione ao menos um formato</p>
                  )}
                </div>

                {/* Frequency */}
                <div className="space-y-2">
                  <Label>Frequência de posts por semana</Label>
                  <Select
                    value={String(form.frequency)}
                    onValueChange={(v) => setForm((p) => ({ ...p, frequency: Number(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 6, 7].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} {n === 7 ? "posts por semana (todo dia)" : `posts por semana (~${Math.round(n * 4.3)} no mês)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tone */}
                <div className="space-y-2">
                  <Label>Tom de voz</Label>
                  <Select
                    value={form.tone}
                    onValueChange={(v) => setForm((p) => ({ ...p, tone: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Holidays picker */}
                <HolidayPicker
                  month={form.month}
                  year={form.year}
                  value={form.holidays}
                  onChange={(holidays) => setForm((p) => ({ ...p, holidays }))}
                />

                {/* Start from today */}
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, startFromToday: !p.startFromToday }))}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    form.startFromToday
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-border hover:border-blue-300"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                    form.startFromToday
                      ? "border-blue-500 bg-blue-500"
                      : "border-muted-foreground/40"
                  }`}>
                    {form.startFromToday && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CalendarClock className={`h-4 w-4 shrink-0 ${form.startFromToday ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`} />
                      <p className={`text-sm font-medium ${form.startFromToday ? "text-blue-700 dark:text-blue-300" : "text-foreground"}`}>
                        Gerar a partir de hoje (dia {currentDay})
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                      {isCurrentMonth
                        ? `A IA criará posts somente do dia ${currentDay} em diante, ignorando os dias já passados.`
                        : "Disponível apenas quando o mês selecionado for o mês atual."}
                    </p>
                  </div>
                </button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Generate */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500" />
                  Geração com IA
                </CardTitle>
                <CardDescription>
                  A IA irá criar posts completos com copy, hashtags e brief para cada dia do mês
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary */}
                <div className="rounded-xl border border-border p-4 space-y-2 bg-muted/30">
                  <p className="text-sm font-medium">Resumo do cronograma:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <span>Cliente: <strong className="text-foreground">{form.clientName}</strong></span>
                    <span>Período: <strong className="text-foreground">{MONTHS_PT[form.month - 1]} {form.year}</strong></span>
                    <span>Frequência: <strong className="text-foreground">{form.frequency}x/semana</strong></span>
                    <span>Redes: <strong className="text-foreground">{form.networks.length} selecionadas</strong></span>
                  </div>
                </div>

                {generatedPosts.length === 0 ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center mx-auto">
                      <Sparkles className="h-8 w-8" />
                    </div>
                    <p className="text-muted-foreground">
                      Clique em "Gerar com IA" para criar automaticamente posts, copys, hashtags e briefs para o mês inteiro.
                    </p>
                    <Button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                      size="lg"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Gerando cronograma...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Gerar com IA
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      A geração pode levar até 30 segundos dependendo da quantidade de posts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        ✓ {generatedPosts.length} posts gerados com sucesso
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerate}
                        disabled={generating}
                        className="gap-2"
                      >
                        {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        {adjustInstructions.trim() ? "Regerar com ajustes" : "Regerar"}
                      </Button>
                    </div>

                    {/* Ajustes rápidos antes de salvar — vão como instrução especial na regeração */}
                    <div className="space-y-1.5">
                      <Label htmlFor="adjustInstructions" className="text-xs text-muted-foreground">
                        Quer ajustar algo? Descreva e clique em "Regerar com ajustes"
                      </Label>
                      <Textarea
                        id="adjustInstructions"
                        placeholder='Ex: "Mais posts de venda na 2ª quinzena", "Menos stories, mais reels", "Inclua a promoção de inauguração"...'
                        value={adjustInstructions}
                        onChange={(e) => setAdjustInstructions(e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                      {generatedPosts.slice(0, 8).map((post, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card text-sm">
                          <span className="text-muted-foreground shrink-0 w-6">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium line-clamp-1">{post.title}</span>
                            <span className="text-muted-foreground block text-xs mt-0.5">
                              {post.scheduled_date} · {post.post_type} · {post.network}
                            </span>
                          </div>
                        </div>
                      ))}
                      {generatedPosts.length > 8 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          + {generatedPosts.length - 8} posts adicionais
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Anterior
            </Button>

            {step < 2 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance()}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                Próximo
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={generatedPosts.length === 0 || saving}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Salvar Cronograma
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
