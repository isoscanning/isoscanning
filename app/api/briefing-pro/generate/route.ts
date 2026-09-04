// Briefing Pro — geração de estrutura de briefing com IA.
//
// Recebe um texto livre (o "briefing bruto" que o cliente/contratante mandou,
// ou uma descrição do trabalho) e/ou o texto extraído de um arquivo base
// (/api/briefing-pro/extract-file) e devolve a estrutura completa pronta para
// o usuário revisar e salvar: dados gerais, seções com itens (checklist/shot
// list), entregáveis com specs e prazos, contatos e locações.
//
// Com arquivo base, a IA usa a organização do documento como espinha dorsal e
// devolve uma estrutura semelhante e melhorada (lacunas preenchidas, itens
// destrinchados, cronograma, obrigatórios). Documentos longos passam antes por
// uma condensação com o modelo leve — ver fitToBudget.
// A resposta segue exatamente o shape do CreateBriefingDto do backend.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, consumeAiCredits } from "@/lib/server/api-auth";
import { callGroqJson, GroqError } from "@/lib/server/groq";
import {
  BRIEFING_TYPES,
  CONDENSE_INPUT_MAX_CHARS,
  DOCUMENT_RULES,
  ITEM_JSON_FORMAT,
  RawGeneratedSection,
  buildSourceBlock,
  cleanDate,
  cleanEnum,
  cleanString,
  cleanTime,
  composeSourceText,
  condenseDocument,
  normalizeSections,
} from "@/lib/server/briefing-ai";
import { MAX_EXTRACTED_CHARS, MIN_USEFUL_CHARS } from "@/lib/briefing-pro-file";

export const maxDuration = 60;

// Orçamento do bloco-fonte no prompt: no tier gratuito da Groq (8k tokens/min)
// um prompt muito grande espreme o espaço da resposta — 10k chars ≈ 3,3k tokens.
const MAX_PROMPT_SOURCE_CHARS = 10000;
/** Observações do usuário quando há arquivo (o documento precisa do resto do orçamento). */
const MAX_NOTES_WITH_FILE_CHARS = 3000;
/** Folga para os rótulos do bloco-fonte. */
const SOURCE_BLOCK_OVERHEAD = 400;

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

interface GenerateRequestBody {
  text?: string;
  briefing_type?: string;
  /** Texto extraído do arquivo base (vem de /extract-file). */
  file_text?: string;
  file_name?: string;
}

const SYSTEM_PROMPT = `Você é um produtor executivo sênior especializado em transformar briefings bagunçados em planos de trabalho impecáveis. Você já produziu casamentos, campanhas de marketing, produções audiovisuais, ensaios fotográficos e gestão de social media, e conhece as dores de quem executa no dia: informação faltando, horário indefinido, material perdido e checklist inexistente.

Sua tarefa: ler o material do usuário (texto livre e/ou documento base enviado pelo cliente) e estruturar um briefing profissional completo em JSON.

Regras:
- Responda SOMENTE com um objeto JSON válido, sem texto fora dele.
- Escreva todo o conteúdo em português do Brasil.
- Extraia TUDO que o material contém (datas, horários, nomes, telefones, endereços, exigências) e distribua nos campos certos. Não invente dados pessoais que não estão no material.
- Onde o material for omisso em algo importante para a execução, CRIE itens e seções sugeridos com base na melhor prática do tipo de trabalho (ex.: shot list para fotografia, cronograma do dia, conferência de equipamento, backup de cartões, aprovação de roteiro). Sugestões devem ser acionáveis e específicas.
- Para trabalhos com dia de execução (evento, ensaio, filmagem), inclua uma seção de cronograma do dia com scheduled_time (formato HH:MM) nos itens sempre que possível, e uma seção de preparação/checklist prévio.
- Entregáveis devem ter specs técnicas concretas (formato, resolução, quantidade, prazo) quando o tipo de trabalho permitir inferir.
- Quando houver um DOCUMENTO BASE, siga à risca as instruções "COMO USAR O DOCUMENTO BASE".`;

