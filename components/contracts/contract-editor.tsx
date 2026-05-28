"use client";

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Heading1, Heading2, Type,
  Image as ImageIcon, Eye, PenLine, Minus,
} from "lucide-react";

export interface ContractEditorHandle {
  insertImage: (src: string, alt?: string) => void;
  insertHtml: (html: string) => void;
  setContent: (html: string) => void;
}

interface ContractEditorProps {
  value: string;
  onChange: (value: string) => void;
  variables?: Record<string, string>;
  placeholder?: string;
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function substituteVariables(html: string, vars: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    if (value && value.trim()) {
      const safe = escapeHtml(value);
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      result = result.replace(
        regex,
        `<span style="color:#6366f1;border-bottom:1.5px dotted #6366f1;padding:0 1px;border-radius:2px;font-weight:500;" title="Campo: ${key}">${safe}</span>`
      );
    }
  }
  result = result.replace(
    /\{\{([^}]+)\}\}/g,
    `<span style="background:rgba(245,158,11,0.18);color:#b45309;padding:1px 5px;border-radius:4px;font-size:0.82em;font-weight:600;border:1px dashed rgba(245,158,11,0.5);">{{$1}}</span>`
  );
  return result;
}

function getCaretRange(x: number, y: number): Range | null {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  if (doc.caretRangeFromPoint) return doc.caretRangeFromPoint(x, y);
  if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(x, y);
    if (pos) {
      const range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
      return range;
    }
  }
  return null;
}

