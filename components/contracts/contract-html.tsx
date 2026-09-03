"use client";

import { useMemo } from "react";
import DOMPurify, { type Config as PurifyConfig } from "dompurify";

/**
 * Renderização segura do corpo do contrato (HTML do editor).
 *
 * O backend já sanitiza ao salvar; aqui é a segunda barreira, para o preview
 * do editor (conteúdo ainda não passou pelo servidor) e para contratos
 * antigos gravados antes da sanitização existir.
 */
const PURIFY_CONFIG: PurifyConfig = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ["form", "input", "button", "textarea", "select", "iframe", "object", "embed", "style"],
  FORBID_ATTR: ["draggable", "contenteditable"],
};

export function sanitizeContractHtml(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined") return "";
  return DOMPurify.sanitize(html, PURIFY_CONFIG) as string;
}

/** Classes de tipografia do contrato — mesmas do editor, para o que se vê ser o que se assina. */
export const CONTRACT_PROSE_CLASSES =
  "prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed " +
  "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 " +
  "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5 " +
  "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 " +
  "[&_p]:mb-3 [&_p]:leading-relaxed " +
  "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 " +
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 " +
  "[&_strong]:font-bold [&_em]:italic " +
  "[&_table]:w-full [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 " +
  "[&_img]:max-w-full [&_img]:rounded " +
  "[&_hr]:border-none [&_hr]:border-t [&_hr]:border-border [&_hr]:my-4";

interface ContractHtmlProps {
  html: string;
  className?: string;
}

export function ContractHtml({ html, className }: ContractHtmlProps) {
  const safe = useMemo(() => sanitizeContractHtml(html), [html]);
  return (
    <div
      className={`${CONTRACT_PROSE_CLASSES} ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
