/**
 * Utilidades compartilhadas do módulo de contratos (editor, detalhe, assinatura).
 *
 * Tudo aqui roda no cliente. O backend refaz a sanitização (sanitize-html) e o
 * hash do corpo; o que está aqui existe para o preview ser fiel e seguro.
 */

// ─── formatação ─────────────────────────────────────────────────────────────

/** "2026-09-15" → "15/09/2026" (aceita ISO completo, usa só a data). */
export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.substring(0, 10).split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

export function formatCurrencyBR(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "";
  const n = typeof val === "number" ? val : parseFloat(val);
  return Number.isNaN(n) ? String(val) : n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

export function todayBR(): string {
  return new Date().toLocaleDateString("pt-BR");
}

// ─── valor por extenso (pt-BR) ──────────────────────────────────────────────

const UNITS = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez",
  "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const TENS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const HUNDREDS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos",
  "setecentos", "oitocentos", "novecentos"];

function chunkToWords(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(HUNDREDS[h]);
  if (rest < 20) {
    if (rest) parts.push(UNITS[rest]);
  } else {
    const t = Math.floor(rest / 10);
    const u = rest % 10;
    parts.push(u ? `${TENS[t]} e ${UNITS[u]}` : TENS[t]);
  }
  return parts.join(" e ");
}

function integerToWords(n: number): string {
  if (n === 0) return "zero";
  const scales: [number, string, string][] = [
    [1_000_000_000, "bilhão", "bilhões"],
    [1_000_000, "milhão", "milhões"],
    [1_000, "mil", "mil"],
  ];
  const parts: string[] = [];
  let remaining = n;
  for (const [value, singular, plural] of scales) {
    const count = Math.floor(remaining / value);
    if (!count) continue;
    remaining -= count * value;
    if (value === 1_000) parts.push(count === 1 ? "mil" : `${chunkToWords(count)} mil`);
    else parts.push(`${chunkToWords(count)} ${count === 1 ? singular : plural}`);
  }
  const last = chunkToWords(remaining);
  if (last) {
    // "e" antes do último bloco quando ele é < 100 ou uma centena redonda
    const joiner = remaining < 100 || remaining % 100 === 0 ? " e " : " ";
    return parts.length ? `${parts.join(" ")}${joiner}${last}` : last;
  }
  return parts.join(" ");
}

