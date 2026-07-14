import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/api-auth";
import { callGroqJson, GroqError } from "@/lib/server/groq";

// Gera 3 variações de legenda + hashtags para um post existente, cada uma com
// um ângulo diferente, respeitando o tom de voz da anamnese da conta quando houver.

const NETWORK_HINTS: Record<string, string> = {
  instagram: "Instagram: 1ª linha é o gancho (aparece antes do \"...mais\"); copy de tamanho médio, escaneável.",
  facebook: "Facebook: textos um pouco mais longos funcionam bem; tom de comunidade.",
  tiktok: "TikTok: tom autêntico e direto, menos institucional.",
  linkedin: "LinkedIn: tom profissional com storytelling; parágrafos curtos; poucas hashtags.",
  twitter: "X/Twitter: texto curto e direto; máximo 1-2 hashtags.",
  youtube: "YouTube: título otimizado para busca; descrição clara do vídeo.",
};

interface Variation {
  angle: string;
  copy: string;
  hashtags: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Rota proxia a chave Groq — exige usuário autenticado
    if (!(await requireUser(request))) {
      return NextResponse.json({ error: "Não autorizado. Faça login novamente." }, { status: 401 });
    }

    const body = await request.json();
    const {
      title, postType, network, copy, contentDescription,
      clientName, clientNiche, tone, targetAudience, objective,
      anamneseTone, positioning,
    } = body;

    if (!title || !postType || !network) {
      return NextResponse.json({ error: "Parâmetros obrigatórios faltando" }, { status: 400 });
    }

    const networkHint = NETWORK_HINTS[network as string];

    const contextLines = [
      `- Título/Tema: ${title}`,
      `- Formato: ${postType}`,
      `- Rede: ${network}`,
      clientName ? `- Cliente: ${clientName}` : null,
      clientNiche ? `- Nicho: ${clientNiche}` : null,
      tone ? `- Tom de voz definido no briefing: ${tone}` : null,
      anamneseTone ? `- Tom de voz identificado na anamnese da conta (siga este estilo): ${anamneseTone}` : null,
      positioning ? `- Posicionamento da marca: ${positioning}` : null,
      targetAudience ? `- Público-alvo: ${targetAudience}` : null,
      objective ? `- Objetivo do mês: ${objective}` : null,
    ].filter(Boolean).join("\n");

    const systemPrompt = `Você é um copywriter sênior especialista em redes sociais brasileiras.
Você cria variações de legenda com ângulos criativos distintos, mantendo a identidade e o tom de voz da marca.
Escreva sempre em português brasileiro natural. Responda APENAS com JSON válido, sem markdown nem texto fora do JSON.`;

    const userPrompt = `Crie exatamente 3 variações de legenda para este post, cada uma com um ângulo criativo DIFERENTE (ex.: storytelling, pergunta provocativa, dado/estatística, dor do público, benefício direto, bastidores).

DADOS DO POST:
${contextLines}
${networkHint ? `\nBOA PRÁTICA DA REDE:\n- ${networkHint}` : ""}
${copy ? `\nCOPY ATUAL (use como referência de conteúdo, mas não repita a estrutura):\n${copy}` : ""}
${contentDescription ? `\nBRIEF DO POST:\n${contentDescription}` : ""}

REGRAS:
1. Cada copy deve começar com um gancho forte na 1ª linha, ter corpo escaneável com quebras de linha (\\n) e terminar com um CTA claro.
2. As 3 variações devem ser genuinamente diferentes entre si no ângulo e na abertura.
3. Se houver tom de voz da anamnese, TODAS as variações devem soar como a marca — vocabulário, energia e estilo.
4. Use emojis com moderação.
5. Cada variação inclui 8-15 hashtags relevantes SEM o caractere "#" (mix de volume alto + nicho), podendo variar entre as versões.
6. "angle" é um rótulo curto (2-4 palavras) do ângulo usado.

Retorne EXATAMENTE este JSON:
{
  "variations": [
    { "angle": "rótulo do ângulo", "copy": "legenda completa", "hashtags": ["hashtag1", "hashtag2"] },
    { "angle": "...", "copy": "...", "hashtags": ["..."] },
    { "angle": "...", "copy": "...", "hashtags": ["..."] }
  ]
}`;

    const parsed = await callGroqJson<{ variations?: Variation[] }>({
      systemPrompt,
      userPrompt,
      temperature: 0.9,
      maxTokens: 3072,
      retries: 1,
    });

    const variations = (Array.isArray(parsed.variations) ? parsed.variations : [])
      .filter((v) => v && typeof v.copy === "string" && v.copy.trim())
      .slice(0, 3)
      .map((v) => ({
        angle: typeof v.angle === "string" ? v.angle.trim().slice(0, 60) : "Variação",
        copy: v.copy.trim(),
        hashtags: Array.isArray(v.hashtags)
          ? v.hashtags.map((h) => String(h).replace(/^#/, "").trim()).filter(Boolean).slice(0, 20)
          : [],
      }));

    if (!variations.length) {
      return NextResponse.json({ error: "A IA não retornou variações válidas. Tente novamente." }, { status: 500 });
    }

    return NextResponse.json({ variations });
  } catch (error) {
    console.error("Error in copy-variations route:", error);
    if (error instanceof GroqError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
