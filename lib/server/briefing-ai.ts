// Helpers compartilhados das rotas de IA do Briefing Pro
// (generate e refine-section): limpeza/validação da resposta do modelo,
// normalização de seções para o shape aceito pelo backend, montagem do
// bloco-fonte (texto livre + arquivo base) e condensação de documentos longos.

import { callGroqText, GROQ_FAST_MODEL, GROQ_TPM_BUDGET } from "./groq";

export const BRIEFING_TYPES = ["photography", "video", "social_media", "marketing", "event", "other"];
export const BRIEFING_ITEM_TYPES = ["task", "photo", "video", "material", "note"];
export const BRIEFING_PRIORITIES = ["low", "medium", "high"];

export interface RawGeneratedItem {
  title?: string;
  description?: string;
  item_type?: string;
  priority?: string;
  scheduled_time?: string;
  is_required?: boolean;
  subitems?: Array<{ title?: string } | string>;
}

export interface RawGeneratedSection {
  title?: string;
  description?: string;
  items?: RawGeneratedItem[];
}

export interface NormalizedSection {
  title: string;
  description?: string;
  items: Array<{
    title: string;
    description?: string;
    item_type: string;
    priority: string;
    scheduled_time?: string;
    is_required: boolean;
    subitems: Array<{ title: string }>;
  }>;
}

export function cleanString(value: unknown, max = 4000): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

export function cleanEnum(value: unknown, allowed: string[], fallback: string): string {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}

export function cleanDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : undefined;
}

export function cleanTime(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return undefined;
  const hours = Math.min(23, parseInt(match[1], 10));
  return `${String(hours).padStart(2, "0")}:${match[2]}`;
}

/** Normaliza seções vindas da IA (com itens, subitens e is_required). */
export function normalizeSections(raw: RawGeneratedSection[] | unknown): NormalizedSection[] {
  return (Array.isArray(raw) ? raw : [])
    .slice(0, 12)
    .map((section: RawGeneratedSection) => ({
      title: cleanString(section?.title, 200) ?? "Seção",
      description: cleanString(section?.description, 1000),
      items: (Array.isArray(section?.items) ? section.items : [])
        .slice(0, 40)
        .map((item) => ({
          title: cleanString(item?.title, 500) ?? "Item",
          description: cleanString(item?.description, 2000),
          item_type: cleanEnum(item?.item_type, BRIEFING_ITEM_TYPES, "task"),
          priority: cleanEnum(item?.priority, BRIEFING_PRIORITIES, "medium"),
          scheduled_time: cleanTime(item?.scheduled_time),
          is_required: item?.is_required === true,
          subitems: (Array.isArray(item?.subitems) ? item.subitems : [])
            .slice(0, 12)
            .map((sub) => ({
              title: cleanString(typeof sub === "string" ? sub : sub?.title, 300) ?? "",
            }))
            .filter((sub) => sub.title),
        }))
        .filter((item) => item.title !== "Item" || item.description),
    }))
    .filter((section) => section.items.length > 0 || section.description);
}

/** Formato JSON dos itens, compartilhado nos prompts das duas rotas. */
export const ITEM_JSON_FORMAT = `{
  "title": "item específico e acionável",
  "description": "detalhes de como executar / o que não pode faltar",
  "item_type": "um de: task | photo | video | material | note",
  "priority": "um de: low | medium | high",
  "scheduled_time": "HH:MM apenas para itens de cronograma",
  "is_required": "true apenas para itens CRÍTICOS que não podem ser pulados de forma alguma (momentos únicos, exigências explícitas do cliente)",
  "subitems": [{ "title": "parte menor do item, quando ele merece ser destrinchado (ex: item 'Conferir equipamentos' → subitens 'Baterias carregadas', 'Cartões formatados', 'Lente reserva')" }]
}`;

// ─── Arquivo base (documento que o cliente mandou) ──────────────────────────

export interface BriefingSourceInput {
  /** Texto livre digitado pelo usuário (descrição ou observações). */
  notes?: string;
  /** Texto extraído do arquivo base (PDF, DOCX, imagem via OCR). */
  fileText?: string;
  fileName?: string;
}

