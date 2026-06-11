import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(request: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: "GROQ_API_KEY não configurada" }, { status: 500 });
    }

    const body = await request.json();
    const { title, postType, network, clientName, clientNiche, tone, targetAudience, existingCopy } = body;

    if (!title || !postType || !network) {
      return NextResponse.json({ error: "Parâmetros obrigatórios faltando" }, { status: 400 });
    }

    const systemPrompt = `Você é um copywriter especialista em redes sociais.
Crie textos criativos, engajantes e em português brasileiro.
Responda APENAS com JSON válido.`;

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
${existingCopy ? `\nCopy atual:\n${existingCopy}` : ""}

Retorne EXATAMENTE este JSON:
{
  "copy": "legenda completa com emojis, parágrafos e call-to-action claro (máx 2200 chars para Instagram)",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
}

Inclua 10-15 hashtags relevantes. Use emojis com moderação. Termine sempre com um CTA claro.`;

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Erro na geração pela IA" }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "Resposta vazia da IA" }, { status: 500 });
    }

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Error in generate-copy route:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
