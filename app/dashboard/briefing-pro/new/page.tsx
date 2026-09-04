"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Sparkles, PenLine, Loader2, CheckCircle2,
  Package, Users, MapPin, RefreshCw, Save, Lock, CornerDownRight,
  FileUp, FileText, FileImage, Paperclip, X, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  ACCEPT_ATTRIBUTE,
  BriefingFileKind,
  FILE_KIND_LABELS,
  MAX_FILE_BYTES,
  MAX_FILE_LABEL,
  detectFileKind,
  formatFileSize,
  unsupportedFileMessage,
} from "@/lib/briefing-pro-file";
import { briefingProService, CreateBriefingPayload } from "@/lib/briefing-pro-service";
import { tokenManager } from "@/lib/token-manager";
import { notifyPlanLimit } from "@/lib/plans/plan-events";
import {
  BriefingType,
  BRIEFING_TYPE_LABELS,
  GeneratedBriefingStructure,
  ITEM_TYPE_LABELS,
  PRIORITY_CONFIG,
} from "@/lib/briefing-pro-types";

type Mode = "choose" | "manual" | "ai";

/** Extrai a mensagem de erro do backend (ex.: cota de briefings do plano). */
function apiErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;
  if (Array.isArray(msg)) return msg[0] ?? fallback;
  return msg || fallback;
}

/** 403 de plano vindo do apiClient — o interceptor já abriu o modal de upgrade. */
function isPlanApiError(err: unknown): boolean {
  const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
  return code === "PLAN_LIMIT" || code === "PLAN_FEATURE";
}

/** Arquivo base já lido pelo servidor (/api/briefing-pro/extract-file). */
interface AttachedFile {
  name: string;
  size: number;
  kind: BriefingFileKind;
  text: string;
  chars: number;
  pages: number | null;
  method: string;
  /** Aviso do servidor: texto cortado por tamanho ou OCR incompleto. */
  note: string | null;
}

/**
 * Fotos de celular passam de 4 MB fácil; reduzimos no navegador (1600 px,
 * JPEG) — suficiente para o OCR ler e bem abaixo do limite do upload.
 */
async function prepareImageForOcr(file: File): Promise<Blob> {
  try {
    return await imageCompression(file, {
      maxWidthOrHeight: 1600,
      maxSizeMB: 1.2,
      useWebWorker: true,
      initialQuality: 0.85,
      fileType: "image/jpeg",
    });
  } catch (err) {
    console.warn("[briefing-pro] compressão da imagem falhou, enviando original", err);
    return file;
  }
}

const DESCRIPTION_PLACEHOLDER = `Ex: Casamento da Ana e do Pedro dia 15/11 no Espaço Jardim, cerimônia às 17h e festa até 1h. A noiva quer fotos do making of a partir das 14h no hotel Villa. Entregar 40 fotos editadas em até 20 dias e um vídeo de 3 minutos para o Instagram. Contato da cerimonialista: Paula (11) 99999-9999. Não fotografar a avó do noivo, que não autorizou imagem...`;

const NOTES_PLACEHOLDER = `Ex: Priorizar as fotos da família logo após a cerimônia. O cliente ainda não confirmou o horário do making of. Incluir checklist de equipamento e cronograma detalhado do dia...`;

