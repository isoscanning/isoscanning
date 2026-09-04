// Cliente compartilhado da Groq para as rotas de IA (social media e Briefing Pro).
// Centraliza modelo/parâmetros e adiciona resiliência: retry em falhas
// transitórias e extração robusta de JSON da resposta do modelo.

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// ATENÇÃO: a Groq descontinua modelos periodicamente. Se as rotas de IA
// começarem a retornar 500 com 404 da Groq, confira o catálogo atual em
// GET https://api.groq.com/openai/v1/models e atualize estas constantes.
// (llama-3.3-70b-versatile foi descontinuado em 2026; migrado para gpt-oss-120b.)
export const GROQ_MODEL = "openai/gpt-oss-120b";

// Sistema agêntico da Groq com busca web nativa — usado para pesquisar
// contas/empresas na internet (anamnese). Não suporta response_format,
// então chamadas com ele devem usar jsonMode: false.
export const GROQ_SEARCH_MODEL = "groq/compound-mini";

// Modelo multimodal (texto + imagem): o único do catálogo atual que aceita
// `image_url` (os Llama 4 Scout/Maverick saíram do catálogo). Usado no OCR de
// fotos e prints de briefing. Verificado em 2026-09-04.
export const GROQ_VISION_MODEL = "qwen/qwen3.6-27b";

// Modelo leve para pré-processamento (condensar documentos longos antes da
// geração). Cada modelo tem bucket PRÓPRIO de tokens/minuto na Groq, então
// usar um modelo diferente do principal dá uma "segunda cota" quando um fluxo
// precisa de duas chamadas no mesmo minuto.
export const GROQ_FAST_MODEL = "openai/gpt-oss-20b";

export type GroqTextPart = { type: "text"; text: string };
export type GroqImagePart = { type: "image_url"; image_url: { url: string } };
/** Conteúdo da mensagem do usuário: texto simples ou partes multimodais. */
export type GroqUserContent = string | Array<GroqTextPart | GroqImagePart>;

export interface GroqChatOptions {
  systemPrompt?: string;
  /** Texto do usuário, ou partes multimodais (texto + imagens em data URL). */
  userPrompt: GroqUserContent;
  temperature?: number;
  maxTokens?: number;
  /** Tentativas extras em caso de erro transitório ou resposta inválida (padrão: 1) */
  retries?: number;
  /** Modelo a usar (padrão: GROQ_MODEL) */
  model?: string;
  /** Oculta o raciocínio de modelos "thinking" (qwen3, gpt-oss): só a resposta final volta. */
  hideReasoning?: boolean;
  /**
   * Esforço de raciocínio: gpt-oss aceita low | medium | high; nos qwen3
   * "none" desliga o "thinking" (que conta como tokens de saída).
   */
  reasoningEffort?: "none" | "low" | "medium" | "high";
}

export interface GroqJsonOptions extends GroqChatOptions {
  systemPrompt: string;
  /** Envia response_format json_object (padrão: true; desligue em modelos compound) */
  jsonMode?: boolean;
}

export class GroqError extends Error {
  constructor(message: string, public status: number = 500) {
    super(message);
    this.name = "GroqError";
  }
}

// Tier gratuito da Groq: ~8.000 tokens por MINUTO por modelo, e o max_tokens
// pedido conta no limite antes mesmo da geração. Clampamos o max_tokens para
// prompt + saída caberem no orçamento — senão a API rejeita com 413 na hora.
// Exportado para as rotas dimensionarem seus cortes de texto a partir dele.
export const GROQ_TPM_BUDGET = 7500;
const MIN_COMPLETION_TOKENS = 1024;

// O modelo de visão tem, no tier gratuito, um teto separado de 1.000 tokens de
// SAÍDA por minuto (OTPM) — e o max_tokens pedido conta inteiro nesse teto,
// mesmo que a resposta seja curta. 800 deixa folga para uma segunda leitura no
// mesmo minuto quando a primeira gastou pouco. (Medido em 2026-09-04.)
export const GROQ_VISION_MAX_OUTPUT_TOKENS = 800;
/** Custo estimado de uma imagem no prompt do modelo de visão (medido: ~1,8k p/ A4 em 1240 px). */
const IMAGE_TOKEN_ESTIMATE = 2200;

/** Estimativa conservadora p/ pt-BR (~3 chars por token). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}

function estimateContentTokens(content: GroqUserContent): number {
  if (typeof content === "string") return estimateTokens(content);
  return content.reduce(
    (acc, part) => acc + (part.type === "text" ? estimateTokens(part.text) : IMAGE_TOKEN_ESTIMATE),
    0
  );
}

/** Remove blocos <think> que modelos de raciocínio deixam escapar mesmo com reasoning oculto. */
function stripReasoning(content: string): string {
  return content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

/**
 * Extrai um objeto JSON da resposta do modelo, tolerando cercas de markdown
 * e texto solto antes/depois do objeto.
 */
function extractJson(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // remove cercas ```json ... ``` e tenta recortar do primeiro { ao último }
    const unfenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new GroqError("Resposta da IA não contém JSON válido");
    }
    return JSON.parse(unfenced.slice(start, end + 1));
  }
}

