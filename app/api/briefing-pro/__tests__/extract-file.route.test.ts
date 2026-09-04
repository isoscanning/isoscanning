/**
 * @jest-environment node
 */
// Rota /api/briefing-pro/extract-file com o mammoth REAL e a autenticação/
// plano e a Groq (OCR) mockadas. O unpdf também é mockado: ele carrega o
// bundle do PDF.js por `import()` dinâmico, que o VM do Jest não suporta sem
// --experimental-vm-modules (a extração real de PDF é validada no smoke test
// com o servidor de verdade).

import { readFileSync } from "fs";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";

jest.mock("@/lib/server/api-auth", () => ({
  requireUser: jest.fn(),
  consumeAiCredits: jest.fn(),
}));

// PDF fake: "%PDF-TEXT" no início devolve duas páginas com texto; o resto, nada.
jest.mock("unpdf", () => ({
  getDocumentProxy: jest.fn(async (bytes: Uint8Array) => ({
    hasText: Buffer.from(bytes.slice(0, 9)).toString("latin1") === "%PDF-TEXT",
  })),
  extractText: jest.fn(async (pdf: { hasText: boolean }) => ({
    totalPages: 2,
    text: pdf.hasText
      ? ["Briefing Ensaio Gestante - Mariana\nData: 10/10/2026 as 16h", "Entregar 30 fotos editadas em 15 dias via Drive"]
      : ["", ""],
  })),
}));

jest.mock("@/lib/server/groq", () => ({
  ...jest.requireActual("@/lib/server/groq"),
  callGroqText: jest.fn(),
}));

import { requireUser, consumeAiCredits } from "@/lib/server/api-auth";
import { callGroqText, GroqError } from "@/lib/server/groq";
import { POST } from "../extract-file/route";

const mockedRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockedConsume = consumeAiCredits as jest.MockedFunction<typeof consumeAiCredits>;
const mockedGroqText = callGroqText as jest.MockedFunction<typeof callGroqText>;

const FIXTURES = join(__dirname, "fixtures");

function fixture(name: string): Buffer {
  return readFileSync(join(FIXTURES, name));
}

const PDF_WITH_TEXT = Buffer.from("%PDF-TEXT ...conteudo...", "latin1");
const PDF_SCANNED = Buffer.from("%PDF-1.4 ...so imagens...", "latin1");

function requestWithFile(
  content: Uint8Array | string | null,
  name?: string,
  type = "application/octet-stream"
): NextRequest {
  const form = new FormData();
  if (content !== null && name) {
    // cópia em Uint8Array "puro": Buffer não satisfaz BlobPart no TS 5.7+
    const part: BlobPart = typeof content === "string" ? content : new Uint8Array(content);
    form.append("file", new File([part], name, { type }));
  }
  return new NextRequest("http://localhost/api/briefing-pro/extract-file", {
    method: "POST",
    body: form,
  });
}

async function post(req: NextRequest): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await POST(req);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

const FAKE_AUTH = { user: { id: "user-1" }, token: "t", supabase: {} } as unknown as Awaited<
  ReturnType<typeof requireUser>
>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedRequireUser.mockResolvedValue(FAKE_AUTH);
  mockedConsume.mockResolvedValue(null);
});

describe("validações", () => {
  it("401 sem usuário", async () => {
    mockedRequireUser.mockResolvedValue(null);
    const { status } = await post(requestWithFile("x", "a.txt", "text/plain"));
    expect(status).toBe(401);
  });

  it("400 sem arquivo", async () => {
    const { status, body } = await post(requestWithFile(null));
    expect(status).toBe(400);
    expect(body.error).toMatch(/Nenhum arquivo/);
  });

  it("400 com arquivo vazio", async () => {
    const { status } = await post(requestWithFile("", "vazio.txt", "text/plain"));
    expect(status).toBe(400);
  });

  it("415 para .doc antigo, com orientação de conversão", async () => {
    const { status, body } = await post(requestWithFile("abc", "antigo.doc", "application/msword"));
    expect(status).toBe(415);
    expect(body.error).toMatch(/\.docx ou PDF/);
  });

  it("413 acima de 4 MB", async () => {
    const big = new Uint8Array(4 * 1024 * 1024 + 1);
    const { status } = await post(requestWithFile(big, "grande.txt", "text/plain"));
    expect(status).toBe(413);
  });
});

