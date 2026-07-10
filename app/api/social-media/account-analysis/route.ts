import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/api-auth";
import { callGroqJson, GroqError, GROQ_SEARCH_MODEL } from "@/lib/server/groq";

// Anamnese de uma conta do Instagram a partir do @:
// usa o modelo agêntico da Groq (groq/compound-mini, com busca web nativa)
// para pesquisar a conta/empresa na internet e devolver uma análise
// estruturada (tom percebido, temas, público, oportunidades...).
// Se a busca web falhar, cai para o modelo padrão usando apenas o
// conhecimento do modelo — o campo web_research indica qual caminho foi usado.

interface AnalysisResult {
  found?: boolean;
  summary?: string;
  tone_of_voice?: string;
  content_themes?: string[];
  target_audience?: string;
  positioning?: string;
  strengths?: string[];
  weaknesses?: string[];
  opportunities?: string[];
  suggested_pillars?: string[];
}

function toStringArray(value: unknown, max = 8): string[] {
  return Array.isArray(value)
    ? value.map((v) => String(v).trim()).filter(Boolean).slice(0, max)
    : [];
}

function sanitize(parsed: AnalysisResult, webResearch: boolean) {
  return {
    found: parsed.found !== false,
    web_research: webResearch,
    summary: String(parsed.summary ?? "").trim(),
    tone_of_voice: String(parsed.tone_of_voice ?? "").trim(),
    content_themes: toStringArray(parsed.content_themes),
    target_audience: String(parsed.target_audience ?? "").trim(),
    positioning: String(parsed.positioning ?? "").trim(),
    strengths: toStringArray(parsed.strengths),
    weaknesses: toStringArray(parsed.weaknesses),
    opportunities: toStringArray(parsed.opportunities),
    suggested_pillars: toStringArray(parsed.suggested_pillars),
  };
}

export async function POST(request: NextRequest) {
  try {
    // Rota proxia a chave Groq — exige usuário autenticado
    if (!(await requireUser(request))) {
      return NextResponse.json({ error: "Não autorizado. Faça login novamente." }, { status: 401 });
    }

    const body = await request.json();
    const { handle, clientName, clientNiche } = body;

    const cleanHandle = String(handle ?? "").replace(/^@/, "").trim();
    if (!cleanHandle) {
      return NextResponse.json({ error: "Informe o @ da conta" }, { status: 400 });
    }

    const systemPrompt = `Você é um estrategista de social media sênior fazendo a anamnese de uma conta de Instagram para assumir a gestão dela.
Seja honesto: se não encontrar informações confiáveis sobre a conta/empresa, diga isso (found: false) em vez de inventar.
Todo o texto em português brasileiro. Responda APENAS com um objeto JSON válido, sem markdown nem texto fora do JSON.`;

    const userPrompt = `Pesquise na internet sobre a conta de Instagram @${cleanHandle}${clientName ? ` (empresa/marca: ${clientName})` : ""}${clientNiche ? `, do nicho de ${clientNiche}` : ""}.

Procure: o perfil no Instagram (instagram.com/${cleanHandle}), site oficial, redes sociais, notícias, avaliações (Google/reclamações) e qualquer conteúdo público relevante sobre a marca.

Com base no que encontrar, produza a anamnese da conta:

{
  "found": true,
  "summary": "resumo de 2-4 frases sobre a marca e sua presença digital",
  "tone_of_voice": "tom de voz percebido nas comunicações da marca (ex: descontraído com gírias, técnico e sóbrio...)",
  "content_themes": ["temas/assuntos que a marca já trabalha no conteúdo"],
  "target_audience": "público-alvo aparente (demografia, interesses)",
  "positioning": "posicionamento da marca no mercado e diferenciais percebidos",
  "strengths": ["pontos fortes da presença digital atual"],
  "weaknesses": ["pontos fracos ou lacunas da presença digital"],
  "opportunities": ["oportunidades de conteúdo ainda não exploradas, relevantes para o nicho"],
  "suggested_pillars": ["3 a 5 pilares de conteúdo recomendados para a conta"]
}

Se não encontrar NADA confiável sobre a conta, retorne found: false com um summary explicando, e preencha as demais chaves com sugestões genéricas do nicho${clientNiche ? ` (${clientNiche})` : ""} deixando claro no texto que são baseadas no nicho, não na conta.`;

    let parsed: AnalysisResult | null = null;
    let webResearch = true;

    try {
      parsed = await callGroqJson<AnalysisResult>({
        systemPrompt,
        userPrompt,
        model: GROQ_SEARCH_MODEL,
        jsonMode: false, // modelos compound não suportam response_format
        temperature: 0.4,
        maxTokens: 4096,
        retries: 1,
      });
    } catch (err) {
      console.error("account-analysis: web search model failed, falling back:", err);
      webResearch = false;
      parsed = await callGroqJson<AnalysisResult>({
        systemPrompt,
        userPrompt: `Você NÃO tem acesso à internet. Com base apenas no seu conhecimento sobre o nicho${clientNiche ? ` de ${clientNiche}` : ""} e no nome da conta (@${cleanHandle}${clientName ? `, marca ${clientName}` : ""}), produza uma anamnese de referência, marcando "found": false e deixando claro no "summary" que a análise é baseada no nicho, não em dados reais da conta.

Retorne EXATAMENTE este JSON:
{
  "found": false,
  "summary": "...",
  "tone_of_voice": "...",
  "content_themes": ["..."],
  "target_audience": "...",
  "positioning": "...",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "opportunities": ["..."],
  "suggested_pillars": ["..."]
}`,
        temperature: 0.5,
        maxTokens: 2048,
        retries: 1,
      });
    }

    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ error: "A IA não retornou uma análise válida. Tente novamente." }, { status: 500 });
    }

    return NextResponse.json({ analysis: sanitize(parsed, webResearch), handle: cleanHandle });
  } catch (error) {
    console.error("Error in account-analysis route:", error);
    if (error instanceof GroqError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
