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
  Instagram, Facebook, Youtube, Linkedin, Twitter, Music2, Check, CalendarClock
} from "lucide-react";
import { toast } from "sonner";
import {
  NetworkType, PostType, MONTHS_PT, NETWORK_OPTIONS, TONE_OPTIONS, SocialMediaPost, POST_TYPE_CONFIG
} from "@/lib/social-media-types";
import { HolidayPicker } from "@/components/social-media/holiday-picker";
import { SelectedHoliday } from "@/lib/holidays-data";

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

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();

  const [form, setForm] = useState({
    clientName: "",
    clientNiche: "",
    description: "",
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

  async function handleGenerate() {
    if (!userProfile) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/social-media/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: form.clientName,
          clientNiche: form.clientNiche,
          month: form.month,
          year: form.year,
          networks: form.networks,
          postTypes: form.postTypes,
          frequency: form.frequency,
          tone: form.tone,
          targetAudience: form.targetAudience,
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
    if (!userProfile || generatedPosts.length === 0) return;
    setSaving(true);
    try {
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

      if (msg?.includes("does not exist") || msg?.includes("relation") || err?.code === "42P01") {
        toast.error("Tabela não encontrada. Execute o arquivo social_media_tables.sql no Supabase primeiro.");
      } else if (err?.code === "42501" || msg?.includes("policy")) {
        toast.error("Sem permissão. Verifique as políticas RLS no Supabase.");
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
                        Regerar
                      </Button>
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