describe("extração local (sem IA)", () => {
  it("PDF com texto: devolve o texto das duas páginas e não gasta crédito", async () => {
    const { status, body } = await post(requestWithFile(PDF_WITH_TEXT, "briefing.pdf", "application/pdf"));
    expect(status).toBe(200);
    expect(body.method).toBe("pdf-text");
    expect(body.pages).toBe(2);
    // páginas separadas por linha em branco
    expect(body.text).toBe(
      "Briefing Ensaio Gestante - Mariana\nData: 10/10/2026 as 16h\n\nEntregar 30 fotos editadas em 15 dias via Drive"
    );
    expect(body.truncated).toBe(false);
    expect(body.file).toEqual({ name: "briefing.pdf", size: expect.any(Number), kind: "pdf" });
    expect(mockedConsume).not.toHaveBeenCalled();
  });

  it("PDF sem camada de texto (digitalizado): 422 com orientação", async () => {
    const { status, body } = await post(requestWithFile(PDF_SCANNED, "scan.pdf", "application/pdf"));
    expect(status).toBe(422);
    expect(body.error).toMatch(/digitalizado/);
  });

  it("DOCX: extrai o texto bruto", async () => {
    const { status, body } = await post(
      requestWithFile(
        fixture("briefing.docx"),
        "briefing.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    );
    expect(status).toBe(200);
    expect(body.method).toBe("docx");
    expect(body.text).toContain("Briefing Casamento Ana e Pedro");
    expect(body.text).toContain("cerimônia às 17h");
  });

  it("TXT em Windows-1252 (Bloco de Notas antigo) é decodificado", async () => {
    const latin1 = Buffer.from("Cerim\xf4nia \xe0s 17h no Espa\xe7o Jardim", "latin1");
    const { status, body } = await post(requestWithFile(latin1, "briefing.txt", "text/plain"));
    expect(status).toBe(200);
    expect(body.method).toBe("plain-text");
    expect(body.text).toBe("Cerimônia às 17h no Espaço Jardim");
  });

  it("extensão manda mesmo com MIME genérico do navegador", async () => {
    const { status, body } = await post(
      requestWithFile(PDF_WITH_TEXT, "briefing.PDF", "application/octet-stream")
    );
    expect(status).toBe(200);
    expect(body.method).toBe("pdf-text");
  });
});

describe("imagem (OCR pela Groq)", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);

  it("debita 1 crédito de IA e transcreve com o modelo de visão", async () => {
    mockedGroqText.mockResolvedValue(
      "Casamento dia 15/11\nEspaço Jardim, 17h\nContato: Paula (11) 99999-9999\n[FIM]"
    );
    const { status, body } = await post(requestWithFile(png, "print.png", "image/png"));

    expect(status).toBe(200);
    expect(body.method).toBe("ocr");
    expect(body.text).toBe("Casamento dia 15/11\nEspaço Jardim, 17h\nContato: Paula (11) 99999-9999");
    expect(body.truncated).toBe(false);
    expect(body.note).toBeNull();
    expect(mockedConsume).toHaveBeenCalledWith(FAKE_AUTH, "briefing-file-ocr");

    const call = mockedGroqText.mock.calls[0][0];
    expect(call.model).toBe("qwen/qwen3.6-27b");
    // teto de 1.000 tokens de saída/minuto do modelo de visão no tier gratuito
    expect(call.maxTokens).toBe(800);
    expect(call.reasoningEffort).toBe("none");
    const parts = call.userPrompt as Array<{ type: string; text?: string; image_url?: { url: string } }>;
    expect(parts[0].text).toContain("[FIM]");
    expect(parts[1].type).toBe("image_url");
    expect(parts[1].image_url?.url.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("sem o marcador de fim, avisa que a transcrição foi cortada", async () => {
    mockedGroqText.mockResolvedValue("Casamento dia 15/11\nEspaço Jardim, 17h\nContato: Pau");
    const { status, body } = await post(requestWithFile(png, "print.png", "image/png"));
    expect(status).toBe(200);
    expect(body.text).toBe("Casamento dia 15/11\nEspaço Jardim, 17h\nContato: Pau");
    expect(body.truncated).toBe(true);
    expect(body.note).toMatch(/Divida em duas fotos/);
  });

  it("422 quando o modelo não acha texto", async () => {
    mockedGroqText.mockResolvedValue("SEM_TEXTO");
    const { status, body } = await post(requestWithFile(png, "foto.jpg", "image/jpeg"));
    expect(status).toBe(422);
    expect(body.error).toMatch(/nítida/);
  });

  it("403 de plano interrompe antes do OCR", async () => {
    mockedConsume.mockResolvedValue(
      NextResponse.json({ code: "PLAN_LIMIT", message: "acabou" }, { status: 403 })
    );
    const { status } = await post(requestWithFile(png, "foto.jpg", "image/jpeg"));
    expect(status).toBe(403);
    expect(mockedGroqText).not.toHaveBeenCalled();
  });

  it("propaga o status do erro da Groq (rate limit)", async () => {
    mockedGroqText.mockRejectedValue(new GroqError("Limite de uso da IA por minuto atingido.", 429));
    const { status, body } = await post(requestWithFile(png, "foto.jpg", "image/jpeg"));
    expect(status).toBe(429);
    expect(body.error).toMatch(/Limite/);
  });
});
