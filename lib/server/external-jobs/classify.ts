// IA das vagas externas (SQL 83) — SOMENTE servidor.
//
// 1. classifyJobs: a rotina manda lotes pequenos ao modelo leve, que diz se a
//    vaga é do audiovisual (nota 0–100), em qual especialidade cai e separa
//    cidade/UF do texto de local da origem.
// 2. extractJobDraft: o admin cola o texto de uma vaga (grupo de WhatsApp,
//    post do Instagram...) e o modelo principal devolve os campos preenchidos.

import { callGroqJson, GROQ_FAST_MODEL, GROQ_MODEL } from "@/lib/server/groq";
import type { ExternalJobDraft, ExternalJobType } from "@/lib/external-jobs/types";
import { normalizeJobType, normalizeUf, safeUrl, truncate } from "./normalize";

/** Lote por chamada: cabe folgado no orçamento de tokens/minuto do tier grátis. */
export const CLASSIFY_BATCH_SIZE = 8;

export interface ClassifyInput {
  title: string;
  companyName: string | null;
  locationText: string | null;
  jobTypeHint: ExternalJobType | null;
  description: string | null;
}

export interface Classification {
  score: number;
  category: string | null;
  jobType: ExternalJobType | null;
  city: string | null;
  state: string | null;
  isRemote: boolean;
  reason: string | null;
}

// O nicho é o conjunto de especialidades que o IsoScanning oferece (tabela
// specialties): categoria nova cadastrada lá passa a valer aqui sozinha.
function nicheText(categories: string[]): string {
  return `Nicho do IsoScanning: profissionais de serviços CRIATIVOS e DIGITAIS — qualquer uma destas
especialidades oferecidas pela plataforma: ${categories.join(", ")}. Inclui fotografia (eventos,
casamento, ensaio, produto, cobertura), vídeo (captação, gravação, edição), drone, produção
audiovisual, social media, design, motion, ilustração, web e programação.`;
}

const SCORE_RULES = `Nota (0–100) de aderência ao nicho:
- 80–100: o trabalho principal é exercer uma das especialidades da lista (CLT, freela ou por job).
- 50–79: uma das especialidades é parte relevante da vaga, mas divide espaço com outras funções.
- 0–49: fora do nicho (vendas/representação, venda de equipamento, CFTV/segurança, radiologia e exames
  de imagem, atendimento, logística, ou vaga genérica sem relação com as especialidades).`;

function pickCategory(value: unknown, categories: string[]): string | null {
  if (typeof value !== "string") return null;
  const wanted = value.trim().toLowerCase();
  return categories.find((c) => c.toLowerCase() === wanted) ?? null;
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
}

function cleanText(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() ? truncate(value.trim(), max) : null;
}

export async function classifyJobs(items: ClassifyInput[], categories: string[]): Promise<Classification[]> {
  if (items.length === 0) return [];

  const payload = items.map((item, i) => ({
    i,
    titulo: item.title,
    empresa: item.companyName,
    local: item.locationText,
    tipo: item.jobTypeHint,
    descricao: truncate(item.description, 350),
  }));

  const systemPrompt = `Você classifica vagas de emprego/freela para uma plataforma brasileira.
${nicheText(categories)}

${SCORE_RULES}

Para CADA vaga devolva:
- "i": o mesmo índice recebido
- "score": inteiro 0–100
- "category": EXATAMENTE um destes nomes, ou null se nenhum servir: ${JSON.stringify(categories)}
- "job_type": "freelance" | "full_time" | "part_time" | "project" | null
- "city": cidade (sem UF) ou null; "state": sigla da UF ou null; "is_remote": boolean
- "reason": até 12 palavras justificando a nota

Responda só JSON: {"results": [ ... ]}`;

  const data = await callGroqJson<{ results?: Array<Record<string, unknown>> }>({
    model: GROQ_FAST_MODEL,
    systemPrompt,
    userPrompt: JSON.stringify(payload),
    temperature: 0.1,
    maxTokens: 1600,
    reasoningEffort: "low",
    retries: 2,
  });

  const byIndex = new Map<number, Record<string, unknown>>();
  for (const row of data.results ?? []) {
    const i = Number(row.i);
    if (Number.isInteger(i)) byIndex.set(i, row);
  }

  return items.map((item, i) => {
    const row = byIndex.get(i);
    // Sem resposta para o item: nota 0 manda para "oculta", nunca publica às cegas
    if (!row) {
      return { score: 0, category: null, jobType: item.jobTypeHint, city: null, state: null, isRemote: false, reason: "sem resposta da IA" };
    }
    return {
      score: clampScore(row.score),
      category: pickCategory(row.category, categories),
      jobType: normalizeJobType(row.job_type) ?? item.jobTypeHint,
      city: cleanText(row.city, 80),
      state: normalizeUf(row.state),
      isRemote: row.is_remote === true,
      reason: cleanText(row.reason, 160),
    };
  });
}

export async function extractJobDraft(text: string, categories: string[]): Promise<ExternalJobDraft> {
  const systemPrompt = `Você extrai os dados de UMA vaga de trabalho a partir de um texto colado
(mensagem de grupo de WhatsApp, post de Instagram, e-mail). ${nicheText(categories)}

Não invente nada: campo ausente no texto = null. Responda só JSON com:
{
  "title": título curto e claro da vaga (ex.: "Fotógrafo para casamento em Campinas"),
  "company_name": quem contrata ou null,
  "description": a vaga reescrita em português claro, com data, horário, local, entregáveis e
                 requisitos que estiverem no texto (sem telefone/e-mail — esses vão em apply_contact),
  "city": cidade ou null, "state": sigla da UF ou null, "is_remote": boolean,
  "job_type": "freelance" | "full_time" | "part_time" | "project" | null,
  "category": EXATAMENTE um destes nomes ou null: ${JSON.stringify(categories)},
  "salary_text": valor/cachê como aparece no texto ou null,
  "external_url": link para se candidatar, se houver, ou null,
  "apply_contact": como se candidatar quando não há link (ex.: "WhatsApp (11) 99999-0000", "e-mail fulano@x.com") ou null
}`;

  const data = await callGroqJson<Record<string, unknown>>({
    model: GROQ_MODEL,
    systemPrompt,
    userPrompt: text.slice(0, 6000),
    temperature: 0.2,
    maxTokens: 1500,
    reasoningEffort: "low",
  });

  return {
    title: cleanText(data.title, 140) ?? "Vaga de audiovisual",
    companyName: cleanText(data.company_name, 120),
    description: cleanText(data.description, 4000),
    city: cleanText(data.city, 80),
    state: normalizeUf(data.state),
    isRemote: data.is_remote === true,
    jobType: normalizeJobType(data.job_type),
    category: pickCategory(data.category, categories),
    salaryText: cleanText(data.salary_text, 120),
    externalUrl: safeUrl(data.external_url),
    applyContact: cleanText(data.apply_contact, 200),
  };
}
