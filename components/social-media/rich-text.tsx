"use client";

import * as React from "react";
import { useRef } from "react";
import { Bold, Italic, List } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renderização e edição de texto rico "lite" (sem dependências externas).
 * Sintaxe suportada:
 *   **negrito**      → <strong>
 *   *itálico*        → <em>
 *   _itálico_        → <em>
 *   linhas iniciadas por "- " ou "• " → lista com marcador
 *   quebras de linha são preservadas
 */

// Parser inline: **negrito**, *itálico*, _itálico_
function parseInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+?)\*\*|\*([^*\n]+?)\*|_([^_\n]+?)_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[2] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b-${i}`}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-i-${i}`}>{match[3]}</em>);
    } else if (match[4] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-u-${i}`}>{match[4]}</em>);
    }
    lastIndex = regex.lastIndex;
    i++;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n");

  return (
    <div className={cn("space-y-1 leading-relaxed", className)}>
      {lines.map((line, idx) => {
        const trimmed = line.replace(/^\s+/, "");
        const bulletMatch = trimmed.match(/^[-•]\s+(.*)$/);

        if (bulletMatch) {
          return (
            <div key={idx} className="flex gap-2">
              <span className="select-none text-muted-foreground">•</span>
              <span className="flex-1">{parseInline(bulletMatch[1], `l${idx}`)}</span>
            </div>
          );
        }

        // Linha vazia → mantém espaçamento entre parágrafos
        if (trimmed === "") {
          return <div key={idx} className="h-2" aria-hidden />;
        }

        return <p key={idx}>{parseInline(line, `l${idx}`)}</p>;
      })}
    </div>
  );
}

interface RichTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function RichTextArea({ value, onChange, placeholder, rows = 6, className }: RichTextAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(marker: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const before = value.slice(0, start);
    const after = value.slice(end);
    const next = `${before}${marker}${selected}${marker}${after}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + marker.length, end + marker.length);
    });
  }

  function toggleBullet() {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const before = value.slice(0, lineStart);
    const after = value.slice(lineStart);
    const next = `${before}- ${after}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + 2, start + 2);
    });
  }

  const toolbarBtn =
    "h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors";

  return (
    <div className={cn("rounded-md border border-input bg-transparent dark:bg-input/30", className)}>
      <div className="flex items-center gap-0.5 border-b border-border px-1.5 py-1">
        <button type="button" onClick={() => wrapSelection("**")} className={toolbarBtn} title="Negrito (**texto**)">
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => wrapSelection("*")} className={toolbarBtn} title="Itálico (*texto*)">
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={toggleBullet} className={toolbarBtn} title="Lista com marcador">
          <List className="h-3.5 w-3.5" />
        </button>
        <span className="ml-auto pr-1 text-[10px] text-muted-foreground/70">
          **negrito** · *itálico*
        </span>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
