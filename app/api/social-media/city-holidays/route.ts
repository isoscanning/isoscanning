import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/api-auth";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const STATE_NAMES: Record<string, string> = {
  AC:"Acre", AL:"Alagoas", AM:"Amazonas", AP:"Amapá", BA:"Bahia",
  CE:"Ceará", DF:"Distrito Federal", ES:"Espírito Santo", GO:"Goiás",
  MA:"Maranhão", MG:"Minas Gerais", MS:"Mato Grosso do Sul", MT:"Mato Grosso",
  PA:"Pará", PB:"Paraíba", PE:"Pernambuco", PI:"Piauí", PR:"Paraná",
  RJ:"Rio de Janeiro", RN:"Rio Grande do Norte", RO:"Rondônia",
  RR:"Roraima", RS:"Rio Grande do Sul", SC:"Santa Catarina",
  SE:"Sergipe", SP:"São Paulo", TO:"Tocantins",
};

export async function POST(request: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return NextResponse.json({ holidays: [] });

    // Rota proxia a chave Groq — exige usuário autenticado
    if (!(await requireUser(request))) {
      return NextResponse.json({ error: "Não autorizado. Faça login novamente." }, { status: 401 });
    }

    const { cityName, state, year } = await request.json();
    if (!cityName || !state) return NextResponse.json({ holidays: [] });

    const stateName = STATE_NAMES[state] ?? state;

    const prompt = `Liste os feriados e datas comemorativas municipais de ${cityName}, ${stateName}, Brasil.

Inclua TODOS os tipos relevantes:
- Aniversário/fundação da cidade
- Santo padroeiro(a)
- Feriados municipais reconhecidos por lei municipal
- Datas comemorativas locais significativas

Se souber a data exata (todo ano), use "MM-DD". Se for data variável de ${year}, use "YYYY-MM-DD".
Retorne entre 3 e 8 feriados/datas.

Retorne APENAS JSON válido:
{
  "holidays": [
    {
      "name": "Nome do Feriado",
      "date": "MM-DD",
      "description": "Breve descrição do significado (máx 80 chars)"
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
            content: "Você é especialista em feriados e datas comemorativas municipais brasileiras. Responda APENAS com JSON válido.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 512,
      }),
    });

    if (!response.ok) return NextResponse.json({ holidays: [] });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return NextResponse.json({ holidays: [] });

    const parsed = JSON.parse(content);
    return NextResponse.json({ holidays: parsed.holidays ?? [] });
  } catch {
    return NextResponse.json({ holidays: [] });
  }
}