/** 1500.5 → "mil e quinhentos reais e cinquenta centavos". */
export function numberToWordsPtBR(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "";
  const reais = Math.floor(value);
  const centavos = Math.round((value - reais) * 100);
  const parts: string[] = [];
  if (reais > 0) {
    const words = integerToWords(reais);
    // "um milhão de reais", "dois bilhões de reais"
    const needsDe = /(milh[ãõ]o|milhões|bilh[ãõ]o|bilhões)$/.test(words);
    parts.push(`${words}${needsDe ? " de" : ""} ${reais === 1 ? "real" : "reais"}`);
  }
  if (centavos > 0) {
    parts.push(`${integerToWords(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  }
  if (!parts.length) return "zero reais";
  return parts.join(" e ");
}

// ─── variáveis {{...}} ──────────────────────────────────────────────────────

/** Variáveis preenchidas pelo formulário/perfil — não viram "campos do modelo". */
export const STANDARD_VARS = new Set([
  "owner_name", "owner_email", "owner_document",
  "city", "state", "forum_city", "contract_date",
  "client_name", "client_email", "client_document",
  "service_description", "service_location",
  "service_date", "service_start_date", "service_end_date",
  "start_date", "end_date", "rental_start_date", "rental_end_date",
  "contract_value", "contract_value_written", "payment_terms",
  "expiry_date",
]);

export const VAR_LABELS: Record<string, string> = {
  owner_name: "Seu nome",
  owner_email: "Seu e-mail",
  owner_document: "Seu CPF/CNPJ",
  client_name: "Nome do cliente",
  client_email: "E-mail do cliente",
  client_document: "CPF/CNPJ do cliente",
  service_description: "Descrição do serviço",
  service_location: "Local do serviço",
  service_date: "Data do serviço",
  service_start_date: "Data de início",
  service_end_date: "Data de término",
  start_date: "Data de início",
  end_date: "Data de término",
  rental_start_date: "Início da locação",
  rental_end_date: "Fim da locação",
  contract_value: "Valor do contrato",
  contract_value_written: "Valor por extenso",
  payment_terms: "Forma de pagamento",
  expiry_date: "Prazo p/ assinatura",
  city: "Cidade",
  state: "Estado",
  forum_city: "Cidade do foro",
  contract_date: "Data do contrato",
  delivery_days: "Prazo de entrega (dias)",
  cancellation_days: "Dias p/ cancelamento",
  deposit_value: "Valor da caução",
  equipment_list: "Lista de equipamentos",
  production_title: "Título da produção",
  production_description: "Descrição da produção",
  recording_dates: "Datas de gravação",
  raw_delivery_date: "Entrega do material bruto",
  final_delivery_date: "Entrega final editada",
  usage_rights: "Direitos de uso",
  prohibited_uses: "Usos proibidos",
  revision_rounds: "Rodadas de revisão",
  confidentiality_years: "Anos de confidencialidade",
  capture_context: "Contexto da captação",
  capture_date: "Data da captação",
  authorized_uses: "Usos autorizados",
  authorized_platforms: "Plataformas autorizadas",
  validity_period: "Vigência da autorização",
  compensation_terms: "Termos de remuneração",
};

export function labelFromKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Chaves {{...}} presentes no HTML, sem repetição, na ordem de aparição. */
export function detectVariables(html: string): string[] {
  const matches = html.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "").trim()))];
}

export function detectExtraVariables(html: string): string[] {
  return detectVariables(html).filter((k) => !STANDARD_VARS.has(k));
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Substitui {{chave}} pelo valor ESCAPADO (texto, nunca HTML) — o que o usuário
 * digita no formulário não pode virar marcação dentro do contrato.
 * Chaves sem valor ficam intactas para o autor perceber o que falta.
 */
export function applyVariables(html: string, vars: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    if (!value || !value.trim()) continue;
    const safe = escapeHtml(value).replace(/\n/g, "<br>");
    result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), safe);
  }
  return result;
}

// ─── imagens ────────────────────────────────────────────────────────────────

const IMAGE_MAX_SIDE = 1200;
const IMAGE_MAX_BYTES = 350 * 1024; // depois do redimensionamento — o corpo todo tem teto de 2 MB no backend

/**
 * Lê uma imagem do disco, redimensiona no canvas e devolve um data URL
 * PNG/JPEG compacto. Recusa SVG (o backend também recusa) e arquivos que
 * continuam grandes depois de comprimidos.
 */
export async function imageFileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Selecione um arquivo de imagem.");
  if (file.type === "image/svg+xml") throw new Error("SVG não é aceito no contrato. Use PNG ou JPG.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Imagem muito grande (máx. 10 MB).");

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Arquivo de imagem inválido."));
    el.src = dataUrl;
  });

  const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, width, height);

  // PNG preserva transparência (logos); se ficar pesado, cai para JPEG progressivamente.
  const keepPng = file.type === "image/png" || file.type === "image/gif";
  let out = keepPng ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85);
  const bytes = (s: string) => Math.ceil((s.length - s.indexOf(",") - 1) * 0.75);
  for (const quality of [0.8, 0.7, 0.6, 0.5]) {
    if (bytes(out) <= IMAGE_MAX_BYTES) break;
    out = canvas.toDataURL("image/jpeg", quality);
  }
  if (bytes(out) > IMAGE_MAX_BYTES) {
    throw new Error("A imagem continua muito pesada mesmo comprimida. Use uma imagem menor.");
  }
  return out;
}

// ─── compartilhamento do link de assinatura ─────────────────────────────────

export function buildSigningUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.isoscanning.com";
  return `${origin}/assinar/${token}`;
}

export function buildVerifyUrl(hash?: string | null): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.isoscanning.com";
  return hash ? `${origin}/contratos/verificar?hash=${hash}` : `${origin}/contratos/verificar`;
}

export interface ShareMessageInput {
  title: string;
  ownerName: string;
  partyName: string;
  link: string;
  expiresAt?: string | null;
}

/** Texto pronto para WhatsApp/e-mail — o usuário é quem envia (a plataforma não dispara e-mail). */
export function buildShareMessage(input: ShareMessageInput): string {
  const lines = [
    `Olá, ${input.partyName}!`,
    "",
    `${input.ownerName} enviou o contrato "${input.title}" para sua assinatura eletrônica.`,
    "",
    "Leia e assine pelo link (não precisa criar conta):",
    input.link,
  ];
  if (input.expiresAt) {
    lines.push("", `Prazo para assinar: ${formatDateBR(input.expiresAt)}.`);
  }
  lines.push("", "Assinatura eletrônica com registro de data, IP e código de verificação — IsoScanning.");
  return lines.join("\n");
}

export function whatsappShareHref(message: string, phone?: string | null): string {
  const digits = phone ? phone.replace(/\D/g, "") : "";
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function mailtoShareHref(to: string, subject: string, message: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/** O fluxo de login (Google OAuth) lê `redirectAfterLogin` do localStorage no callback. */
export function rememberRedirectAfterLogin(path: string): void {
  try {
    localStorage.setItem("redirectAfterLogin", path);
  } catch { /* storage bloqueado: cai no /dashboard */ }
}

// ─── erros de API ───────────────────────────────────────────────────────────

export function apiErrorStatus(e: unknown): number | undefined {
  return (e as { response?: { status?: number } })?.response?.status;
}

export function apiErrorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { status?: number; data?: { message?: string | string[] } } };
  if (err?.response?.status === 429) {
    return "Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.";
  }
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(" ");
  return msg || fallback;
}
