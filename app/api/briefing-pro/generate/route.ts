// Briefing Pro — geração de estrutura de briefing com IA.
//
// Recebe um texto livre (o "briefing bruto" que o cliente/contratante mandou,
// ou uma descrição do trabalho) e devolve a estrutura completa pronta para o
// usuário revisar e salvar: dados gerais, seções com itens (checklist/shot
// list), entregáveis com specs e prazos, contatos e locações.
// A resposta segue exatamente o shape do CreateBriefingDto do backend.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, consumeAiCredits } from "@/lib/server/api-auth";
import { callGroqJson, GroqError } from "@/lib/server/groq";
import {
  BRIEFING_TYPES,
  ITEM_JSON_FORMAT,
  RawGeneratedSection,
  cleanDate,
  cleanEnum,
  cleanString,
  cleanTime,
  normalizeSections,
} from "@/lib/server/briefing-ai";

interface GeneratedDeliverable {
  title?: string;
  description?: string;
  specs?: string;
  quantity?: number;
  due_date?: string;
  deliver_to?: string;
  delivery_method?: string;
}

interface GeneratedBriefing {
  title?: string;
  briefing_type?: string;
  client_name?: string;
  objective?: string;
  target_audience?: string;
  tone?: string;
  restrictions?: string;
  notes?: string;
  event_date?: string;
  event_time?: string;
  contacts?: Array<{ name?: string; role?: string; phone?: string; email?: string; notes?: string }>;
  locations?: Array<{ name?: string; address?: string; map_url?: string; notes?: string }>;
  sections?: RawGeneratedSection[];
  deliverables?: GeneratedDeliverable[];
}

const SYSTEM_PROMPT = `Você é um produtor executivo sênior especializado em transformar briefings bagunçados em planos de trabalho impecáveis. Você já produziu casamentos, campanhas de marketing, produções audiovisuais, ensaios fotográficos e gestão de social media, e conhece as dores de quem executa no dia: informação faltando, horário indefinido, material perdido e checklist inexistente.

Sua tarefa: ler o texto do usuário e estruturar um briefing profissional completo em JSON.

Regras:
- Responda SOMENTE com um objeto JSON válido, sem texto fora dele.
- Escreva todo o conteúdo em português do Brasil.
- Extraia TUDO que o texto contém (datas, horários, nomes, telefones, endereços, exigências) e distribua nos campos certos. Não invente dados pessoais que não estão no texto.
- Onde o texto for omisso em algo importante para a execução, CRIE itens e seções sugeridos com base na melhor prática do tipo de trabalho (ex.: shot list para fotografia, cronograma do dia, conferência de equipamento, backup de cartões, aprovação de roteiro). Sugestões devem ser acionáveis e específicas.
- Para trabalhos com dia de execução (evento, ensaio, filmagem), inclua uma seção de cronograma do dia com scheduled_time (formato HH:MM) nos itens sempre que possível, e uma seção de preparação/checklist prévio.
- Entregáveis devem ter specs técnicas concretas (formato, resolução, quantidade, prazo) quando o tipo de trabalho permitir inferir.`;

function buildUserPrompt(sourceText: string, hintType?: string): string {
  return `TEXTO DO BRIEFING (fornecido pelo usuário):
"""
${sourceText}
"""
${hintType ? `\nTipo de trabalho indicado pelo usuário: ${hintType}` : ""}

Devolva o JSON EXATAMENTE neste formato:
{
  "title": "título curto do trabalho",
  "briefing_type": "um de: photography | video | social_media | marketing | event | other",
  "client_name": "nome do cliente/contratante se houver",
  "objective": "objetivo do trabalho em 1-3 frases",
  "target_audience": "público-alvo se aplicável",
  "tone": "tom/estilo desejado (ex: cinematográfico, documental, clean)",
  "restrictions": "restrições e cuidados (o que NÃO fazer, pessoas sensíveis, proibições)",
  "notes": "observações gerais importantes que não couberam nos outros campos",
  "event_date": "YYYY-MM-DD se houver data de execução",
  "event_time": "HH:MM se houver horário de início",
  "contacts": [{ "name": "...", "role": "papel (noiva, cerimonialista, diretor...)", "phone": "...", "email": "...", "notes": "..." }],
  "locations": [{ "name": "...", "address": "...", "map_url": "", "notes": "estacionamento, acesso, energia..." }],
  "sections": [
    {
      "title": "nome da seção (ex: Preparação, Cronograma do Dia, Shot List, Pós-produção)",
      "description": "para que serve a seção",
      "items": [
        ${ITEM_JSON_FORMAT}
      ]
    }
  ],
  "deliverables": [
    {
      "title": "entregável (ex: 30 fotos editadas em alta)",
      "description": "detalhes",
      "specs": "specs técnicas (formato, resolução, aspect ratio, duração)",
      "quantity": 1,
      "due_date": "YYYY-MM-DD se houver prazo",
      "deliver_to": "para quem entregar",
      "delivery_method": "onde/como entregar (link Drive, e-mail, HD...)"
    }
  ]
}

Gere entre 3 e 7 seções, com itens suficientes para cobrir preparação, execução e finalização do trabalho. Campos sem informação e sem sugestão útil podem ficar como string vazia ou serem omitidos.`;
}