const JSON_RETRY_NOTE =
  "ATENÇÃO: a resposta anterior falhou. Responda SOMENTE com um objeto JSON válido, sem nenhum texto fora dele.";
const TEXT_RETRY_NOTE =
  "ATENÇÃO: a resposta anterior veio vazia ou inválida. Responda diretamente com o conteúdo pedido.";

interface GroqChatMode {
  /** Envia response_format json_object. */
  responseFormatJson: boolean;
  /** Aviso anexado ao system prompt nas retentativas. */
  retryNote: string;
}

/**
 * Núcleo das chamadas: monta a requisição, respeita o orçamento de tokens,
 * reexecuta em rate limit (429), erro 5xx, resposta vazia ou falha do `parse`
 * — na retentativa a temperatura é reduzida para aumentar a chance de saída
 * bem-formada.
 */
async function groqChat<T>(
  options: GroqChatOptions,
  mode: GroqChatMode,
  parse: (content: string) => T
): Promise<T> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    throw new GroqError("GROQ_API_KEY não configurada");
  }

  const {
    systemPrompt, userPrompt, temperature = 0.7, maxTokens = 4096, retries = 1,
    model = GROQ_MODEL, hideReasoning, reasoningEffort,
  } = options;

  let lastError: Error = new GroqError("Erro na geração pela IA");

  for (let attempt = 0; attempt <= retries; attempt++) {
    const attemptTemperature = Math.max(0.2, temperature - attempt * 0.2);
    const attemptSystem = attempt === 0
      ? systemPrompt
      : [systemPrompt, mode.retryNote].filter(Boolean).join("\n\n");

    // Cabe no orçamento de tokens/minuto: reduz o max_tokens se o prompt for grande
    const promptTokens = estimateTokens(attemptSystem ?? "") + estimateContentTokens(userPrompt);
    // (o piso não pode passar do pedido: chamadas de OCR pedem menos que o piso de propósito)
    const cappedMaxTokens = Math.max(
      Math.min(MIN_COMPLETION_TOKENS, maxTokens),
      Math.min(maxTokens, GROQ_TPM_BUDGET - promptTokens)
    );

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(attemptSystem ? [{ role: "system", content: attemptSystem }] : []),
            { role: "user", content: userPrompt },
          ],
          ...(mode.responseFormatJson ? { response_format: { type: "json_object" } } : {}),
          ...(hideReasoning ? { reasoning_format: "hidden" } : {}),
          ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
          temperature: attemptTemperature,
          max_tokens: cappedMaxTokens,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error(`Groq API error (attempt ${attempt + 1}):`, response.status, errText);
        const retryable = response.status === 429 || response.status >= 500;
        lastError = new GroqError(
          response.status === 429 || response.status === 413
            ? "Limite de uso da IA por minuto atingido. Aguarde um instante e tente novamente."
            : "Erro na geração pela IA",
          response.status === 429 || response.status === 413 ? 429 : 500
        );
        if (retryable && attempt < retries) {
          await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
          continue;
        }
        throw lastError;
      }

      const data = await response.json();
      const content: string | undefined = data.choices?.[0]?.message?.content;
      if (!content) {
        lastError = new GroqError("Resposta vazia da IA");
        if (attempt < retries) continue;
        throw lastError;
      }

      return parse(stripReasoning(content));
    } catch (err) {
      lastError = err instanceof Error ? err : new GroqError("Erro na geração pela IA");
      if (attempt >= retries) throw lastError;
      // Resposta inválida ou falha de rede: tenta novamente com temperatura menor
    }
  }

  throw lastError;
}

/**
 * Chama a Groq exigindo resposta JSON. Reexecuta automaticamente em caso de
 * rate limit (429), erro 5xx ou JSON inválido.
 */
export async function callGroqJson<T = Record<string, unknown>>(options: GroqJsonOptions): Promise<T> {
  const { jsonMode = true, ...chat } = options;
  return groqChat<T>(
    chat,
    { responseFormatJson: jsonMode, retryNote: JSON_RETRY_NOTE },
    (content) => extractJson(content) as T
  );
}

/**
 * Chama a Groq esperando texto livre (transcrição, resumo). Aceita conteúdo
 * multimodal em `userPrompt` para os modelos de visão.
 */
export async function callGroqText(options: GroqChatOptions): Promise<string> {
  return groqChat<string>(
    options,
    { responseFormatJson: false, retryNote: TEXT_RETRY_NOTE },
    (content) => {
      if (!content) throw new GroqError("Resposta vazia da IA");
      return content;
    }
  );
}