/** Estrutura sugerida por tipo de trabalho na criação manual. */
const DEFAULT_SECTIONS: Record<BriefingType, Array<{ title: string; description: string }>> = {
  photography: [
    { title: "Preparação", description: "Equipamentos, baterias, cartões, backup e conferências antes do dia" },
    { title: "Cronograma do Dia", description: "Linha do tempo da sessão/evento com horários" },
    { title: "Shot List", description: "Fotos que não podem faltar, por ordem de prioridade" },
    { title: "Pós-produção e Entrega", description: "Seleção, edição, exportação e envio" },
  ],
  video: [
    { title: "Pré-produção", description: "Roteiro, locações, equipe, equipamentos e autorizações" },
    { title: "Shot List / Decupagem", description: "Cenas, planos, ângulos e movimentos" },
    { title: "Dia de Gravação", description: "Cronograma do set com horários" },
    { title: "Pós-produção", description: "Edição, cor, áudio, aprovações e exportações" },
  ],
  social_media: [
    { title: "Estratégia", description: "Objetivo, público, tom de voz e referências" },
    { title: "Produção de Conteúdo", description: "Peças a produzir com formatos e datas" },
    { title: "Aprovação", description: "Fluxo de revisão e responsáveis" },
    { title: "Publicação", description: "Calendário de postagem e monitoramento" },
  ],
  marketing: [
    { title: "Planejamento", description: "Objetivos, KPIs, canais e orçamento" },
    { title: "Criação", description: "Peças, copies e materiais da campanha" },
    { title: "Aprovação", description: "Stakeholders e prazos de validação" },
    { title: "Veiculação", description: "Publicação, tráfego e acompanhamento" },
  ],
  event: [
    { title: "Pré-evento", description: "Alinhamentos, fornecedores, equipe e materiais" },
    { title: "Cronograma do Dia", description: "Linha do tempo do evento com horários" },
    { title: "Cobertura", description: "Momentos-chave que precisam ser registrados" },
    { title: "Pós-evento", description: "Entregas, agradecimentos e fechamento" },
  ],
  other: [
    { title: "Preparação", description: "Tudo que precisa estar pronto antes da execução" },
    { title: "Execução", description: "Passo a passo do trabalho" },
    { title: "Finalização", description: "Entregas e encerramento" },
  ],
};

