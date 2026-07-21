import { NextRequest, NextResponse } from "next/server";
import { requireUser, checkAiCalendarQuota, recordAiCalendarUsage } from "@/lib/server/api-auth";
import { callGroqJson, GroqError } from "@/lib/server/groq";

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

const VALID_NETWORKS = ["instagram", "facebook", "tiktok", "linkedin", "twitter", "youtube"];

const POST_TYPE_LABELS: Record<string, string> = {
  feed_image: "Post Estático (imagem única no feed)",
  reels: "Reels (vídeo curto vertical)",
  carrossel: "Carrossel (múltiplos slides/imagens)",
  story: "Stories (conteúdo temporário 24h)",
  feed_video: "Vídeo Feed (vídeo longo no feed)",
  shorts: "Shorts (vídeo curto YouTube)",
  thread: "Thread (sequência de textos)",
  influencer: "Influencer (post em parceria)",
};

// Diretrizes específicas por rede, injetadas apenas para as redes selecionadas
const NETWORK_GUIDELINES: Record<string, string> = {
  instagram: "Instagram: a 1ª linha da copy é o gancho (aparece antes do \"...mais\"); Reels 19h-21h, Carrossel/Feed 12h ou 18h, Stories 9h ou 20h; carrosséis educativos e Reels de descoberta performam melhor.",
  facebook: "Facebook: textos um pouco mais longos funcionam; público tende a ser mais velho; horários 12h-14h e 19h-21h; priorize conteúdo compartilhável e de comunidade.",
  tiktok: "TikTok: gancho nos 2 primeiros segundos (descreva isso no brief); tom autêntico e menos institucional; 18h-22h; use tendências adaptadas ao nicho.",
  linkedin: "LinkedIn: tom profissional com storytelling; poste em dias úteis 8h-10h ou 12h; evite fins de semana; conteúdo de autoridade, bastidores de negócio e dados do setor.",
  twitter: "X/Twitter: textos curtos e diretos, opinião e conversa; threads para conteúdo educativo; 9h-11h e 19h-21h; no máximo 1-2 hashtags.",
  youtube: "YouTube: Shorts com gancho imediato; título otimizado para busca; 12h ou 19h-21h; descreva no brief a estrutura do vídeo (gancho, desenvolvimento, CTA).",
};

