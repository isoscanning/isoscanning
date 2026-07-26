// Helpers compartilhados das rotas de IA do Briefing Pro
// (generate e refine-section): limpeza/validação da resposta do modelo e
// normalização de seções para o shape aceito pelo backend.

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
