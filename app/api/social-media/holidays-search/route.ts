import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(request: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return NextResponse.json({ dates: [] });

    const { query } = await request.json();
    if (!query?.trim() || query.trim().length < 3) return NextResponse.json({ dates: [] });

    const prompt = `Você é um especialista em datas comemorativas e marketing de conteúdo no Brasil.

O usuário buscou por: "${query}"

Liste entre 8 e 14 datas comemorativas, feriados ou ocasiões especiais DIRETAMENTE relacionadas a essa busca. Inclua datas internacionais e brasileiras. Priorize datas que fazem sentido para campanhas de social media.

Para datas que se repetem todo ano, use o formato "MM-DD".
Para datas específicas de um ano, use "YYYY-MM-DD".

Retorne APENAS JSON válido:
{
  "dates": [
    {
      "name": "Nome da Data Comemorativa",
      "date": "MM-DD",
      "description": "Por que é relevante para marketing de conteúdo (máx 100 chars)",
      "category": "familia|religiao|saude|cultura|esporte|negocio|educacao|meio_ambiente|outros",
      "emoji": "🌍"
    }
  ]
}`;

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "Você é especialista em datas comemorativas e marketing. Responda APENAS com JSON válido, sem markdown.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) return NextResponse.json({ dates: [] });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return NextResponse.json({ dates: [] });

    const parsed = JSON.parse(content);
    return NextResponse.json({ dates: parsed.dates ?? [] });
  } catch {
    return NextResponse.json({ dates: [] });
  }
}
