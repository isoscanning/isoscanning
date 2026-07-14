import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/api-auth";
import { callGroqJson, GroqError, GROQ_SEARCH_MODEL } from "@/lib/server/groq";

// Análise de concorrentes a partir de até 3 @s do Instagram:
// usa o modelo agêntico da Groq (groq/compound-mini, busca web nativa) para
// pesquisar cada concorrente e devolver uma comparação estruturada com
// recomendações de diferenciação para a conta do cliente.
// Se a busca web falhar, cai para o modelo padrão (web_research: false).

interface CompetitorProfile {
  handle?: string;
  found?: boolean;
  summary?: string;
  content_strategy?: string;
  posting_style?: string;
  strengths?: string[];
  weaknesses?: string[];
}

interface CompetitorAnalysisResult {
  competitors?: CompetitorProfile[];
  gaps?: string[];
  differentiation?: string[];
  recommendations?: string[];
}

function toStringArray(value: unknown, max = 8): string[] {
  return Array.isArray(value)
    ? value.map((v) => String(v).trim()).filter(Boolean).slice(0, max)
    : [];
}

function sanitize(parsed: CompetitorAnalysisResult, handles: string[], webResearch: boolean) {
  const competitors = (Array.isArray(parsed.competitors) ? parsed.competitors : [])
    .slice(0, handles.length)
    .map((c, i) => ({
      handle: String(c.handle ?? handles[i] ?? "").replace(/^@/, "").trim(),
      found: c.found !== false,
      summary: String(c.summary ?? "").trim(),
      content_strategy: String(c.content_strategy ?? "").trim(),
      posting_style: String(c.posting_style ?? "").trim(),
      strengths: toStringArray(c.strengths, 6),
      weaknesses: toStringArray(c.weaknesses, 6),
    }));

  return {
    web_research: webResearch,
    generated_at: new Date().toISOString(),
    competitors,
    gaps: toStringArray(parsed.gaps),
    differentiation: toStringArray(parsed.differentiation),
    recommendations: toStringArray(parsed.recommendations),
  };
}

export async function POST(request: NextRequest) {
  try {
    // Rota proxia a chave Groq — exige usuário autenticado
    if (!(await requireUser(request))) {
      return NextResponse.json({ error: "Não autorizado. Faça login novamente." }, { status: 401 });
    }

    const body = await request.json();
    const { competitors, clientName, clientNiche, accountHandle } = body;

    const handles: string[] = (Array.isArray(competitors) ? competitors : [])
      .map((h) => String(h ?? "").replace(/^@/, "").trim())
      .filter(Boolean)
      .slice(0, 3);

    if (!handles.length) {
      return NextResponse.json({ error: "Informe pelo menos um @ de concorrente" }, { status: 400 });
    }

    const clientContext = [
      clientName ? `marca do cliente: ${clientName}` : null,
      accountHandle ? `conta do cliente: @${String(accountHandle).replace(/^@/, "")}` : null,
      clientNiche ? `nicho: ${clientNiche}` : null,
    ].filter(Boolean).join("; ");

    const systemPrompt = `Você é um estrategista de social media sênior fazendo análise competitiva de contas de Instagram.
Seja honesto: se não encontrar informações confiáveis sobre um concorrente, marque found: false nele em vez de inventar.
Todo o texto em português brasileiro. Responda APENAS com um objeto JSON válido, sem markdown nem texto fora do JSON.`;

    const jsonShape = `{
  "competitors": [
    {
      "handle": "sem o @",
      "found": true,
      "summary": "resumo de 2-3 frases sobre a marca e presença digital",
      "content_strategy": "o que a conta posta e qual estratégia de conteúdo aparenta seguir",
      "posting_style": "estilo visual e de linguagem percebido",
      "strengths": ["pontos fortes da presença digital"],
      "weaknesses": ["pontos fracos ou lacunas"]
    }
  ],
  "gaps": ["temas/formatos que NENHUM dos concorrentes explora bem (oportunidades de espaço vazio)"],
  "differentiation": ["como o cliente pode se diferenciar concretamente de cada concorrente"],
  "recommendations": ["4 a 6 ações práticas de conteúdo para superar os concorrentes"]
}`;

    const userPrompt = `Pesquise na internet sobre estas contas de Instagram concorrentes${clientContext ? ` (${clientContext})` : ""}:
${handles.map((h) => `- @${h} (instagram.com/${h})`).join("\n")}

Procure: os perfis no Instagram, sites oficiais, notícias e conteúdo público sobre cada marca.

Depois compare-as e produza a análise competitiva voltada para o cliente${clientName ? ` (${clientName})` : ""}:

${jsonShape}

Inclua um objeto em "competitors" para CADA um dos ${handles.length} @s informados, na mesma ordem.`;

    let parsed: CompetitorAnalysisResult | null = null;
    let webResearch = true;

    try {
      parsed = await callGroqJson<CompetitorAnalysisResult>({
        systemPrompt,
        userPrompt,
        model: GROQ_SEARCH_MODEL,
        jsonMode: false, // modelos compound não suportam response_format
        temperature: 0.4,
        maxTokens: 6144,
        retries: 1,
      });
    } catch (err) {
      console.error("competitor-analysis: web search model failed, falling back:", err);
      webResearch = false;
      parsed = await callGroqJson<CompetitorAnalysisResult>({
        systemPrompt,
        userPrompt: `Você NÃO tem acesso à internet. Com base apenas no seu conhecimento sobre o nicho${clientNiche ? ` de ${clientNiche}` : ""} e nos nomes das contas concorrentes (${handles.map((h) => `@${h}`).join(", ")}), produza uma análise competitiva de referência, marcando "found": false em cada concorrente e deixando claro nos textos que a análise é baseada no nicho, não em dados reais das contas.

Retorne EXATAMENTE este JSON:
${jsonShape}`,
        temperature: 0.5,
        maxTokens: 4096,
        retries: 1,
      });
    }

    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ error: "A IA não retornou uma análise válida. Tente novamente." }, { status: 500 });
    }

    return NextResponse.json({ analysis: sanitize(parsed, handles, webResearch) });
  } catch (error) {
    console.error("Error in competitor-analysis route:", error);
    if (error instanceof GroqError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
