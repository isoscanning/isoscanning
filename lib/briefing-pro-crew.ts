// Equipe do trabalho do Briefing Pro: funções (Foto, Drone, Coordenação...),
// cores das funções e a regra de herança "item sem atribuição própria herda
// quem cuida da seção". Funções puras, usadas nas páginas e nos filtros.

import { BriefingCrew } from "./briefing-pro-types";

/** Funções mais comuns — chips de preenchimento rápido (texto livre no fim). */
export const JOB_ROLE_SUGGESTIONS = [
  "Foto",
  "Vídeo",
  "Drone",
  "Coordenação",
  "Auxiliar",
  "Áudio",
  "Iluminação",
  "Produção",
  "Edição",
  "Social media",
];

const ROLE_TONES: Array<{ match: RegExp; className: string }> = [
  { match: /foto/i, className: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300" },
  { match: /v[ií]deo|film|c[aâ]mera|cinegraf/i, className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  { match: /drone/i, className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300" },
  { match: /coorden|dire[çc]|produ/i, className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  { match: /auxil|assist/i, className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  { match: /[áa]udio|som/i, className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  { match: /ilumin|luz/i, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  { match: /edi[çc]|social|design/i, className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
];

/** Classes de cor do chip de uma função (por palavra-chave; neutro no resto). */
export function jobRoleTone(role: string): string {
  const found = ROLE_TONES.find((tone) => tone.match.test(role));
  return found?.className ?? "bg-muted text-muted-foreground";
}

export function crewLabel(member: Pick<BriefingCrew, "name" | "job_role">): string {
  return member.job_role ? `${member.name} · ${member.job_role}` : member.name;
}

export interface CrewTarget {
  crew_ids: string[];
}

/** Quem faz um item: a atribuição própria ou, na falta dela, a da seção. */
export function effectiveCrewIds(
  item: CrewTarget,
  section: CrewTarget
): { ids: string[]; inherited: boolean } {
  if (item.crew_ids.length > 0) return { ids: item.crew_ids, inherited: false };
  return { ids: section.crew_ids, inherited: section.crew_ids.length > 0 };
}

/** Ids da equipe vinculados ao usuário logado (base do filtro "Meus itens"). */
export function myCrewIds(
  crew: Array<Pick<BriefingCrew, "id" | "user_id">>,
  userId?: string | null
): string[] {
  if (!userId) return [];
  return crew.filter((c) => c.user_id === userId).map((c) => c.id);
}

export function crewIndex<T extends { id: string }>(crew: T[]): Map<string, T> {
  return new Map(crew.map((c) => [c.id, c]));
}