// Estratégia de mix de conteúdo conforme o objetivo principal do cliente
const OBJECTIVE_STRATEGIES: Record<string, { label: string; mix: string }> = {
  vendas: {
    label: "Gerar vendas / leads",
    mix: "35% conteúdo de oferta/venda (benefícios, quebra de objeções, urgência), 25% educativo que prepara para a compra, 20% prova social (resultados, depoimentos, casos), 20% engajamento/relacionamento. CTAs direcionados a compra, orçamento ou contato.",
  },
  engajamento: {
    label: "Aumentar engajamento",
    mix: "35% conteúdo de engajamento (perguntas, enquetes, opinião, memes do nicho), 30% educativo, 20% relacionamento/bastidores, 15% venda leve. CTAs que pedem comentário, compartilhamento ou salvamento.",
  },
  autoridade: {
    label: "Construir autoridade",
    mix: "45% educativo profundo (dicas, mitos e verdades, erros comuns, dados), 20% prova social e resultados, 20% bastidores e posicionamento, 15% venda consultiva. CTAs que reforçam expertise (baixar material, agendar consulta).",
  },
  seguidores: {
    label: "Atrair novos seguidores",
    mix: "40% conteúdo de descoberta com potencial de alcance (Reels, tendências, listas), 30% educativo compartilhável, 20% engajamento, 10% venda. CTAs que pedem seguir o perfil e compartilhar.",
  },
  lancamento: {
    label: "Lançamento de produto/serviço",
    mix: "estruture o mês como uma jornada de lançamento: 1ª fase antecipação/curiosidade, 2ª fase educação sobre o problema que o produto resolve, 3ª fase revelação e oferta com urgência, 4ª fase prova social e última chamada. CTAs progressivos (ativar lembrete → lista de espera → comprar).",
  },
  relacionamento: {
    label: "Relacionamento com clientes",
    mix: "35% bastidores e humanização da marca, 25% conteúdo de comunidade (UGC, depoimentos, perguntas), 25% educativo, 15% venda leve. CTAs de conversa e proximidade.",
  },
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

interface HolidayEntry {
  date: string;
  name: string;
  type: string;
  location?: string;
}

function buildHolidaysSection(holidays: HolidayEntry[] | undefined): string {
  if (!holidays?.length) return "";
  const TYPE_LABELS: Record<string, string> = {
    nacional: "Feriado Nacional", estadual: "Feriado Estadual", municipal: "Feriado Municipal",
    comercial: "Data Comemorativa", evento: "Evento", custom: "Data Especial",
  };
  const lines = holidays.map((h) => {
    const [y, m, d] = h.date.split("-");
    const label = TYPE_LABELS[h.type] ?? "Data Especial";
    const loc = h.location ? ` — ${h.location}` : "";
    return `- ${d}/${m}/${y}: ${h.name} [${label}${loc}]`;
  });
  return `FERIADOS E DATAS ESPECIAIS SELECIONADOS PELO GESTOR (OBRIGATÓRIO criar posts temáticos para eles):\n${lines.join("\n")}\n\n`;
}

/** Monta a seção de contexto do cliente apenas com os campos preenchidos */
function buildClientSection(fields: Array<[string, string | undefined | null]>): string {
  return fields
    .filter(([, value]) => value && String(value).trim().length > 0)
    .map(([label, value]) => `- ${label}: ${String(value).trim()}`)
    .join("\n");
}

interface NormalizeContext {
  year: number;
  month: number;
  daysInMonth: number;
  allowedTypes: string[];
  networks: string[];
  effectiveStartDay?: number;
}

/**
 * Valida e normaliza os posts retornados pela IA: datas dentro do mês,
 * formatos/redes permitidos, hashtags limpas, sem duplicatas, ordenados.
 */
function normalizePosts(rawPosts: unknown[], ctx: NormalizeContext) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const seen = new Set<string>();
  const normalized: Record<string, unknown>[] = [];

  for (const raw of rawPosts) {
    if (!raw || typeof raw !== "object") continue;
    const p = raw as Record<string, unknown>;

    const title = String(p.title ?? "").trim().slice(0, 80);
    if (!title) continue;

    const dateMatch = String(p.scheduled_date ?? "").match(/\d{4}-(\d{1,2})-(\d{1,2})/);
    if (!dateMatch) continue;
    let day = parseInt(dateMatch[2], 10);
    if (!Number.isFinite(day) || day < 1) continue;
    day = Math.min(day, ctx.daysInMonth);
    if (ctx.effectiveStartDay && day < ctx.effectiveStartDay) continue;
    const scheduled_date = `${ctx.year}-${pad(ctx.month)}-${pad(day)}`;

    const post_type = ctx.allowedTypes.includes(String(p.post_type)) ? String(p.post_type) : ctx.allowedTypes[0];
    const network = ctx.networks.includes(String(p.network)) ? String(p.network) : ctx.networks[0];

    const timeMatch = String(p.scheduled_time ?? "").match(/^(\d{1,2}):(\d{2})/);
    const scheduled_time = timeMatch
      ? `${pad(Math.min(23, parseInt(timeMatch[1], 10)))}:${timeMatch[2]}`
      : null;

    const hashtags = Array.isArray(p.hashtags)
      ? p.hashtags.map((h) => String(h).replace(/^#/, "").trim()).filter(Boolean).slice(0, 20)
      : [];

    const dedupeKey = `${scheduled_date}|${title.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    normalized.push({
      title,
      post_type,
      network,
      scheduled_date,
      scheduled_time,
      copy: typeof p.copy === "string" ? p.copy : "",
      hashtags,
      content_description: typeof p.content_description === "string" ? p.content_description : "",
    });
  }

  normalized.sort((a, b) =>
    String(a.scheduled_date).localeCompare(String(b.scheduled_date)) ||
    String(a.scheduled_time ?? "").localeCompare(String(b.scheduled_time ?? ""))
  );

  return normalized.map((post, index) => ({
    ...post,
    position_number: index + 1,
    ai_generated: true,
  }));
}

export async function POST(request: NextRequest) {
  try {
    // Rota proxia a chave Groq — exige usuário autenticado
    const auth = await requireUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Não autorizado. Faça login novamente." }, { status: 401 });
    }

    // Limite de plano: Free = 1 calendário com IA por mês
    const quota = await checkAiCalendarQuota(auth);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error:
            `Você já usou ${quota.used} de ${quota.limit} geração(ões) de calendário com IA este mês. ` +
            `Faça upgrade do plano para gerações ilimitadas.`,
          planLimit: true,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      clientName, clientNiche, month, year, networks, postTypes, frequency, tone,
      targetAudience, extraContext, startDay, holidays,
      // Briefing avançado (opcionais)
      description, objective, productsServices, differentials, avoidTopics, preferredCta,
      // Anamnese da conta (gerada por /account-analysis) e diagnóstico do relatório mensal
      instagramHandle, accountAnalysis, performanceInsights,
      // Documento de marketing da marca (.md) enviado no briefing
      brandContext,
    } = body;

    if (!clientName || !month || !year || !networks?.length) {
      return NextResponse.json({ error: "Parâmetros obrigatórios faltando" }, { status: 400 });
    }

    const validNetworks: string[] = (networks as string[]).filter((n) => VALID_NETWORKS.includes(n));
    if (!validNetworks.length) {
      return NextResponse.json({ error: "Nenhuma rede social válida informada" }, { status: 400 });
    }

    const monthName = MONTHS_PT[month - 1];
    const commemorativeDates = getCommemorativeDatesForMonth(month);
    const effectiveStartDay: number | undefined = startDay && startDay > 1 ? Number(startDay) : undefined;
    const daysInMonth = new Date(year, month, 0).getDate();
    const remainingDays = effectiveStartDay ? daysInMonth - effectiveStartDay + 1 : daysInMonth;
    const totalPosts = Math.max(1, Math.round(((frequency || 4) * 4.3) * (remainingDays / daysInMonth)));

    const allowedTypes: string[] = postTypes?.length
      ? postTypes
      : ["feed_image", "reels", "carrossel", "story"];
    const allowedTypesLabels = allowedTypes.map((t) => POST_TYPE_LABELS[t] || t).join(", ");
    const allowedTypesEnum = allowedTypes.join("|");
    const networksEnum = validNetworks.join("|");

    const strategy = OBJECTIVE_STRATEGIES[objective as string];
    const networkGuidelines = validNetworks
      .map((n) => NETWORK_GUIDELINES[n])
      .filter(Boolean)
      .map((g) => `- ${g}`)
      .join("\n");

    const clientSection = buildClientSection([
      ["Nome da marca/cliente", clientName],
      ["Conta no Instagram", instagramHandle ? `@${String(instagramHandle).replace(/^@/, "")}` : undefined],
      ["Nicho/segmento", clientNiche || "Geral"],
      ["Sobre o cliente", description],
      ["Produtos/serviços em destaque", productsServices],
      ["Diferenciais competitivos", differentials],
      ["Público-alvo", targetAudience || "Geral"],
      ["Objetivo principal do mês", strategy ? strategy.label : objective],
      ["CTA preferido", preferredCta],
    ]);

    // Seção de anamnese da conta (quando o gestor rodou a análise do @)
    let analysisSection = "";
    if (accountAnalysis && typeof accountAnalysis === "object") {
      const a = accountAnalysis as Record<string, unknown>;
      const joinArr = (v: unknown) => (Array.isArray(v) && v.length ? v.join("; ") : undefined);
      const lines = buildClientSection([
        ["Resumo da presença digital", a.summary as string],
        ["Tom de voz já usado na conta", a.tone_of_voice as string],
        ["Temas que a conta já trabalha", joinArr(a.content_themes)],
        ["Posicionamento percebido", a.positioning as string],
        ["Pontos fortes atuais", joinArr(a.strengths)],
        ["Pontos fracos a corrigir", joinArr(a.weaknesses)],
        ["Oportunidades de conteúdo", joinArr(a.opportunities)],
        ["Pilares recomendados", joinArr(a.suggested_pillars)],
      ]);
      if (lines) {
        analysisSection = `═══ ANAMNESE DA CONTA (análise de IA${a.web_research === false ? ", baseada no nicho" : ", com pesquisa na internet"}) ═══
${lines}
Use a anamnese assim: mantenha coerência com a identidade e o tom já existentes da conta, corrija os pontos fracos e explore as oportunidades listadas nos posts do mês.

`;
      }
    }

    const insightsSection = performanceInsights && String(performanceInsights).trim()
      ? `═══ DIAGNÓSTICO DE PERFORMANCE DO MÊS ANTERIOR (aplique estas diretrizes) ═══\n${String(performanceInsights).trim()}\n\n`
      : "";

    // Documento de marketing da marca (.md) — truncado para caber no contexto do modelo
    const MAX_BRAND_CONTEXT_CHARS = 20000;
    let brandContextSection = "";
    if (brandContext && String(brandContext).trim()) {
      let doc = String(brandContext).trim();
      if (doc.length > MAX_BRAND_CONTEXT_CHARS) {
        doc = doc.slice(0, MAX_BRAND_CONTEXT_CHARS) + "\n[... documento truncado ...]";
      }
      brandContextSection = `═══ DOCUMENTO DE MARKETING DA MARCA (fornecido pelo cliente — trate como fonte de verdade) ═══
Este documento contém a leitura de marketing completa da empresa (identidade, posicionamento, personas, linguagem, estratégia). Todo o cronograma deve estar alinhado a ele; em caso de conflito com informações genéricas, o documento prevalece.
---
${doc}
---

`;
    }

    const systemPrompt = `Você é um social media strategist sênior, especialista em marketing digital para marcas brasileiras.
Você domina planejamento editorial por pilares de conteúdo, copywriting de conversão (ganchos, storytelling, CTA) e as boas práticas de cada rede social.

REGRAS INEGOCIÁVEIS:
1. Cada post deve ser ÚNICO — nunca repita títulos, ganchos, ideias ou estruturas de copy entre os posts do mês.
2. Nada de conteúdo genérico que serviria para qualquer empresa: todo post deve estar amarrado ao cliente, nicho, produtos e diferenciais informados.
3. Todo o conteúdo em português brasileiro natural e fluente.
4. Respeite EXATAMENTE os formatos e redes permitidos.
5. Responda APENAS com JSON válido — sem markdown, sem comentários, sem texto fora do JSON.`;

    const userPrompt = `Crie o cronograma editorial de ${monthName} de ${year} para o cliente abaixo.

═══ CONTEXTO DO CLIENTE ═══
${clientSection}

${brandContextSection}${analysisSection}${insightsSection}═══ CONFIGURAÇÃO DO CRONOGRAMA ═══
- Redes sociais (use APENAS estas): ${validNetworks.join(", ")}
- Formatos PERMITIDOS (use APENAS estes): ${allowedTypesLabels}
- Volume: gere EXATAMENTE ${totalPosts} posts (${frequency || 4} por semana), distribuídos uniformemente ${effectiveStartDay ? `do dia ${effectiveStartDay} ao dia ${daysInMonth}` : "ao longo do mês inteiro"}
- Tom de voz: ${tone || "Profissional e engajante"}

═══ ESTRATÉGIA DE CONTEÚDO ═══
${strategy
  ? `Objetivo do mês: ${strategy.label}. Mix de conteúdo recomendado: ${strategy.mix}`
  : "Equilibre o mês entre conteúdo educativo (~40%), engajamento (~25%), venda (~20%) e relacionamento/bastidores (~15%)."}
Distribua os pilares ao longo das semanas (não concentre todo conteúdo de venda na mesma semana).
${avoidTopics ? `\nEVITE OBRIGATORIAMENTE (não crie posts sobre isso e não use estas abordagens): ${avoidTopics}` : ""}

═══ BOAS PRÁTICAS POR REDE ═══
${networkGuidelines || "- Siga as boas práticas gerais de cada rede."}

═══ DATAS COMEMORATIVAS EM ${monthName.toUpperCase()} ═══
${commemorativeDates}

${buildHolidaysSection(holidays)}${extraContext ? `═══ INSTRUÇÕES ESPECIAIS DO GESTOR (prioridade máxima) ═══\n${extraContext}\n\n` : ""}${effectiveStartDay ? `RESTRIÇÃO IMPORTANTE: gere posts APENAS do dia ${effectiveStartDay} ao dia ${daysInMonth}. Nenhum post antes do dia ${effectiveStartDay}.\n\n` : ""}═══ REGRAS DE QUALIDADE DE CADA POST ═══
1. "title": título curto e específico (máx 80 caracteres), que resuma a ideia do post — nunca genérico como "Post motivacional".
2. "copy": legenda completa e pronta para publicar:
   - 1ª linha = gancho forte (pergunta, dado surpreendente ou dor do público);
   - corpo escaneável com quebras de linha (\\n) e emojis com moderação;
   - termina com CTA claro alinhado ao objetivo do mês${preferredCta ? ` (quando fizer sentido, use o CTA preferido do cliente)` : ""};
   - adapte o comprimento à rede (X/Twitter curto, LinkedIn mais denso, Instagram médio).
3. "hashtags": 8 a 15 hashtags SEM "#", misturando alto volume, nicho específico e localização/marca quando aplicável. Nunca repita o mesmo conjunto em todos os posts.
4. "content_description": brief ACIONÁVEL para o criador de conteúdo executar sem perguntar nada:
   - Reels/Shorts/TikTok: roteiro cena a cena (gancho dos 2s iniciais, desenvolvimento, encerramento) + sugestão de áudio/estilo;
   - Carrossel: conteúdo slide a slide (Slide 1: ..., Slide 2: ...);
   - Post estático: descrição da imagem, texto na arte e referência visual;
   - Stories: sequência de telas e stickers interativos (enquete, caixa de pergunta).
5. Para os feriados/datas listados, crie posts temáticos conectados ao nicho do cliente (não apenas "feliz data X").
6. Evite fins de semana para nichos B2B/corporativos; para varejo e lazer, fins de semana são permitidos.
7. Varie os horários conforme as boas práticas por rede acima.

Retorne EXATAMENTE este JSON (sem nenhum texto antes ou depois):
{
  "posts": [
    {
      "title": "título curto e específico (máx 80 chars)",
      "post_type": "${allowedTypesEnum}",
      "network": "${networksEnum}",
      "scheduled_date": "${year}-${String(month).padStart(2, "0")}-DD",
      "scheduled_time": "HH:MM",
      "copy": "legenda completa pronta para publicar",
      "hashtags": ["hashtag1", "hashtag2"],
      "content_description": "brief acionável para o criador de conteúdo"
    }
  ]
}`;

    const parsed = await callGroqJson<{ posts?: unknown[] }>({
      systemPrompt,
      userPrompt,
      temperature: 0.75,
      maxTokens: 8192,
      retries: 1,
    });

    if (!parsed.posts || !Array.isArray(parsed.posts)) {
      return NextResponse.json({ error: "Formato inválido retornado pela IA" }, { status: 500 });
    }

    const posts = normalizePosts(parsed.posts, {
      year: Number(year),
      month: Number(month),
      daysInMonth,
      allowedTypes,
      networks: validNetworks,
      effectiveStartDay,
    });

    if (posts.length === 0) {
      return NextResponse.json(
        { error: "A IA não retornou posts válidos. Tente gerar novamente." },
        { status: 500 }
      );
    }

    // Contabiliza a geração contra a cota mensal do plano
    await recordAiCalendarUsage(auth);

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error in generate route:", error);
    if (error instanceof GroqError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
