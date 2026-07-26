// Briefing Pro — refino de uma seção específica com IA.
//
// Recebe o contexto do briefing + a seção atual (itens, subitens) e um modo:
//  - "detail":  destrincha mais, adiciona subitens e especificidade
//  - "concise": enxuga para o essencial
//  - "custom":  segue a instrução livre escrita pelo usuário
// Devolve APENAS a seção refinada, no mesmo shape do generate — o frontend
// mostra o preview e aplica via backend (substituição do conteúdo da seção).

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/api-auth";
import { callGroqJson, GroqError } from "@/lib/server/groq";
import {
  ITEM_JSON_FORMAT,
  NormalizedSection,
  RawGeneratedSection,
  normalizeSections,
} from "@/lib/server/briefing-ai";

type RefineMode = "detail" | "concise" | "custom";

interface RefineRequestBody {
  mode?: RefineMode;
  instruction?: string;
  briefing?: {
    title?: string;
    briefing_type?: string;
    objective?: string;
    tone?: string;
    restrictions?: string;
    event_date?: string;
    event_time?: string;
  };
  section?: {
    title?: string;
    description?: string;
    items?: Array<{
      title?: string;
      description?: string;
      item_type?: string;
      priority?: string;
      scheduled_time?: string;
      is_required?: boolean;
      subitems?: Array<{ title?: string }>;
    }>;
  };
}

const SYSTEM_PROMPT = `Você é um produtor executivo sênior especializado em briefings de trabalhos criativos (fotografia, audiovisual, marketing, social media, eventos). Sua tarefa é REFINAR UMA ÚNICA SEÇÃO de um briefing existente, sem tocar no resto.

Regras:
- Responda SOMENTE com um objeto JSON válido, sem texto fora dele.
- Escreva em português do Brasil.
- Preserve as informações factuais existentes (horários, nomes, exigências) — refinar não é inventar dados novos nem apagar compromissos já definidos.
- Mantenha itens marcados como obrigatórios (is_required: true) obrigatórios, a menos que a instrução do usuário peça o contrário.
- O resultado substitui a seção inteira: devolva TODOS os itens que a seção deve ter após o refino, não apenas os alterados.`;

const MODE_INSTRUCTIONS: Record<Exclude<RefineMode, "custom">, string> = {
  detail:
    "MODO: MAIS DETALHES. Destrinche cada item em mais especificidade: descrições mais completas e acionáveis, subitens para itens que merecem checklist próprio, horários onde fizer sentido, e itens adicionais que um profissional experiente incluiria nesta seção. Não infle com obviedades — cada acréscimo precisa ser útil na execução.",
  concise:
    "MODO: MAIS ENXUTO. Enxugue a seção para o essencial: funda itens redundantes, corte o que é óbvio ou de baixo valor, encurte descrições mantendo só o que muda a execução. Preserve itens obrigatórios e informações factuais (horários, exigências do cliente).",
};

function buildUserPrompt(body: RefineRequestBody): string {
  const briefing = body.briefing ?? {};
  const modeText =
    body.mode === "custom"
      ? `MODO: PERSONALIZADO. Siga esta instrução do usuário para refinar a seção:\n"""\n${(body.instruction ?? "").trim()}\n"""`
      : MODE_INSTRUCTIONS[body.mode as Exclude<RefineMode, "custom">];

  return `CONTEXTO DO BRIEFING (não alterar, apenas usar como referência):
- Título: ${briefing.title ?? "-"}
- Tipo: ${briefing.briefing_type ?? "-"}
- Objetivo: ${briefing.objective ?? "-"}
- Tom/estilo: ${briefing.tone ?? "-"}
- Restrições: ${briefing.restrictions ?? "-"}
- Data/horário da execução: ${briefing.event_date ?? "-"} ${briefing.event_time ?? ""}

SEÇÃO ATUAL A REFINAR (JSON):
${JSON.stringify(body.section, null, 2)}

${modeText}

Devolva o JSON EXATAMENTE neste formato (a seção completa após o refino):
{
  "title": "título da seção (mantenha, ou ajuste apenas se o refino pedir)",
  "description": "para que serve a seção",
  "items": [
    ${ITEM_JSON_FORMAT}
  ]
}`;
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: RefineRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const mode = body.mode;
  if (mode !== "detail" && mode !== "concise" && mode !== "custom") {
    return NextResponse.json({ error: "Modo de refino inválido" }, { status: 400 });
  }
  if (mode === "custom" && (body.instruction ?? "").trim().length < 5) {
    return NextResponse.json(
      { error: "Descreva o que você quer que a IA faça com esta seção." },
      { status: 400 }
    );
  }
  if (!body.section || !Array.isArray(body.section.items)) {
    return NextResponse.json({ error: "Seção inválida" }, { status: 400 });
  }

  try {
    const parsed = await callGroqJson<RawGeneratedSection>({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(body),
      temperature: mode === "concise" ? 0.4 : 0.6,
      maxTokens: 6144,
      retries: 1,
    });

    const [section] = normalizeSections([parsed]) as NormalizedSection[];

    if (!section || section.items.length === 0) {
      return NextResponse.json(
        { error: "A IA não conseguiu refinar a seção. Tente novamente ou ajuste a instrução." },
        { status: 422 }
      );
    }

    return NextResponse.json({ section });
  } catch (err) {
    console.error("[briefing-pro/refine-section]", err);
    const status = err instanceof GroqError ? err.status : 500;
    const message =
      err instanceof GroqError ? err.message : "Erro ao refinar a seção com IA";
    return NextResponse.json({ error: message }, { status });
  }
}