function ToolbarButton({
  onClick, title, children, active,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded hover:bg-muted transition-colors ${
        active ? "bg-muted text-indigo-600" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarSep() {
  return <div className="w-px h-5 bg-border mx-1" />;
}

export const ContractEditor = forwardRef<ContractEditorHandle, ContractEditorProps>(
  ({ value, onChange, variables = {}, placeholder }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mode, setMode] = useState<"edit" | "preview">("edit");
    const savedRangeRef = useRef<Range | null>(null);

    useEffect(() => {
      if (editorRef.current) editorRef.current.innerHTML = value;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      if (mode === "edit" && editorRef.current) {
        editorRef.current.innerHTML = value;
      }
    }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

    const saveRange = () => {
      const sel = window.getSelection();
      if (sel?.rangeCount) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    };

    const restoreRange = () => {
      const sel = window.getSelection();
      if (sel && savedRangeRef.current) {
        try {
          sel.removeAllRanges();
          sel.addRange(savedRangeRef.current);
        } catch {
          // range may be stale
        }
      }
    };

    const handleInput = () => {
      if (editorRef.current) onChange(editorRef.current.innerHTML);
    };

    const execCmd = (command: string, val?: string) => {
      restoreRange();
      document.execCommand(command, false, val);
      editorRef.current?.focus();
      handleInput();
    };

    const insertHtml = (html: string) => {
      if (mode !== "edit") return;
      editorRef.current?.focus();
      restoreRange();
      document.execCommand("insertHTML", false, html);
      handleInput();
    };

    const insertImage = (src: string, alt = "Imagem") => {
      insertHtml(
        `<img src="${src}" alt="${alt}" style="max-width:100%;height:auto;display:block;margin:10px auto;cursor:move;" draggable="true" />`
      );
    };

    const setContent = (html: string) => {
      onChange(html);
      if (editorRef.current) editorRef.current.innerHTML = html;
    };

    useImperativeHandle(ref, () => ({ insertImage, insertHtml, setContent }));

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => insertImage(ev.target?.result as string, file.name);
      reader.readAsDataURL(file);
      e.target.value = "";
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      const html = e.dataTransfer.getData("text/html");
      if (!html) return;
      e.preventDefault();
      const range = getCaretRange(e.clientX, e.clientY);
      if (range) {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      document.execCommand("insertHTML", false, html);
      handleInput();
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      if (e.dataTransfer.types.includes("text/html")) e.preventDefault();
    };

    const previewHtml = substituteVariables(value, variables);

    const editorClasses =
      "min-h-[480px] max-h-[700px] overflow-y-auto p-5 text-sm leading-relaxed outline-none prose prose-sm dark:prose-invert max-w-none " +
      "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground [&:empty]:before:pointer-events-none " +
      "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 " +
      "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5 " +
      "[&_p]:mb-3 [&_p]:leading-relaxed " +
      "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 " +
      "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 " +
      "[&_strong]:font-bold [&_em]:italic " +
      "[&_img]:max-w-full [&_img]:rounded [&_img]:cursor-move " +
      "[&_hr]:border-none [&_hr]:border-t [&_hr]:border-border [&_hr]:my-4";

    return (
      <div className="rounded-xl border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/30">
        {/* Mode tabs */}
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setMode("edit"); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              mode === "edit"
                ? "bg-indigo-600 text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <PenLine className="h-3.5 w-3.5" />
            Editar
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setMode("preview"); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              mode === "preview"
                ? "bg-indigo-600 text-white"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            Pré-visualizar
          </button>

          {mode === "preview" && (
            <span className="ml-auto text-xs text-muted-foreground italic">
              Campos preenchidos aparecem em{" "}
              <span style={{ color: "#6366f1", borderBottom: "1.5px dotted #6366f1" }}>azul</span>
              {", "}
              <span style={{ background: "rgba(245,158,11,0.18)", color: "#b45309", padding: "0 3px", borderRadius: "3px" }}>
                vazios
              </span>{" "}
              em âmbar
            </span>
          )}
        </div>

        {/* Toolbar — edit mode only */}
        {mode === "edit" && (
          <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b bg-muted/10">
            <ToolbarButton onClick={() => execCmd("bold")} title="Negrito (Ctrl+B)">
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCmd("italic")} title="Itálico (Ctrl+I)">
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCmd("underline")} title="Sublinhado (Ctrl+U)">
              <Underline className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarSep />

            <ToolbarButton onClick={() => execCmd("formatBlock", "h1")} title="Título 1">
              <Heading1 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCmd("formatBlock", "h2")} title="Título 2">
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCmd("formatBlock", "p")} title="Parágrafo">
              <Type className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarSep />

            <ToolbarButton onClick={() => execCmd("insertUnorderedList")} title="Lista com marcadores">
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCmd("insertOrderedList")} title="Lista numerada">
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarSep />

            <ToolbarButton onClick={() => execCmd("justifyLeft")} title="Alinhar à esquerda">
              <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCmd("justifyCenter")} title="Centralizar">
              <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => execCmd("justifyRight")} title="Alinhar à direita">
              <AlignRight className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarSep />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <ToolbarButton
              onClick={() => { saveRange(); fileInputRef.current?.click(); }}
              title="Inserir imagem"
            >
              <ImageIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                insertHtml(
                  '<hr style="border:none;border-top:2px solid #e5e7eb;margin:20px 0;" />'
                )
              }
              title="Inserir linha divisória"
            >
              <Minus className="h-4 w-4" />
            </ToolbarButton>
          </div>
        )}

        {/* Edit area */}
        {mode === "edit" ? (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onBlur={() => { handleInput(); saveRange(); }}
            onKeyUp={saveRange}
            onMouseUp={saveRange}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            data-placeholder={placeholder ?? "Escreva o conteúdo do contrato aqui..."}
            className={editorClasses}
          />
        ) : (
          /* Preview area */
          <div className="min-h-[480px] max-h-[700px] overflow-y-auto">
            <div className="px-5 pt-3 pb-1 border-b border-dashed">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Eye className="h-3 w-3" />
                Pré-visualização com os dados preenchidos. Edite o template na aba &quot;Editar&quot;.
              </p>
            </div>
            <div
              dangerouslySetInnerHTML={{ __html: previewHtml }}
              className={editorClasses.replace("outline-none", "")}
            />
          </div>
        )}
      </div>
    );
  }
);

ContractEditor.displayName = "ContractEditor";
