import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const MONTHS_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export async function POST(request: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return NextResponse.json({ events: [] });

    const { month, year } = await request.json();
    if (!month || !year) return NextResponse.json({ events: [] });

    const monthName = MONTHS_PT[month - 1];

    const prompt = `Você é um especialista em marketing digital e social media no Brasil.

Liste TODOS os eventos relevantes para ${monthName} de ${year} que um social media manager brasileiro deve conhecer para criar conteúdo estratégico. Inclua:
- Eventos esportivos (campeonatos, jogos, maratonas, GP de Fórmula 1...)
- Datas políticas e cívicas importantes
- Eventos culturais, festivais, shows
- Datas comemorativas do comércio e varejo
- Eventos globais com repercussão no Brasil
- Feriados prolongados que afetam o comportamento do consumidor

Seja específico ao ${year} quando souber a data. Se não souber a data exata, use o primeiro dia do mês. Retorne entre 8 e 15 eventos.

Retorne APENAS JSON válido, sem texto extra:
{
  "events": [
    {
      "name": "Nome do Evento",
      "category": "esporte|politica|cultura|comercial",
      "date": "YYYY-MM-DD",
      "emoji": "🏆",
      "description": "Por que é relevante para social media (máx 120 chars)"
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
            content: "Você é um especialista em marketing digital. Responda APENAS com JSON válido, sem markdown.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) return NextResponse.json({ events: [] });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return NextResponse.json({ events: [] });

    const parsed = JSON.parse(content);
    return NextResponse.json({ events: parsed.events ?? [] });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
