import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/api-auth";
import { callGroqJson, GroqError } from "@/lib/server/groq";

// Rota legada de geração de copy de um post individual.
// O slide-over agora usa /api/social-media/refine-post (mais completa);
// esta rota permanece por compatibilidade com clientes já cacheados.

export async function POST(request: NextRequest) {
  try {
    // Rota proxia a chave Groq — exige usuário autenticado
    if (!(await requireUser(request))) {
      return NextResponse.json({ error: "Não autorizado. Faça login novamente." }, { status: 401 });
    }

    const body = await request.json();
    const { title, postType, network, clientName, clientNiche, tone, targetAudience, existingCopy, instruction } = body;

    if (!title || !postType || !network) {
      return NextResponse.json({ error: "Parâmetros obrigatórios faltando" }, { status: 400 });
    }

    const systemPrompt = `Você é um copywriter sênior especialista em redes sociais brasileiras.
Crie textos criativos, engajantes e em português brasileiro natural.
Responda APENAS com JSON válido, sem markdown nem texto fora do JSON.`;

    const action = existingCopy ? "Reescreva e melhore" : "Crie";

    const userPrompt = `${action} uma copy para o seguinte post:

DADOS DO POST:
- Título/Tema: ${title}
- Tipo: ${postType}
- Rede: ${network}
- Cliente: ${clientName || "Não informado"}
- Nicho: ${clientNiche || "Geral"}
- Tom de voz: ${tone || "Profissional e engajante"}
- Público-alvo: ${targetAudience || "Geral"}
${existingCopy ? `\nCopy atual:\n${existingCopy}` : ""}${instruction ? `\nINSTRUÇÃO DO GESTOR (prioridade máxima):\n${instruction}` : ""}

Retorne EXATAMENTE este JSON:
{
  "copy": "legenda completa com gancho na 1ª linha, quebras de linha, emojis com moderação e call-to-action claro",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
}

Inclua 8-15 hashtags relevantes sem o caractere "#". Termine sempre com um CTA claro.`;

    const parsed = await callGroqJson<Record<string, unknown>>({
      systemPrompt,
      userPrompt,
      temperature: 0.8,
      maxTokens: 2048,
      retries: 1,
    });

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Error in generate-copy route:", error);
    if (error instanceof GroqError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