export default function NewBriefingPage() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("choose");
  const [saving, setSaving] = useState(false);

  // Manual
  const [title, setTitle] = useState("");
  const [briefingType, setBriefingType] = useState<BriefingType>("photography");
  const [clientName, setClientName] = useState("");
  const [objective, setObjective] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [withDefaults, setWithDefaults] = useState(true);

  // IA
  const [aiText, setAiText] = useState("");
  const [aiType, setAiType] = useState<string>("auto");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<GeneratedBriefingStructure | null>(null);

  // Arquivo base (briefing que o cliente mandou)
  const [attached, setAttached] = useState<AttachedFile | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showExtracted, setShowExtracted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  async function createManual() {
    if (title.trim().length < 2) {
      toast.error("Dê um título ao briefing");
      return;
    }
    setSaving(true);
    try {
      const payload: CreateBriefingPayload = {
        title: title.trim(),
        briefing_type: briefingType,
        client_name: clientName.trim() || undefined,
        objective: objective.trim() || undefined,
        event_date: eventDate || undefined,
        event_time: eventTime || undefined,
        sections: withDefaults ? DEFAULT_SECTIONS[briefingType] : undefined,
      };
      const briefing = await briefingProService.create(payload);
      toast.success("Briefing criado!");
      router.push(`/dashboard/briefing-pro/${briefing.id}`);
    } catch (err) {
      setSaving(false);
      if (isPlanApiError(err)) return; // cota de briefings/mês: modal já aberto
      console.error(err);
      toast.error(apiErrorMessage(err, "Erro ao criar o briefing"));
    }
  }

  async function generateWithAi() {
    const notes = aiText.trim();
    if (!attached && notes.length < 40) {
      toast.error("Descreva o trabalho com mais detalhes (ou anexe o briefing do cliente) para a IA estruturar");
      return;
    }
    setGenerating(true);
    try {
      // fetch direto (em vez do service) para ler o corpo do 403 de plano (créditos de IA)
      const res = await fetch("/api/briefing-pro/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenManager.authHeader() },
        body: JSON.stringify({
          text: notes,
          briefing_type: aiType === "auto" ? undefined : aiType,
          file_text: attached?.text,
          file_name: attached?.name,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && notifyPlanLimit(data)) return;
      if (!res.ok) throw new Error(data?.error || "Erro ao gerar o briefing com IA");
      setPreview(data.briefing as GeneratedBriefingStructure);
      toast.success("Briefing estruturado! Revise antes de salvar.");
      // Material longo condensado/cortado: o usuário precisa saber para conferir
      for (const warning of (data.warnings as string[] | undefined) ?? []) {
        toast.warning(warning, { duration: 8000 });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar com IA");
    } finally {
      setGenerating(false);
    }
  }

  /** Lê o arquivo base no servidor e guarda o texto extraído para a geração. */
  async function handleFile(file: File) {
    const kind = detectFileKind(file.name, file.type);
    if (!kind) {
      toast.error(unsupportedFileMessage(file.name));
      return;
    }
    if (kind !== "image" && file.size > MAX_FILE_BYTES) {
      toast.error(`Arquivo muito grande (máximo ${MAX_FILE_LABEL}). Reduza o arquivo ou cole o texto.`);
      return;
    }
    setExtracting(true);
    try {
      const payload: Blob = kind === "image" ? await prepareImageForOcr(file) : file;
      if (payload.size > MAX_FILE_BYTES) {
        toast.error(`Imagem muito grande mesmo depois de reduzida (máximo ${MAX_FILE_LABEL}).`);
        return;
      }
      const form = new FormData();
      form.append("file", payload, file.name);
      // fetch direto (em vez do service) para ler o corpo do 403 de plano (créditos de IA do OCR)
      const res = await fetch("/api/briefing-pro/extract-file", {
        method: "POST",
        headers: tokenManager.authHeader(),
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && notifyPlanLimit(data)) return;
      if (!res.ok) throw new Error(data?.error || "Não foi possível ler o arquivo");
      const pages = typeof data.pages === "number" ? data.pages : null;
      setAttached({
        name: file.name,
        size: file.size,
        kind,
        text: String(data.text ?? ""),
        chars: Number(data.chars ?? 0),
        pages,
        method: String(data.method ?? ""),
        note: typeof data.note === "string" ? data.note : null,
      });
      setShowExtracted(false);
      toast.success(
        `Arquivo lido: ${Number(data.chars ?? 0).toLocaleString("pt-BR")} caracteres` +
          (pages ? ` em ${pages} página${pages > 1 ? "s" : ""}` : "")
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível ler o arquivo");
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeAttached() {
    setAttached(null);
    setShowExtracted(false);
  }

  async function saveGenerated() {
    if (!preview) return;
    setSaving(true);
    try {
      const briefing = await briefingProService.create(preview);
      toast.success("Briefing criado! Ajuste o que quiser na tela de edição.");
      router.push(`/dashboard/briefing-pro/${briefing.id}`);
    } catch (err) {
      setSaving(false);
      if (isPlanApiError(err)) return; // cota de briefings/mês: modal já aberto
      console.error(err);
      toast.error(apiErrorMessage(err, "Erro ao salvar o briefing"));
    }
  }

  const totalItems = preview?.sections.reduce((acc, s) => acc + s.items.length, 0) ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 gap-2"
          onClick={() =>
            mode === "choose" ? router.push("/dashboard/briefing-pro") : setMode("choose")
          }
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        {mode === "choose" && (
          <>
            <h1 className="text-3xl font-bold mb-2">Novo briefing</h1>
            <p className="text-muted-foreground mb-8">
              Como você quer começar?
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card
                className="cursor-pointer hover:border-rose-500/50 hover:shadow-lg transition-all group"
                onClick={() => setMode("ai")}
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <CardTitle>Criar com IA</CardTitle>
                  <CardDescription>
                    Anexe o briefing que o cliente mandou (PDF, Word ou print), cole o texto ou
                    descreva o trabalho — a IA monta toda a estrutura: seções, checklist, shot
                    list, entregáveis e cronograma.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                    Recomendado
                  </Badge>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:border-rose-500/50 hover:shadow-lg transition-all group"
                onClick={() => setMode("manual")}
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-2xl bg-muted text-foreground flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <PenLine className="h-6 w-6" />
                  </div>
                  <CardTitle>Criar manualmente</CardTitle>
                  <CardDescription>
                    Comece com os dados básicos e uma estrutura sugerida para o tipo de trabalho, e
                    monte cada tópico do seu jeito.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </>
        )}

        {mode === "manual" && (
          <Card>
            <CardHeader>
              <CardTitle>Criar briefing manualmente</CardTitle>
              <CardDescription>
                Só o essencial para começar — tudo pode ser editado depois.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Casamento Ana & Pedro — 15/11"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de trabalho</Label>
                  <Select value={briefingType} onValueChange={(v) => setBriefingType(v as BriefingType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(BRIEFING_TYPE_LABELS) as BriefingType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {BRIEFING_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente / Contratante</Label>
                  <Input
                    id="client"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nome do cliente"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event-date">Data da execução</Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-time">Horário de início</Label>
                  <Input
                    id="event-time"
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="objective">Objetivo</Label>
                <Textarea
                  id="objective"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="O que esse trabalho precisa alcançar?"
                  rows={3}
                />
              </div>
              <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
                <Checkbox
                  checked={withDefaults}
                  onCheckedChange={(v) => setWithDefaults(v === true)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  <span className="font-medium block">Criar estrutura sugerida</span>
                  <span className="text-muted-foreground">
                    Seções prontas para {BRIEFING_TYPE_LABELS[briefingType].toLowerCase()}:{" "}
                    {DEFAULT_SECTIONS[briefingType].map((s) => s.title).join(", ")}.
                  </span>
                </span>
              </label>
              <Button onClick={createManual} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Criar briefing
              </Button>
            </CardContent>
          </Card>
        )}

        {mode === "ai" && !preview && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-rose-500" />
                Criar com IA
              </CardTitle>
              <CardDescription>
                Anexe o briefing que o cliente mandou (PDF, Word, print do WhatsApp ou foto) e/ou
                descreva o trabalho com suas palavras. A IA lê o material, mantém a organização
                original e devolve uma estrutura completa e melhorada. Quanto mais detalhes — datas,
                horários, locais, contatos, exigências — melhor o resultado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de trabalho (opcional)</Label>
                <Select value={aiType} onValueChange={setAiType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Detectar automaticamente</SelectItem>
                    {(Object.keys(BRIEFING_TYPE_LABELS) as BriefingType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {BRIEFING_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Arquivo base (opcional)</Label>
                {!attached ? (
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Anexar arquivo base"
                    onClick={() => !extracting && fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (!extracting) fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file && !extracting) void handleFile(file);
                    }}
                    className={cn(
                      "rounded-lg border-2 border-dashed p-5 text-center transition-colors",
                      extracting ? "cursor-wait opacity-70" : "cursor-pointer",
                      dragOver
                        ? "border-rose-500 bg-rose-50 dark:bg-rose-950/20"
                        : "border-muted-foreground/25 hover:border-rose-500/50 hover:bg-muted/40"
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPT_ATTRIBUTE}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFile(file);
                      }}
                    />
                    {extracting ? (
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Lendo o arquivo...
                      </div>
                    ) : (
                      <>
                        <FileUp className="h-6 w-6 mx-auto mb-2 text-rose-500" />
                        <p className="text-sm font-medium">Anexar o briefing que o cliente mandou</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, Word (.docx), texto ou foto/print (PNG, JPG) · até {MAX_FILE_LABEL}.
                          Arraste aqui ou clique para escolher.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 flex items-center justify-center shrink-0">
                        {attached.kind === "image" ? (
                          <FileImage className="h-4 w-4" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attached.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {FILE_KIND_LABELS[attached.kind]}
                          {attached.pages ? ` · ${attached.pages} página${attached.pages > 1 ? "s" : ""}` : ""}
                          {` · ${formatFileSize(attached.size)}`}
                          {` · ${attached.chars.toLocaleString("pt-BR")} caracteres lidos`}
                          {attached.method === "ocr" ? " (OCR)" : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={removeAttached}
                        aria-label="Remover arquivo"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {attached.note && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">{attached.note}</p>
                    )}
                    <Collapsible open={showExtracted} onOpenChange={setShowExtracted}>
                      <CollapsibleTrigger asChild>
                        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
                          <ChevronDown
                            className={cn("h-3.5 w-3.5 transition-transform", showExtracted && "rotate-180")}
                          />
                          {showExtracted ? "Ocultar texto lido" : "Ver texto lido"}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-muted/50 p-3 text-xs whitespace-pre-wrap font-sans">
                          {attached.text}
                        </pre>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-text">
                  {attached ? "Observações e ajustes (opcional)" : "Descrição do trabalho *"}
                </Label>
                <Textarea
                  id="ai-text"
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  placeholder={attached ? NOTES_PLACEHOLDER : DESCRIPTION_PLACEHOLDER}
                  rows={attached ? 5 : 12}
                  className="resize-y"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {aiText.trim().length} caracteres
                </p>
              </div>
              <Button onClick={generateWithAi} disabled={generating || extracting} className="w-full gap-2">
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Estruturando o briefing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {attached ? "Gerar estrutura a partir do arquivo" : "Gerar estrutura do briefing"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {mode === "ai" && preview && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="outline">{BRIEFING_TYPE_LABELS[preview.briefing_type]}</Badge>
                  {attached && (
                    <Badge variant="outline" className="gap-1 max-w-[240px]">
                      <Paperclip className="h-3 w-3 shrink-0" />
                      <span className="truncate">{attached.name}</span>
                    </Badge>
                  )}
                  {preview.event_date && (
                    <Badge variant="secondary">
                      {preview.event_date.split("-").reverse().join("/")}
                      {preview.event_time ? ` às ${preview.event_time}` : ""}
                    </Badge>
                  )}
                </div>
                <CardTitle>{preview.title}</CardTitle>
                {preview.client_name && (
                  <CardDescription>Cliente: {preview.client_name}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {preview.objective && (
                  <p>
                    <span className="font-medium">Objetivo: </span>
                    {preview.objective}
                  </p>
                )}
                {preview.restrictions && (
                  <p className="text-red-600 dark:text-red-400">
                    <span className="font-medium">Restrições: </span>
                    {preview.restrictions}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    {totalItems} itens em {preview.sections.length} seções
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    {preview.deliverables.length} entregáveis
                  </span>
                  {preview.contacts.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {preview.contacts.length} contatos
                    </span>
                  )}
                  {preview.locations.length > 0 && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {preview.locations.length} locações
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {preview.sections.map((section, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  {section.description && (
                    <CardDescription>{section.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-muted-foreground/50 shrink-0" />
                        <div className="flex-1">
                          <span className="font-medium">{item.title}</span>
                          {item.scheduled_time && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {item.scheduled_time}
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className={`ml-2 text-xs ${PRIORITY_CONFIG[item.priority].className}`}
                          >
                            {PRIORITY_CONFIG[item.priority].label}
                          </Badge>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {ITEM_TYPE_LABELS[item.item_type]}
                          </Badge>
                          {item.is_required && (
                            <Badge variant="secondary" className="ml-2 text-xs gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              <Lock className="h-3 w-3" />
                              Obrigatório
                            </Badge>
                          )}
                          {item.description && (
                            <p className="text-muted-foreground mt-0.5">{item.description}</p>
                          )}
                          {(item.subitems?.length ?? 0) > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {item.subitems!.map((sub, si) => (
                                <li key={si} className="flex items-center gap-1.5 text-xs text-muted-foreground pl-2">
                                  <CornerDownRight className="h-3 w-3 shrink-0" />
                                  {sub.title}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}

            {preview.deliverables.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Entregáveis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {preview.deliverables.map((del, i) => (
                      <li key={i} className="text-sm border-l-2 border-rose-200 dark:border-rose-800 pl-3">
                        <span className="font-medium">
                          {del.quantity > 1 ? `${del.quantity}x ` : ""}
                          {del.title}
                        </span>
                        {del.specs && <p className="text-muted-foreground">{del.specs}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {del.due_date && `Prazo: ${del.due_date.split("-").reverse().join("/")}`}
                          {del.deliver_to && ` · Para: ${del.deliver_to}`}
                          {del.delivery_method && ` · Via: ${del.delivery_method}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pb-8">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => setPreview(null)}
                disabled={saving}
              >
                <RefreshCw className="h-4 w-4" />
                Ajustar e gerar de novo
              </Button>
              <Button className="flex-1 gap-2" onClick={saveGenerated} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar briefing
              </Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
