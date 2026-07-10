import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/api-auth";
import { callGroqJson, GroqError } from "@/lib/server/groq";

// Refino rápido de um post existente com IA.
// scope "copy": reescreve apenas legenda + hashtags seguindo a instrução.
// scope "full": regenera o post inteiro (título, copy, hashtags e brief),
// mantendo a data — útil quando a ideia do post não agradou.

const NETWORK_HINTS: Record<string, string> = {
  instagram: "Instagram: 1ª linha é o gancho (aparece antes do \"...mais\"); copy de tamanho médio, escaneável.",
  facebook: "Facebook: textos um pouco mais longos funcionam bem; tom de comunidade.",
  tiktok: "TikTok: tom autêntico e direto, menos institucional.",
  linkedin: "LinkedIn: tom profissional com storytelling; parágrafos curtos; poucas hashtags.",
  twitter: "X/Twitter: texto curto e direto; máximo 1-2 hashtags.",
  youtube: "YouTube: título otimizado para busca; descrição clara do vídeo.",
};

export async function POST(request: NextRequest) {
  try {
    // Rota proxia a chave Groq — exige usuário autenticado
    if (!(await requireUser(request))) {
      return NextResponse.json({ error: "Não autorizado. Faça login novamente." }, { status: 401 });
    }

    const body = await request.json();
    const {
      scope = "copy", instruction,
      title, postType, network, copy, hashtags, contentDescription,
      clientName, clientNiche, tone, targetAudience, objective,
    } = body;

    if (!title || !postType || !network) {
      return NextResponse.json({ error: "Parâmetros obrigatórios faltando" }, { status: 400 });
    }

    const isFull = scope === "full";
    const networkHint = NETWORK_HINTS[network as string];

    const contextLines = [
      `- Título/Tema atual: ${title}`,
      `- Formato: ${postType}`,
      `- Rede: ${network}`,
      clientName ? `- Cliente: ${clientName}` : null,
      clientNiche ? `- Nicho: ${clientNiche}` : null,
      tone ? `- Tom de voz: ${tone}` : null,
      targetAudience ? `- Público-alvo: ${targetAudience}` : null,
      objective ? `- Objetivo do mês: ${objective}` : null,
    ].filter(Boolean).join("\n");

    const currentContent = [
      copy ? `Copy atual:\n${copy}` : null,
      Array.isArray(hashtags) && hashtags.length ? `Hashtags atuais: ${hashtags.join(", ")}` : null,
      isFull && contentDescription ? `Brief atual:\n${contentDescription}` : null,
    ].filter(Boolean).join("\n\n");

    const systemPrompt = `Você é um copywriter sênior especialista em redes sociais brasileiras.
Você refina posts existentes mantendo a essência da estratégia, mas elevando a qualidade do texto.
Escreva sempre em português brasileiro natural. Responda APENAS com JSON válido, sem markdown nem texto fora do JSON.`;

    const taskDescription = isFull
      ? `Regenere este post por completo (nova ideia de título, copy, hashtags e brief), mantendo o mesmo formato, rede e contexto do cliente.`
      : copy
        ? `Reescreva e melhore a copy deste post.`
        : `Crie a copy deste post.`;

    const userPrompt = `${taskDescription}

DADOS DO POST:
${contextLines}
${networkHint ? `\nBOA PRÁTICA DA REDE:\n- ${networkHint}` : ""}
${currentContent ? `\nCONTEÚDO ATUAL:\n${currentContent}` : ""}
${instruction ? `\nINSTRUÇÃO DO GESTOR (siga à risca, é a prioridade máxima):\n${instruction}` : ""}

REGRAS:
1. A copy deve começar com um gancho forte na 1ª linha, ter corpo escaneável com quebras de linha (\\n) e terminar com um CTA claro.
2. Use emojis com moderação.
3. Inclua 8-15 hashtags relevantes SEM o caractere "#" (mix de volume alto + nicho).
${isFull ? `4. O "content_description" deve ser um brief acionável para o criador de conteúdo (roteiro cena a cena para vídeo, slide a slide para carrossel, descrição da arte para imagem).
5. O novo "title" deve ser curto e específico (máx 80 caracteres).` : ""}

Retorne EXATAMENTE este JSON:
${isFull
  ? `{
  "title": "novo título (máx 80 chars)",
  "copy": "nova legenda completa",
  "hashtags": ["hashtag1", "hashtag2"],
  "content_description": "novo brief acionável"
}`
  : `{
  "copy": "nova legenda completa",
  "hashtags": ["hashtag1", "hashtag2"]
}`}`;

    const parsed = await callGroqJson<Record<string, unknown>>({
      systemPrompt,
      userPrompt,
      temperature: 0.8,
      maxTokens: 2048,
      retries: 1,
    });

    if (typeof parsed.copy !== "string" || !parsed.copy.trim()) {
      return NextResponse.json({ error: "A IA não retornou uma copy válida. Tente novamente." }, { status: 500 });
    }

    const result: Record<string, unknown> = {
      copy: parsed.copy,
      hashtags: Array.isArray(parsed.hashtags)
        ? parsed.hashtags.map((h) => String(h).replace(/^#/, "").trim()).filter(Boolean).slice(0, 20)
        : [],
    };

    if (isFull) {
      result.title = typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim().slice(0, 80)
        : title;
      result.content_description = typeof parsed.content_description === "string"
        ? parsed.content_description
        : contentDescription ?? "";
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in refine-post route:", error);
    if (error instanceof GroqError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
