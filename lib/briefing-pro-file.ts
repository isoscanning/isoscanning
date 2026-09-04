// Briefing Pro — helpers puros do "arquivo base" (importar um briefing que o
// cliente mandou). Sem dependências pesadas e sem código de servidor, para
// serem usados tanto na tela (validação antes do upload) quanto na rota de
// extração e nos testes. A extração em si (PDF, DOCX, OCR) vive em
// lib/server/briefing-file-extract.ts.

export type BriefingFileKind = "pdf" | "docx" | "text" | "image";

/** Vercel rejeita corpo acima de ~4,5 MB nas funções serverless. */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_FILE_LABEL = "4 MB";

/** Teto do texto extraído devolvido ao front (o excedente é descartado, com aviso). */
export const MAX_EXTRACTED_CHARS = 40_000;
/** Abaixo disso o arquivo não tem texto útil (PDF digitalizado, foto ilegível). */
export const MIN_USEFUL_CHARS = 20;

/** Valor do atributo `accept` do input de arquivo. */
export const ACCEPT_ATTRIBUTE = ".pdf,.docx,.txt,.md,.csv,image/png,image/jpeg,image/webp";

export const FILE_KIND_LABELS: Record<BriefingFileKind, string> = {
  pdf: "PDF",
  docx: "Word",
  text: "Texto",
  image: "Imagem",
};

const TEXT_EXTENSIONS = new Set(["txt", "md", "markdown", "csv"]);
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);
const IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Caracteres especiais montados por código para não depender de escapes
// invisíveis no fonte: BOM (U+FEFF), substituição (U+FFFD) e espaço duro (U+00A0).
const BOM = String.fromCharCode(0xfeff);
const REPLACEMENT_CHAR_RE = new RegExp(String.fromCharCode(0xfffd), "g");
const NBSP_RE = new RegExp(String.fromCharCode(0xa0), "g");
/** Caracteres de controle ASCII, exceto \t e \n (já tratados). */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

function extensionOf(fileName: string): string {
  return fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
}

/** Tipo de arquivo aceito, decidido pela extensão e, em fallback, pelo MIME. */
export function detectFileKind(fileName: string, mimeType?: string | null): BriefingFileKind | null {
  const ext = extensionOf(fileName);
  const mime = (mimeType ?? "").toLowerCase();

  if (ext === "pdf" || (!ext && mime === "application/pdf")) return "pdf";
  if (ext === "docx" || (!ext && mime === DOCX_MIME)) return "docx";
  if (TEXT_EXTENSIONS.has(ext) || (!ext && mime.startsWith("text/"))) return "text";
  if (IMAGE_EXTENSIONS.has(ext) || (!ext && IMAGE_MIMES.has(mime))) return "image";
  return null;
}

/** Mensagem específica para os formatos que os clientes mais mandam e não suportamos. */
export function unsupportedFileMessage(fileName: string): string {
  const ext = extensionOf(fileName);
  if (ext === "doc")
    return "Arquivos .doc (Word antigo) não são suportados. Salve como .docx ou PDF e envie de novo.";
  if (ext === "heic" || ext === "heif")
    return "Fotos HEIC não são suportadas. Converta para JPG ou PNG antes de enviar.";
  if (ext === "pages" || ext === "odt")
    return "Exporte o documento como PDF ou .docx e envie de novo.";
  return "Formato não suportado. Envie PDF, Word (.docx), texto (.txt, .md) ou imagem (PNG, JPG, WebP).";
}

/**
 * Decodifica um arquivo de texto: UTF-8 por padrão, com detecção de BOM
 * UTF-16 e fallback para Windows-1252 quando o UTF-8 gera muitos caracteres
 * inválidos (arquivos salvos pelo Bloco de Notas antigo / Excel).
 */
export function decodeTextBuffer(bytes: Uint8Array): string {
  if (bytes.length >= 2) {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
    if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  }
  let utf8 = new TextDecoder("utf-8").decode(bytes);
  if (utf8.startsWith(BOM)) utf8 = utf8.slice(1);
  const invalid = (utf8.match(REPLACEMENT_CHAR_RE) ?? []).length;
  if (invalid > 0 && invalid >= utf8.length / 200) {
    try {
      return new TextDecoder("windows-1252").decode(bytes);
    } catch {
      return utf8;
    }
  }
  return utf8;
}

/** Normaliza o texto extraído: quebras de linha, caracteres de controle e espaços em excesso. */
export function cleanExtractedText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS_RE, "")
    .replace(NBSP_RE, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface LimitedText {
  text: string;
  chars: number;
  totalChars: number;
  truncated: boolean;
}

/** Corta o texto no teto, preferindo terminar numa quebra de linha. */
export function limitExtractedText(text: string, max: number = MAX_EXTRACTED_CHARS): LimitedText {
  if (text.length <= max) {
    return { text, chars: text.length, totalChars: text.length, truncated: false };
  }
  const slice = text.slice(0, max);
  const lastBreak = slice.lastIndexOf("\n");
  const cut = lastBreak > max * 0.8 ? slice.slice(0, lastBreak) : slice;
  const trimmed = cut.trimEnd();
  return { text: trimmed, chars: trimmed.length, totalChars: text.length, truncated: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