function buildUserPrompt(sourceBlock: string, hasDocument: boolean, hintType?: string): string {
  return `${sourceBlock}
${hintType ? `\nTipo de trabalho indicado pelo usuário: ${hintType}` : ""}
${hasDocument ? `\n${DOCUMENT_RULES}\n` : ""}
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

function formatChars(n: number): string {
  return `${Math.round(n / 1000)} mil caracteres`;
}

/**
 * Faz o texto caber no orçamento do prompt: passa direto se couber; se não,
 * condensa com o modelo leve e, como último recurso, corta. Os avisos vão
 * para o front, que mostra ao usuário o que aconteceu com o material.
 */
async function fitToBudget(
  text: string,
  budget: number,
  warnings: string[],
  fileName?: string
): Promise<string> {
  if (text.length <= budget) return text;

  if (text.length > CONDENSE_INPUT_MAX_CHARS) {
    warnings.push(
      `O material é longo: só os primeiros ${formatChars(CONDENSE_INPUT_MAX_CHARS)} foram considerados.`
    );
  }

  try {
    const condensed = await condenseDocument(text, {
      fileName,
      targetChars: Math.min(budget, 6000),
    });
    if (condensed.length >= MIN_USEFUL_CHARS) {
      warnings.push(
        "O material era longo demais para a IA ler inteiro e foi condensado antes da estruturação. Confira se nada importante ficou de fora."
      );
      return condensed.slice(0, budget);
    }
  } catch (err) {
    console.warn("[briefing-pro/generate] condensação falhou, cortando o texto:", err);
  }

  warnings.push(
    `O material é longo e não pôde ser condensado: só os primeiros ${formatChars(budget)} foram usados.`
  );
  return text.slice(0, budget);
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

  let body: GenerateRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const notesRaw = (typeof body.text === "string" ? body.text : "").trim();
  const fileTextRaw = (typeof body.file_text === "string" ? body.file_text : "")
    .trim()
    .slice(0, MAX_EXTRACTED_CHARS);
  const fileName = cleanString(body.file_name, 200);
  const hasFile = fileTextRaw.length > 0;

  if (hasFile && fileTextRaw.length < MIN_USEFUL_CHARS) {
    return NextResponse.json(
      { error: "O texto lido do arquivo está vazio. Envie o arquivo de novo ou cole o conteúdo." },
      { status: 400 }
    );
  }
  if (!hasFile && notesRaw.length < 40) {
    return NextResponse.json(
      { error: "Descreva o trabalho com mais detalhes (mínimo ~40 caracteres) ou anexe o briefing do cliente para a IA estruturar." },
      { status: 400 }
    );
  }

  // Plano: debita créditos de IA (após validar a entrada, antes da Groq)
  const denied = await consumeAiCredits(auth, "briefing-generate");
  if (denied) return denied;

  const warnings: string[] = [];
  let notes = notesRaw;
  let fileText = fileTextRaw;

  if (hasFile) {
    if (notes.length > MAX_NOTES_WITH_FILE_CHARS) {
      notes = notes.slice(0, MAX_NOTES_WITH_FILE_CHARS);
      warnings.push("As observações foram encurtadas para caber no limite da IA.");
    }
    fileText = await fitToBudget(
      fileText,
      MAX_PROMPT_SOURCE_CHARS - notes.length - SOURCE_BLOCK_OVERHEAD,
      warnings,
      fileName
    );
  } else {
    // Texto colado muito longo: antes era cortado em silêncio, agora é condensado.
    notes = await fitToBudget(notes, MAX_PROMPT_SOURCE_CHARS, warnings);
  }

  const sourceBlock = buildSourceBlock({
    notes,
    fileText: hasFile ? fileText : undefined,
    fileName,
  });

  try {
    const parsed = await callGroqJson<GeneratedBriefing>({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(sourceBlock, hasFile, body.briefing_type),
      temperature: 0.6,
      maxTokens: 8192,
      retries: 1,
    });

    // source_text guarda o material ORIGINAL (não o condensado): é o rastro
    // de onde a IA tirou cada informação.
    const briefing = normalize(
      parsed,
      composeSourceText({ notes: notesRaw, fileText: hasFile ? fileTextRaw : undefined, fileName })
    );

    if (briefing.sections.length === 0) {
      return NextResponse.json(
        { error: "A IA não conseguiu estruturar o briefing. Tente detalhar melhor o texto." },
        { status: 422 }
      );
    }

    return NextResponse.json({ briefing, warnings });
  } catch (err) {
    console.error("[briefing-pro/generate]", err);
    const status = err instanceof GroqError ? err.status : 500;
    const message =
      err instanceof GroqError ? err.message : "Erro ao gerar o briefing com IA";
    return NextResponse.json({ error: message }, { status });
  }
}
