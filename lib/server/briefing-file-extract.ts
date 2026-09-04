// Briefing Pro — extração de texto do "arquivo base" no servidor.
//
//   PDF   → unpdf (camada de texto do PDF; digitalizado sem texto devolve vazio)
//   DOCX  → mammoth (texto bruto, sem formatação)
//   Texto → decodificação direta (UTF-8 / UTF-16 / Windows-1252)
//   Imagem (foto ou print) → OCR pelo modelo de visão da Groq
//
// Devolve texto já normalizado; quem chama decide o que fazer com texto curto
// demais (PDF só imagem, foto ilegível).

import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import { callGroqText, GROQ_VISION_MAX_OUTPUT_TOKENS, GROQ_VISION_MODEL } from "./groq";
import {
  BriefingFileKind,
  cleanExtractedText,
  decodeTextBuffer,
} from "@/lib/briefing-pro-file";

export type ExtractionMethod = "pdf-text" | "docx" | "plain-text" | "ocr";

export interface FileExtraction {
  text: string;
  method: ExtractionMethod;
  /** Só para PDF. */
  pages?: number;
  /** OCR: a imagem tinha mais texto do que o modelo pôde devolver de uma vez. */
  truncated?: boolean;
}

/**
 * O modelo de visão tem teto baixo de tokens de saída (ver
 * GROQ_VISION_MAX_OUTPUT_TOKENS). Pedimos um marcador no fim da transcrição:
 * se ele não vier, a resposta foi cortada e avisamos o usuário.
 */
const OCR_END_MARKER = "[FIM]";
const OCR_NO_TEXT = "SEM_TEXTO";

const OCR_PROMPT = `Transcreva fielmente TODO o texto legível desta imagem, na ordem natural de leitura (de cima para baixo, esquerda para direita; em conversas de mensagens, uma mensagem por parágrafo).
Preserve quebras de linha, títulos, listas numeradas e marcadores. Em tabelas, escreva uma linha por linha da tabela separando as células com " | ".
Não resuma, não comente, não traduza, não corrija e não invente texto que não esteja na imagem. Mantenha números, datas, horários, telefones e e-mails exatamente como aparecem.
Ao terminar a transcrição, escreva ${OCR_END_MARKER} sozinho na última linha.
Se não houver texto legível na imagem, responda exatamente: ${OCR_NO_TEXT}`;

export async function extractPdfText(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  const pdf = await getDocumentProxy(bytes);
  const { totalPages, text } = await extractText(pdf);
  // Uma página por bloco: preserva a separação visual do original para a IA.
  return { text: text.map((page) => page.trim()).filter(Boolean).join("\n\n"), pages: totalPages };
}

export async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/** OCR de foto/print via modelo de visão (imagem em data URL no prompt). */
export async function ocrImage(
  buffer: Buffer,
  mimeType: string
): Promise<{ text: string; truncated: boolean }> {
  const mime = mimeType && mimeType.startsWith("image/") ? mimeType : "image/jpeg";
  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
  const raw = await callGroqText({
    model: GROQ_VISION_MODEL,
    userPrompt: [
      { type: "text", text: OCR_PROMPT },
      { type: "image_url", image_url: { url: dataUrl } },
    ],
    temperature: 0.1,
    maxTokens: GROQ_VISION_MAX_OUTPUT_TOKENS,
    retries: 1,
    // "thinking" desligado: no qwen3 ele conta como saída e comeria o teto de OTPM
    reasoningEffort: "none",
  });

  const trimmed = raw.trim();
  if (trimmed.startsWith(OCR_NO_TEXT)) return { text: "", truncated: false };
  const complete = trimmed.endsWith(OCR_END_MARKER);
  const text = complete ? trimmed.slice(0, -OCR_END_MARKER.length) : trimmed;
  return { text, truncated: !complete };
}

export async function extractBriefingFile(
  kind: BriefingFileKind,
  buffer: Buffer,
  mimeType: string
): Promise<FileExtraction> {
  switch (kind) {
    case "pdf": {
      const { text, pages } = await extractPdfText(new Uint8Array(buffer));
      return { text: cleanExtractedText(text), method: "pdf-text", pages };
    }
    case "docx":
      return { text: cleanExtractedText(await extractDocxText(buffer)), method: "docx" };
    case "text":
      return { text: cleanExtractedText(decodeTextBuffer(new Uint8Array(buffer))), method: "plain-text" };
    case "image": {
      const { text, truncated } = await ocrImage(buffer, mimeType);
      return { text: cleanExtractedText(text), method: "ocr", truncated };
    }
  }
}