/** Bloco-fonte do prompt: documento base + observações, ou só o texto livre. */
export function buildSourceBlock(input: BriefingSourceInput): string {
  const notes = input.notes?.trim() ?? "";
  const fileText = input.fileText?.trim() ?? "";
  if (!fileText) {
    return `TEXTO DO BRIEFING (fornecido pelo usuário):\n"""\n${notes}\n"""`;
  }
  const label = input.fileName ? ` (arquivo "${input.fileName}")` : "";
  const parts = [
    `DOCUMENTO BASE enviado pelo usuário${label} — texto extraído automaticamente, pode ter ruído de formatação:\n"""\n${fileText}\n"""`,
  ];
  if (notes) {
    parts.push(
      `OBSERVAÇÕES E INSTRUÇÕES ADICIONAIS DO USUÁRIO (têm prioridade sobre o documento em caso de conflito):\n"""\n${notes}\n"""`
    );
  }
  return parts.join("\n\n");
}

/** Regras extras do prompt quando há documento base: estrutura semelhante, conteúdo melhorado. */
export const DOCUMENT_RULES = `COMO USAR O DOCUMENTO BASE:
1. A organização do documento é a espinha dorsal do briefing: cada bloco, etapa ou tópico dele vira uma seção (ou item) correspondente, na mesma ordem lógica e com nomes reconhecíveis para quem leu o original.
2. Preserve TODOS os dados factuais do documento (datas, horários, locais, nomes, contatos, quantidades, prazos, valores, proibições) exatamente como estão — não altere, não arredonde, não omita.
3. Melhore sem descaracterizar: complete lacunas com itens de melhor prática do tipo de trabalho, destrinche itens vagos em subitens acionáveis, converta horários citados em cronograma (scheduled_time) e marque como obrigatório (is_required) o que o documento trata como exigência do cliente.
4. Informação do documento que não vira seção nem item (regras, avisos, contexto, referências) vai para "notes" ou "restrictions" — nada do documento pode se perder.
5. O que você acrescentar por conta própria precisa ser claramente útil na execução; não infle o briefing com obviedades.`;

/** Texto-fonte gravado em briefings.source_text (rastreia de onde a IA tirou cada informação). */
export function composeSourceText(input: BriefingSourceInput): string {
  const notes = input.notes?.trim() ?? "";
  const fileText = input.fileText?.trim() ?? "";
  if (!fileText) return notes;
  const header = `[Arquivo base: ${input.fileName?.trim() || "documento"}]`;
  const body = `${header}\n\n${fileText}`;
  return notes ? `${body}\n\n[Observações do usuário]\n\n${notes}` : body;
}

// ─── Condensação de documentos longos ───────────────────────────────────────
//
// O tier gratuito da Groq limita tokens por minuto; um documento de várias
// páginas não cabe no prompt de geração ao lado da resposta. Quando o texto
// passa do orçamento, um modelo leve (bucket próprio de tokens) condensa o
// documento preservando fatos e a ordem dos tópicos, e só então a geração roda.

/** Máximo de texto que a condensação aceita (o excedente é descartado, com aviso). */
export const CONDENSE_INPUT_MAX_CHARS = (GROQ_TPM_BUDGET - 2600) * 3; // ≈ 14.700

const CONDENSE_SYSTEM_PROMPT = `Você prepara documentos de briefing (fotografia, vídeo, eventos, marketing, social media) para serem estruturados por outra IA. Sua tarefa é CONDENSAR o documento sem perder informação útil.

Regras:
- Preserve TODOS os fatos: datas, horários, locais, endereços, nomes, papéis, telefones, e-mails, quantidades, prazos, valores, exigências e proibições — exatamente como estão.
- Mantenha a ordem e os títulos/tópicos originais do documento (use-os como títulos de bloco), com os fatos em bullets curtos.
- Remova apenas repetições, formalidades, formatação quebrada e texto sem relação com a execução do trabalho.
- Escreva em português do Brasil, sem introdução, sem comentários e sem conclusão — só o conteúdo condensado.`;

/** Condensa um documento longo para caber no prompt de geração. */
export async function condenseDocument(
  text: string,
  options: { fileName?: string; targetChars: number }
): Promise<string> {
  const input = text.slice(0, CONDENSE_INPUT_MAX_CHARS);
  const label = options.fileName ? ` (arquivo "${options.fileName}")` : "";
  const condensed = await callGroqText({
    model: GROQ_FAST_MODEL,
    systemPrompt: CONDENSE_SYSTEM_PROMPT,
    userPrompt: `Condense o documento abaixo em no máximo ${options.targetChars} caracteres.\n\nDOCUMENTO${label}:\n"""\n${input}\n"""`,
    temperature: 0.2,
    maxTokens: Math.min(2600, Math.ceil(options.targetChars / 2.5) + 200),
    retries: 1,
    hideReasoning: true,
    reasoningEffort: "low",
  });
  return condensed.trim();
}
