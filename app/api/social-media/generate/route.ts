import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const COMMEMORATIVE_DATES: Record<string, string> = {
  "01-01": "Ano Novo",
  "02-14": "Dia dos Namorados (EUA) / Valentine's Day",
  "03-08": "Dia Internacional da Mulher",
  "03-25": "Anunciação de Nossa Senhora",
  "04-01": "Dia da Mentira",
  "04-21": "Tiradentes",
  "05-01": "Dia do Trabalho",
  "05-12": "Dia das Mães (2026)",
  "06-12": "Dia dos Namorados",
  "06-13": "Santo Antônio",
  "06-19": "Corpus Christi",
  "06-24": "São João / Festa Junina",
  "06-29": "São Pedro e São Paulo",
  "07-09": "Revolução Constitucionalista",
  "07-28": "Dia do Churrasqueiro",
  "08-15": "Assunção de Nossa Senhora",
  "09-07": "Independência do Brasil",
  "09-21": "Dia da Árvore",
  "10-01": "Dia das Crianças",
  "10-02": "Dia das Crianças (2026 - folga)",
  "10-12": "Nossa Sra. Aparecida / Dia das Crianças",
  "11-02": "Finados",
  "11-15": "Proclamação da República",
  "11-20": "Dia da Consciência Negra",
  "12-25": "Natal",
  "12-31": "Véspera de Ano Novo",
};

function getCommemorativeDatesForMonth(month: number): string {
  const padded = String(month).padStart(2, "0");
  const entries = Object.entries(COMMEMORATIVE_DATES)
    .filter(([key]) => key.startsWith(padded))
    .map(([key, value]) => {
      const day = key.split("-")[1];
      return `Dia ${day}: ${value}`;
    });
  return entries.length > 0 ? entries.join(", ") : "Nenhuma data especial identificada";
}

export async function POST(request: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: "GROQ_API_KEY não configurada" }, { status: 500 });
    }

    const body = await request.json();
    const { clientName, clientNiche, month, year, networks, postTypes, frequency, tone, targetAudience, extraContext } = body;

    if (!clientName || !month || !year || !networks?.length) {
      return NextResponse.json({ error: "Parâmetros obrigatórios faltando" }, { status: 400 });
    }

    const monthName = MONTHS_PT[month - 1];
    const commemorativeDates = getCommemorativeDatesForMonth(month);
    const totalPosts = Math.round((frequency || 4) * 4.3);
    const networksStr = networks.join(", ");

    const allowedTypes: string[] = postTypes?.length
      ? postTypes
      : ["feed_image", "reels", "carrossel", "story"];

    const POST_TYPE_LABELS: Record<string, string> = {
      feed_image: "Post Estático (imagem única no feed)",
      reels: "Reels (vídeo curto vertical)",
      carrossel: "Carrossel (múltiplos slides/imagens)",
      story: "Stories (conteúdo temporário 24h)",
      feed_video: "Vídeo Feed (vídeo longo no feed)",
      shorts: "Shorts (vídeo curto YouTube)",
    };
    const allowedTypesLabels = allowedTypes.map((t) => POST_TYPE_LABELS[t] || t).join(", ");
    const allowedTypesEnum = allowedTypes.join("|");

    const systemPrompt = `Você é um especialista em marketing digital e social media manager sênior.
Sua função é criar cronogramas de postagens detalhados, criativos e estratégicos para redes sociais.
Sempre responda APENAS com JSON válido, sem comentários, sem markdown, sem explicações adicionais.`;

    const userPrompt = `Crie um cronograma completo de posts para ${monthName} de ${year}.

DADOS DO CLIENTE:
- Nome: ${clientName}
- Nicho: ${clientNiche || "Geral"}
- Redes sociais: ${networksStr}
- Formatos PERMITIDOS (use APENAS estes): ${allowedTypesLabels}
- Frequência: ${frequency || 4} posts por semana (total aproximado: ${totalPosts} posts no mês)
- Tom de voz: ${tone || "Profissional e engajante"}
- Público-alvo: ${targetAudience || "Geral"}

DATAS COMEMORATIVAS EM ${monthName.toUpperCase()}:
${commemorativeDates}

${extraContext ? `INSTRUÇÕES ESPECIAIS PARA ESTE MÊS:\n${extraContext}\n\n` : ""}INSTRUÇÕES:
1. Distribua os posts uniformemente ao longo do mês (evite finais de semana para nichos B2B)
2. Use SOMENTE os formatos permitidos listados acima — não invente outros
3. Varie entre os formatos disponíveis de forma estratégica
4. Para datas comemorativas relevantes ao nicho, crie posts temáticos
5. Cada copy deve ser criativa, em português brasileiro, com call-to-action claro
6. Inclua 10-15 hashtags relevantes por post
7. O content_description deve ser um brief detalhado para o criador de conteúdo
8. Horários sugeridos: Reels/Shorts 19h-21h, Feed/Carrossel 12h ou 18h, Stories 9h ou 20h
9. Para Stories, prefira horários de maior engajamento (manhã ou noite)

Retorne EXATAMENTE este JSON (sem nenhum texto antes ou depois):
{
  "posts": [
    {
      "title": "título curto do post (máx 80 chars)",
      "post_type": "${allowedTypesEnum}",
      "network": "instagram|facebook|tiktok|linkedin|twitter|youtube",
      "scheduled_date": "${year}-${String(month).padStart(2, "0")}-DD",
      "scheduled_time": "HH:MM",
      "copy": "legenda completa com emojis e call-to-action",
      "hashtags": ["hashtag1", "hashtag2"],
      "content_description": "brief detalhado para o criador: o que filmar/fotografar, ângulos, referências visuais, texto na arte se houver"
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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.75,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Groq API error:", error);
      return NextResponse.json({ error: "Erro na geração pela IA" }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ error: "Resposta vazia da IA" }, { status: 500 });
    }

    const parsed = JSON.parse(content);

    if (!parsed.posts || !Array.isArray(parsed.posts)) {
      return NextResponse.json({ error: "Formato inválido retornado pela IA" }, { status: 500 });
    }

    // Add position numbers
    const posts = parsed.posts.map((post: Record<string, unknown>, index: number) => ({
      ...post,
      position_number: index + 1,
      ai_generated: true,
    }));

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error in generate route:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
