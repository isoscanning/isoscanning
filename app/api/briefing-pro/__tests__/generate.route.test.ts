/**
 * @jest-environment node
 */
// Rota /api/briefing-pro/generate: prompt com documento base, condensação de
// material longo e texto-fonte gravado. Groq e autenticação/plano mockadas.

import { NextRequest } from "next/server";

jest.mock("@/lib/server/api-auth", () => ({
  requireUser: jest.fn(),
  consumeAiCredits: jest.fn(),
}));

jest.mock("@/lib/server/groq", () => ({
  ...jest.requireActual("@/lib/server/groq"),
  callGroqJson: jest.fn(),
  callGroqText: jest.fn(),
}));

import { requireUser, consumeAiCredits } from "@/lib/server/api-auth";
import { callGroqJson, callGroqText } from "@/lib/server/groq";
import { POST } from "../generate/route";

const mockedRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockedConsume = consumeAiCredits as jest.MockedFunction<typeof consumeAiCredits>;
const mockedJson = callGroqJson as jest.MockedFunction<typeof callGroqJson>;
const mockedText = callGroqText as jest.MockedFunction<typeof callGroqText>;

const FAKE_AUTH = { user: { id: "user-1" }, token: "t", supabase: {} } as unknown as Awaited<
  ReturnType<typeof requireUser>
>;

const AI_BRIEFING = {
  title: "Evento corporativo Tech Solutions",
  briefing_type: "event",
  client_name: "Tech Solutions Ltda",
  event_date: "2026-11-20",
  event_time: "08:00",
  sections: [
    {
      title: "1. Abertura",
      items: [{ title: "Credenciamento e coffee", scheduled_time: "08:00", is_required: true }],
    },
  ],
  deliverables: [{ title: "150 fotos editadas", quantity: 150, due_date: "2026-11-27" }],
};

const DOC = `BRIEFING - EVENTO CORPORATIVO
Cliente: Tech Solutions Ltda
Data: 20/11/2026, das 8h às 18h
1. ABERTURA (8h-9h) - Credenciamento e coffee
ENTREGAS - 150 fotos editadas em 7 dias`;

async function post(body: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  const req = new NextRequest("http://localhost/api/briefing-pro/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await POST(req);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

function lastUserPrompt(): string {
  const call = mockedJson.mock.calls.at(-1)?.[0];
  return String(call?.userPrompt ?? "");
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedRequireUser.mockResolvedValue(FAKE_AUTH);
  mockedConsume.mockResolvedValue(null);
  mockedJson.mockResolvedValue(AI_BRIEFING);
});

describe("validações", () => {
  it("400 sem arquivo e com texto curto", async () => {
    const { status, body } = await post({ text: "casamento" });
    expect(status).toBe(400);
    expect(body.error).toMatch(/anexe o briefing/);
    expect(mockedConsume).not.toHaveBeenCalled();
  });

  it("400 quando o texto do arquivo veio vazio", async () => {
    const { status } = await post({ text: "", file_text: "abc", file_name: "x.pdf" });
    expect(status).toBe(400);
  });

  it("arquivo sozinho (sem descrição) é suficiente", async () => {
    const { status } = await post({ text: "", file_text: DOC, file_name: "briefing.pdf" });
    expect(status).toBe(200);
    expect(mockedConsume).toHaveBeenCalledWith(FAKE_AUTH, "briefing-generate");
  });
});

describe("prompt com documento base", () => {
  it("inclui o documento, as observações e as regras de estrutura semelhante", async () => {
    const { status, body } = await post({
      text: "Priorizar o palco nas palestras",
      file_text: DOC,
      file_name: "briefing.pdf",
      briefing_type: "event",
    });
    expect(status).toBe(200);

    const prompt = lastUserPrompt();
    expect(prompt).toContain('DOCUMENTO BASE enviado pelo usuário (arquivo "briefing.pdf")');
    expect(prompt).toContain("Credenciamento e coffee");
    expect(prompt).toContain("OBSERVAÇÕES E INSTRUÇÕES ADICIONAIS");
    expect(prompt).toContain("Priorizar o palco nas palestras");
    expect(prompt).toContain("COMO USAR O DOCUMENTO BASE");
    expect(prompt).toContain("Tipo de trabalho indicado pelo usuário: event");
    // documento curto: não condensa
    expect(mockedText).not.toHaveBeenCalled();
    expect(body.warnings).toEqual([]);

    const briefing = body.briefing as Record<string, unknown>;
    expect(briefing.ai_generated).toBe(true);
    expect(briefing.source_text).toBe(
      `[Arquivo base: briefing.pdf]\n\n${DOC}\n\n[Observações do usuário]\n\nPriorizar o palco nas palestras`
    );
    expect(briefing.title).toBe("Evento corporativo Tech Solutions");
  });

  it("sem arquivo o prompt não traz as regras de documento", async () => {
    const text = "Casamento da Ana e do Pedro dia 15/11 no Espaço Jardim, cerimônia às 17h.";
    await post({ text });
    const prompt = lastUserPrompt();
    expect(prompt).toContain("TEXTO DO BRIEFING");
    expect(prompt).not.toContain("COMO USAR O DOCUMENTO BASE");
  });
});

describe("material longo", () => {
  const longDoc = Array.from({ length: 300 }, (_, i) => `${i + 1}. Item do cronograma às ${8 + (i % 10)}h com detalhes`).join("\n");

  it("condensa o documento com o modelo leve e avisa o usuário", async () => {
    expect(longDoc.length).toBeGreaterThan(10000);
    mockedText.mockResolvedValue("RESUMO CONDENSADO: cronograma 8h-18h, 150 fotos");

    const { status, body } = await post({ text: "obs", file_text: longDoc, file_name: "longo.pdf" });
    expect(status).toBe(200);

    const condense = mockedText.mock.calls[0][0];
    expect(condense.model).toBe("openai/gpt-oss-20b");
    expect(condense.reasoningEffort).toBe("low");
    expect(String(condense.userPrompt)).toContain('(arquivo "longo.pdf")');

    const prompt = lastUserPrompt();
    expect(prompt).toContain("RESUMO CONDENSADO");
    expect(prompt).not.toContain("300. Item do cronograma");
    expect(body.warnings).toEqual([expect.stringMatching(/condensado/)]);

    // o texto-fonte gravado é o ORIGINAL, não o condensado
    const briefing = body.briefing as Record<string, unknown>;
    expect(String(briefing.source_text)).toContain("1. Item do cronograma");
    expect(String(briefing.source_text)).not.toContain("RESUMO CONDENSADO");
  });

  it("se a condensação falhar, corta o texto e avisa (a geração continua)", async () => {
    mockedText.mockRejectedValue(new Error("429"));
    const { status, body } = await post({ text: "", file_text: longDoc, file_name: "longo.pdf" });
    expect(status).toBe(200);
    expect(body.warnings).toEqual([expect.stringMatching(/não pôde ser condensado/)]);
    expect(lastUserPrompt()).toContain("1. Item do cronograma");
    expect(lastUserPrompt()).not.toContain("300. Item do cronograma");
  });

  it("texto colado muito longo também é condensado em vez de cortado em silêncio", async () => {
    mockedText.mockResolvedValue("CONDENSADO DO TEXTO COLADO");
    const { status, body } = await post({ text: longDoc });
    expect(status).toBe(200);
    expect(lastUserPrompt()).toContain("CONDENSADO DO TEXTO COLADO");
    expect(body.warnings).toEqual([expect.stringMatching(/condensado/)]);
  });
});
