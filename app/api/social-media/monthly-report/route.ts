import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/api-auth";
import { callGroqJson, GroqError } from "@/lib/server/groq";

// Relatório mensal de resultados: recebe os posts do mês com métricas,
// calcula as estatísticas em código (rankings, totais, taxa de engajamento)
// e usa a IA apenas para o diagnóstico qualitativo + recomendações +
// sugestões de posts para o próximo mês.

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface ReportPostInput {
  id?: string;
  title?: string;
  post_type?: string;
  network?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  status?: string;
  metric_likes?: number | null;
  metric_comments?: number | null;
  metric_shares?: number | null;
  metric_saves?: number | null;
  metric_reach?: number | null;
  metric_views?: number | null;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

function computeStats(posts: ReportPostInput[]) {
  const enriched = posts.map((p) => {
    const likes = num(p.metric_likes);
    const comments = num(p.metric_comments);
    const shares = num(p.metric_shares);
    const saves = num(p.metric_saves);
    const reach = num(p.metric_reach);
    const views = num(p.metric_views);
    return {
      id: String(p.id ?? ""),
      title: String(p.title ?? "Sem título"),
      post_type: String(p.post_type ?? "feed_image"),
      network: String(p.network ?? "instagram"),
      scheduled_date: String(p.scheduled_date ?? ""),
      likes, comments, shares, saves, reach, views,
      engagement: likes + comments + shares + saves,
    };
  });

  const withMetrics = enriched.filter((p) => p.engagement > 0 || p.reach > 0 || p.views > 0);
  const totalLikes = enriched.reduce((s, p) => s + p.likes, 0);
  const totalComments = enriched.reduce((s, p) => s + p.comments, 0);
  const totalShares = enriched.reduce((s, p) => s + p.shares, 0);
  const totalSaves = enriched.reduce((s, p) => s + p.saves, 0);
  const totalReach = enriched.reduce((s, p) => s + p.reach, 0);
  const totalEngagement = totalLikes + totalComments + totalShares + totalSaves;

  const topPosts = [...withMetrics].sort((a, b) => b.engagement - a.engagement).slice(0, 5);

  const byType = new Map<string, { count: number; engagement: number }>();
  for (const p of withMetrics) {
    const entry = byType.get(p.post_type) ?? { count: 0, engagement: 0 };
    entry.count += 1;
    entry.engagement += p.engagement;
    byType.set(p.post_type, entry);
  }
  const formatBreakdown = [...byType.entries()]
    .map(([post_type, { count, engagement }]) => ({
      post_type,
      count,
      avgEngagement: Math.round(engagement / Math.max(1, count)),
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  return {
    stats: {
      totalPosts: enriched.length,
      publishedPosts: posts.filter((p) => p.status === "published").length,
      postsWithMetrics: withMetrics.length,
      totalLikes,
      totalComments,
      totalShares,
      totalSaves,
      totalReach,
      totalEngagement,
      avgEngagementPerPost: withMetrics.length ? Math.round(totalEngagement / withMetrics.length) : 0,
      engagementRate: totalReach > 0 ? Number(((totalEngagement / totalReach) * 100).toFixed(2)) : null,
      topPosts,
      formatBreakdown,
    },
    enriched,
    withMetrics,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Rota proxia a chave Groq — exige usuário autenticado
    if (!(await requireUser(request))) {
      return NextResponse.json({ error: "Não autorizado. Faça login novamente." }, { status: 401 });
    }

    const body = await request.json();
    const {
      clientName, clientNiche, objective, tone, targetAudience,
      month, year, posts, accountHandle,
    } = body;

    if (!clientName || !month || !year || !Array.isArray(posts)) {
      return NextResponse.json({ error: "Parâmetros obrigatórios faltando" }, { status: 400 });
    }
    if (posts.length === 0) {
      return NextResponse.json({ error: "Nenhum post no mês para analisar" }, { status: 400 });
    }

    const monthName = MONTHS_PT[Number(month) - 1];
    const { stats, withMetrics } = computeStats(posts as ReportPostInput[]);

    if (stats.postsWithMetrics === 0) {
      return NextResponse.json(
        { error: "Nenhum post do mês possui métricas registradas. Preencha as métricas (curtidas, comentários...) nos posts publicados antes de gerar o relatório." },
        { status: 400 }
      );
    }

    // Tabela compacta para o prompt (evita estourar contexto)
    const postsTable = withMetrics
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 40)
      .map((p) =>
        `- [${p.scheduled_date}] "${p.title}" (${p.post_type}/${p.network}): ${p.likes} curtidas, ${p.comments} comentários, ${p.shares} compart., ${p.saves} salvos${p.reach ? `, alcance ${p.reach}` : ""}${p.views ? `, ${p.views} views` : ""} → engajamento ${p.engagement}`
      )
      .join("\n");

    const formatTable = stats.formatBreakdown
      .map((f) => `- ${f.post_type}: ${f.count} posts, engajamento médio ${f.avgEngagement}`)
      .join("\n");

    const systemPrompt = `Você é um analista sênior de social media que escreve relatórios mensais de resultados para clientes de agência.
Seu diagnóstico é direto, baseado nos DADOS fornecidos (nunca invente números) e sempre termina em recomendações acionáveis.
Escreva em português brasileiro, em tom profissional e claro para o cliente final ler.
Responda APENAS com JSON válido, sem markdown nem texto fora do JSON.`;

    const userPrompt = `Analise os resultados de ${monthName} de ${year} da conta${accountHandle ? ` @${accountHandle}` : ""} do cliente abaixo e produza o relatório mensal.

CONTEXTO:
- Cliente: ${clientName}
- Nicho: ${clientNiche || "Geral"}
${objective ? `- Objetivo do mês: ${objective}` : ""}
${tone ? `- Tom de voz: ${tone}` : ""}
${targetAudience ? `- Público-alvo: ${targetAudience}` : ""}

NÚMEROS DO MÊS (calculados, use-os como verdade):
- Posts planejados: ${stats.totalPosts} | publicados: ${stats.publishedPosts} | com métricas: ${stats.postsWithMetrics}
- Totais: ${stats.totalLikes} curtidas, ${stats.totalComments} comentários, ${stats.totalShares} compartilhamentos, ${stats.totalSaves} salvos${stats.totalReach ? `, alcance total ${stats.totalReach}` : ""}
- Engajamento total: ${stats.totalEngagement} (média de ${stats.avgEngagementPerPost} por post)${stats.engagementRate !== null ? `\n- Taxa de engajamento sobre alcance: ${stats.engagementRate}%` : ""}

DESEMPENHO POR FORMATO:
${formatTable || "- sem dados por formato"}

POSTS COM MÉTRICAS (ordenados por engajamento):
${postsTable}

INSTRUÇÕES:
1. Identifique padrões REAIS nos dados: quais temas, formatos, dias e abordagens performaram melhor e pior.
2. Seja específico ao citar posts (use o título entre aspas).
3. As recomendações devem ser acionáveis e priorizadas (o que fazer MAIS, o que fazer MENOS, o que testar).
4. "next_month_strategy" é um parágrafo que servirá de instrução para a IA gerar o cronograma do próximo mês — escreva como diretriz prática (formatos a priorizar, temas a repetir/evitar, frequência).
5. Sugira 5 posts para o próximo mês inspirados no que melhor performou, cada um com justificativa ligada aos dados.

Retorne EXATAMENTE este JSON:
{
  "executive_summary": "resumo executivo do mês em 3-5 frases",
  "highlights": ["3-5 destaques do mês com números"],
  "what_worked": ["o que funcionou e por quê, citando posts"],
  "what_underperformed": ["o que performou abaixo e hipóteses do porquê"],
  "format_insights": "análise comparativa dos formatos (reels vs carrossel vs...)",
  "recommendations": ["4-6 recomendações acionáveis priorizadas"],
  "next_month_strategy": "diretriz prática para o cronograma do próximo mês",
  "suggested_posts": [
    { "title": "...", "post_type": "reels|carrossel|feed_image|story|shorts|thread", "network": "instagram|facebook|tiktok|linkedin|twitter|youtube", "rationale": "por que esse post, com base nos dados" }
  ]
}`;

    const ai = await callGroqJson<Record<string, unknown>>({
      systemPrompt,
      userPrompt,
      temperature: 0.5,
      maxTokens: 4096,
      retries: 1,
    });

    if (!ai.executive_summary) {
      return NextResponse.json({ error: "A IA não retornou um relatório válido. Tente novamente." }, { status: 500 });
    }

    return NextResponse.json({ stats, report: ai });
  } catch (error) {
    console.error("Error in monthly-report route:", error);
    if (error instanceof GroqError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
