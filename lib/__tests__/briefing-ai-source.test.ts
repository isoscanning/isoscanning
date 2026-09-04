/**
 * @jest-environment node
 */
import {
  CONDENSE_INPUT_MAX_CHARS,
  DOCUMENT_RULES,
  buildSourceBlock,
  composeSourceText,
} from "../server/briefing-ai";

describe("buildSourceBlock", () => {
  it("sem arquivo: só o texto do usuário", () => {
    const block = buildSourceBlock({ notes: "Casamento dia 15/11" });
    expect(block).toContain("TEXTO DO BRIEFING");
    expect(block).toContain("Casamento dia 15/11");
    expect(block).not.toContain("DOCUMENTO BASE");
  });

  it("com arquivo: documento nomeado antes das observações, que têm prioridade", () => {
    const block = buildSourceBlock({
      fileText: "1. Abertura 8h",
      fileName: "briefing.pdf",
      notes: "priorizar palco",
    });
    expect(block).toContain('DOCUMENTO BASE enviado pelo usuário (arquivo "briefing.pdf")');
    expect(block).toContain("1. Abertura 8h");
    expect(block).toContain("OBSERVAÇÕES E INSTRUÇÕES ADICIONAIS");
    expect(block).toContain("prioridade sobre o documento");
    expect(block).toContain("priorizar palco");
    expect(block.indexOf("DOCUMENTO BASE")).toBeLessThan(block.indexOf("OBSERVAÇÕES"));
  });

  it("com arquivo e sem observações: não abre bloco vazio", () => {
    const block = buildSourceBlock({ fileText: "conteúdo", notes: "   " });
    expect(block).toContain("DOCUMENTO BASE enviado pelo usuário —");
    expect(block).not.toContain("OBSERVAÇÕES");
  });

  it("regras do documento pedem estrutura semelhante com fatos preservados", () => {
    expect(DOCUMENT_RULES).toMatch(/espinha dorsal/);
    expect(DOCUMENT_RULES).toMatch(/Preserve TODOS os dados factuais/);
    expect(DOCUMENT_RULES).toMatch(/is_required/);
  });
});

describe("composeSourceText", () => {
  it("sem arquivo devolve o texto puro", () => {
    expect(composeSourceText({ notes: "abc" })).toBe("abc");
  });

  it("com arquivo registra o nome e separa as observações", () => {
    const text = composeSourceText({ fileText: "doc", fileName: "a.docx", notes: "obs" });
    expect(text).toBe("[Arquivo base: a.docx]\n\ndoc\n\n[Observações do usuário]\n\nobs");
  });

  it("com arquivo sem nome usa rótulo genérico e omite observações vazias", () => {
    expect(composeSourceText({ fileText: "doc" })).toBe("[Arquivo base: documento]\n\ndoc");
  });
});

describe("limites derivados do orçamento da Groq", () => {
  it("a condensação aceita bem mais que o prompt de geração (10k)", () => {
    expect(CONDENSE_INPUT_MAX_CHARS).toBeGreaterThan(10000);
  });
});
