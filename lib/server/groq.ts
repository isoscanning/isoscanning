// Cliente compartilhado da Groq para as rotas de IA de social media.
// Centraliza modelo/parâmetros e adiciona resiliência: retry em falhas
// transitórias e extração robusta de JSON da resposta do modelo.

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export const GROQ_MODEL = "llama-3.3-70b-versatile";

// Sistema agêntico da Groq com busca web nativa — usado para pesquisar
// contas/empresas na internet (anamnese). Não suporta response_format,
// então chamadas com ele devem usar jsonMode: false.
export const GROQ_SEARCH_MODEL = "groq/compound-mini";

export interface GroqJsonOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  /** Tentativas extras em caso de erro transitório ou JSON inválido (padrão: 1) */
  retries?: number;
  /** Modelo a usar (padrão: GROQ_MODEL) */
  model?: string;
  /** Envia response_format json_object (padrão: true; desligue em modelos compound) */
  jsonMode?: boolean;
}

export class GroqError extends Error {
  constructor(message: string, public status: number = 500) {
    super(message);
    this.name = "GroqError";
  }
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

/**
 * Chama a Groq exigindo resposta JSON. Reexecuta automaticamente em caso de
 * rate limit (429), erro 5xx ou JSON inválido — na retentativa a temperatura
 * é reduzida para aumentar a chance de saída bem-formada.
 */
export async function callGroqJson<T = Record<string, unknown>>(options: GroqJsonOptions): Promise<T> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    throw new GroqError("GROQ_API_KEY não configurada");
  }

  const {
    systemPrompt, userPrompt, temperature = 0.7, maxTokens = 4096, retries = 1,
    model = GROQ_MODEL, jsonMode = true,
  } = options;

  let lastError: Error = new GroqError("Erro na geração pela IA");

  for (let attempt = 0; attempt <= retries; attempt++) {
    const attemptTemperature = Math.max(0.2, temperature - attempt * 0.2);
    const attemptSystem = attempt === 0
      ? systemPrompt
      : `${systemPrompt}\n\nATENÇÃO: a resposta anterior falhou. Responda SOMENTE com um objeto JSON válido, sem nenhum texto fora dele.`;

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
            { role: "system", content: attemptSystem },
            { role: "user", content: userPrompt },
          ],
          ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
          temperature: attemptTemperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error(`Groq API error (attempt ${attempt + 1}):`, response.status, errText);
        const retryable = response.status === 429 || response.status >= 500;
        lastError = new GroqError(
          response.status === 429
            ? "Limite de requisições da IA atingido. Tente novamente em instantes."
            : "Erro na geração pela IA",
          response.status === 429 ? 429 : 500
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

      return extractJson(content) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new GroqError("Erro na geração pela IA");
      if (attempt >= retries) throw lastError;
      // JSON inválido ou falha de rede: tenta novamente com temperatura menor
    }
  }

  throw lastError;
}