/** Normaliza a resposta da IA para o shape aceito pelo backend. */
function normalize(parsed: GeneratedBriefing, sourceText: string) {
  const sections = normalizeSections(parsed.sections);

  const deliverables = (Array.isArray(parsed.deliverables) ? parsed.deliverables : [])
    .slice(0, 25)
    .map((del) => ({
      title: cleanString(del?.title, 300) ?? "",
      description: cleanString(del?.description, 2000),
      specs: cleanString(del?.specs, 1000),
      quantity:
        typeof del?.quantity === "number" && del.quantity >= 1
          ? Math.floor(del.quantity)
          : 1,
      due_date: cleanDate(del?.due_date),
      deliver_to: cleanString(del?.deliver_to, 300),
      delivery_method: cleanString(del?.delivery_method, 500),
    }))
    .filter((del) => del.title);

  const contacts = (Array.isArray(parsed.contacts) ? parsed.contacts : [])
    .slice(0, 20)
    .map((c) => ({
      name: cleanString(c?.name, 200) ?? "",
      role: cleanString(c?.role, 200),
      phone: cleanString(c?.phone, 50),
      email: cleanString(c?.email, 200),
      notes: cleanString(c?.notes, 500),
    }))
    .filter((c) => c.name);

  const locations = (Array.isArray(parsed.locations) ? parsed.locations : [])
    .slice(0, 10)
    .map((l) => ({
      name: cleanString(l?.name, 200) ?? "",
      address: cleanString(l?.address, 500),
      map_url: cleanString(l?.map_url, 500),
      notes: cleanString(l?.notes, 500),
    }))
    .filter((l) => l.name);

  return {
    title: cleanString(parsed.title, 300) ?? "Briefing sem título",
    briefing_type: cleanEnum(parsed.briefing_type, BRIEFING_TYPES, "other"),
    client_name: cleanString(parsed.client_name, 300),
    objective: cleanString(parsed.objective),
    target_audience: cleanString(parsed.target_audience),
    tone: cleanString(parsed.tone, 500),
    restrictions: cleanString(parsed.restrictions),
    notes: cleanString(parsed.notes),
    event_date: cleanDate(parsed.event_date),
    event_time: cleanTime(parsed.event_time),
    contacts,
    locations,
    sections,
    deliverables,
    ai_generated: true,
    source_text: sourceText.slice(0, 20000),
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: { text?: string; briefing_type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const sourceText = (body.text ?? "").trim();
  if (sourceText.length < 40) {
    return NextResponse.json(
      { error: "Descreva o trabalho com mais detalhes (mínimo ~40 caracteres) para a IA estruturar o briefing." },
      { status: 400 }
    );
  }

  // Plano: debita créditos de IA (após validar a entrada, antes da Groq)
  const denied = await consumeAiCredits(auth, "briefing-generate");
  if (denied) return denied;

  try {
    const parsed = await callGroqJson<GeneratedBriefing>({
      systemPrompt: SYSTEM_PROMPT,
      // Cap do texto: no tier gratuito da Groq (8k tokens/min) um prompt muito
      // grande esprene o espaço da resposta — 10k chars ≈ 3k tokens de entrada.
      userPrompt: buildUserPrompt(sourceText.slice(0, 10000), body.briefing_type),
      temperature: 0.6,
      maxTokens: 8192,
      retries: 1,
    });

    const briefing = normalize(parsed, sourceText);

    if (briefing.sections.length === 0) {
      return NextResponse.json(
        { error: "A IA não conseguiu estruturar o briefing. Tente detalhar melhor o texto." },
        { status: 422 }
      );
    }

    return NextResponse.json({ briefing });
  } catch (err) {
    console.error("[briefing-pro/generate]", err);
    const status = err instanceof GroqError ? err.status : 500;
    const message =
      err instanceof GroqError ? err.message : "Erro ao gerar o briefing com IA";
    return NextResponse.json({ error: message }, { status });
  }
}
