// Núcleo da sincronização de métricas do Instagram — compartilhado entre a
// rota manual (/api/social-media/instagram/sync) e o cron diário
// (/api/social-media/instagram/cron-sync).
//
// O que faz para um cronograma/mês:
// 1. lista as mídias publicadas na conta IG no período;
// 2. faz o matching mídia ↔ post do cronograma (por ig_media_id salvo,
//    depois por data de publicação + similaridade da legenda);
// 3. busca os insights de cada mídia (alcance, salvos, compartilhamentos, views);
// 4. atualiza os posts casados (métricas + horário real + status publicado +
//    legenda/hashtags reais) e IMPORTA para o cronograma as publicações
//    feitas fora do planejamento.

import { SupabaseClient } from "@supabase/supabase-js";
import { graphGet } from "@/lib/server/meta";

export interface IgConnectionRow {
  schedule_id: string;
  ig_user_id: string;
  ig_username?: string | null;
  access_token: string;
  connected_by?: string | null;
}

export interface InstagramSyncResult {
  mediaFound: number;
  matched: number;
  updated: number;
  created: number;
  unmatchedPosts: number;
}

interface IgMedia {
  id: string;
  caption?: string;
  media_type?: string;          // IMAGE | VIDEO | CAROUSEL_ALBUM
  media_product_type?: string;  // FEED | REELS | STORY
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
}

interface DbPost {
  id: string;
  title: string;
  copy: string | null;
  scheduled_date: string;
  status: string;
  ig_media_id: string | null;
}

/** Data local (America/Sao_Paulo) de um timestamp da Meta, em YYYY-MM-DD */
function brDate(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  } catch {
    return timestamp.slice(0, 10);
  }
}

/** Hora local (America/Sao_Paulo) de um timestamp da Meta, em HH:MM */
function brTime(timestamp: string): string | null {
  try {
    return new Date(timestamp).toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch {
    return null;
  }
}

function extractHashtags(caption: string): string[] {
  const matches = caption.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  return [...new Set(matches.map((h) => h.slice(1)))].slice(0, 30);
}

/** Título derivado da legenda: primeira linha sem hashtags (máx 80 chars) */
function titleFromCaption(caption: string, fallback: string): string {
  const firstLine = caption
    .split("\n")
    .map((l) => l.replace(/#[^\s#]+/g, "").trim())
    .find(Boolean);
  return (firstLine || fallback).slice(0, 80);
}

/** Mapeia o tipo de mídia da Meta para o post_type do cronograma */
function mapPostType(md: IgMedia): string {
  if (md.media_product_type === "REELS") return "reels";
  if (md.media_product_type === "STORY") return "story";
  if (md.media_type === "CAROUSEL_ALBUM") return "carrossel";
  return "feed_image";
}

/** Normaliza texto para comparação: minúsculas, sem acentos/símbolos/hashtags */
function tokenize(text: string | null | undefined): Set<string> {
  if (!text) return new Set();
  const clean = text
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "") // remove acentos
    .replace(/#\w+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ");
  return new Set(clean.split(/\s+/).filter((w) => w.length > 3));
}

function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / Math.min(a.size, b.size);
}

/** Busca insights tolerando métricas não suportadas pelo tipo de mídia */
async function fetchInsights(
  mediaId: string,
  productType: string | undefined,
  token: string
): Promise<Record<string, number>> {
  const metricSets =
    productType === "REELS"
      ? [["reach", "saved", "shares", "views"], ["reach", "saved", "shares", "plays"], ["reach", "saved"]]
      : [["reach", "saved", "shares"], ["reach", "saved"], ["reach"]];

  for (const metrics of metricSets) {
    try {
      const res = await graphGet<{ data: { name: string; values?: { value?: number }[] }[] }>(
        `/${mediaId}/insights`,
        { metric: metrics.join(","), access_token: token }
      );
      const out: Record<string, number> = {};
      for (const m of res.data || []) {
        const value = m.values?.[0]?.value;
        if (typeof value === "number") out[m.name] = value;
      }
      return out;
    } catch {
      // tenta o próximo conjunto de métricas
    }
  }
  return {};
}

export async function syncInstagramMonth(options: {
  admin: SupabaseClient;
  connection: IgConnectionRow;
  month: number;
  year: number;
  /** Autor dos posts importados (na rota manual: usuário; no cron: connected_by) */
  createdBy?: string | null;
}): Promise<InstagramSyncResult> {
  const { admin, connection, createdBy } = options;
  const m = Number(options.month);
  const y = Number(options.year);
  const scheduleId = connection.schedule_id;

  // Janela do mês com 1 dia de margem em cada ponta (fuso)
  const since = Math.floor(Date.UTC(y, m - 1, 1) / 1000) - 86400;
  const until = Math.floor(Date.UTC(y, m, 1) / 1000) + 86400;

  // 1. Mídias do período (paginado, até ~300)
  const media: IgMedia[] = [];
  let next: string | null = `/${connection.ig_user_id}/media`;
  let pageCount = 0;
  while (next && pageCount < 3) {
    const res: { data?: IgMedia[]; paging?: { next?: string } } = await graphGet(
      next,
      next.startsWith("http")
        ? {}
        : {
            fields: "id,caption,media_type,media_product_type,timestamp,like_count,comments_count,permalink",
            since: String(since),
            until: String(until),
            limit: "100",
            access_token: connection.access_token,
          }
    );
    media.push(...(res.data || []));
    next = res.paging?.next ?? null;
    pageCount++;
  }

  // 2. Posts do mês no cronograma
  const daysInMonth = new Date(y, m, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  const { data: posts } = await admin
    .from("social_media_posts")
    .select("id, title, copy, scheduled_date, status, ig_media_id")
    .eq("schedule_id", scheduleId)
    .gte("scheduled_date", `${y}-${pad(m)}-01`)
    .lte("scheduled_date", `${y}-${pad(m)}-${pad(daysInMonth)}`);

  const dbPosts = (posts ?? []) as DbPost[];

  // 3. Matching
  const matches = new Map<string, IgMedia>(); // postId → media
  const usedMedia = new Set<string>();

  // 3a. vínculo exato salvo em syncs anteriores
  for (const post of dbPosts) {
    if (!post.ig_media_id) continue;
    const found = media.find((md) => md.id === post.ig_media_id);
    if (found) {
      matches.set(post.id, found);
      usedMedia.add(found.id);
    }
  }

  // 3b. por data + similaridade de legenda
  const unmatchedPosts = dbPosts.filter((p) => !matches.has(p.id));
  const mediaByDate = new Map<string, IgMedia[]>();
  for (const md of media) {
    if (usedMedia.has(md.id) || !md.timestamp) continue;
    const d = brDate(md.timestamp);
    mediaByDate.set(d, [...(mediaByDate.get(d) ?? []), md]);
  }

  for (const post of unmatchedPosts) {
    const candidates = (mediaByDate.get(post.scheduled_date) ?? []).filter((md) => !usedMedia.has(md.id));
    if (candidates.length === 0) continue;

    const postTokens = tokenize(`${post.title} ${post.copy ?? ""}`);
    let best: IgMedia | null = null;
    let bestScore = -1;
    for (const md of candidates) {
      const score = similarity(postTokens, tokenize(md.caption));
      if (score > bestScore) {
        bestScore = score;
        best = md;
      }
    }
    // par único no dia casa mesmo sem similaridade; senão exige mínimo
    const singlePair = candidates.length === 1 &&
      unmatchedPosts.filter((p) => p.scheduled_date === post.scheduled_date && !matches.has(p.id)).length === 1;
    if (best && (singlePair || bestScore >= 0.2)) {
      matches.set(post.id, best);
      usedMedia.add(best.id);
    }
  }

  // 4. Insights + atualização dos posts casados.
  //    A publicação real é a fonte da verdade: além das métricas, o post
  //    recebe o horário real, o status "publicado" e a legenda/hashtags
  //    que de fato foram ao ar.
  let updated = 0;
  for (const [postId, md] of matches) {
    const post = dbPosts.find((p) => p.id === postId);
    const insights = await fetchInsights(md.id, md.media_product_type, connection.access_token);
    const patch: Record<string, unknown> = {
      ig_media_id: md.id,
      metric_likes: md.like_count ?? null,
      metric_comments: md.comments_count ?? null,
      metrics_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (insights.reach !== undefined) patch.metric_reach = insights.reach;
    if (insights.saved !== undefined) patch.metric_saves = insights.saved;
    if (insights.shares !== undefined) patch.metric_shares = insights.shares;
    const views = insights.views ?? insights.plays;
    if (views !== undefined) patch.metric_views = views;

    if (md.timestamp) {
      const time = brTime(md.timestamp);
      if (time) patch.scheduled_time = time;
      if (post && post.status !== "published") {
        patch.status = "published";
        patch.published_at = md.timestamp;
      }
    }
    if (md.caption) {
      patch.copy = md.caption;
      const tags = extractHashtags(md.caption);
      if (tags.length) patch.hashtags = tags;
    }
    if (md.permalink) patch.video_link = md.permalink;

    const { error: updErr } = await admin
      .from("social_media_posts")
      .update(patch)
      .eq("id", postId);
    if (!updErr) updated++;
  }

  // 5. Publicações reais SEM post planejado → importa para o cronograma
  //    (clientes às vezes postam por fora do planejamento)
  const monthPrefix = `${y}-${pad(m)}`;
  const unplannedMedia = media.filter(
    (md) => !usedMedia.has(md.id) && md.timestamp && brDate(md.timestamp).startsWith(monthPrefix)
  );
  let created = 0;
  for (const md of unplannedMedia) {
    const insights = await fetchInsights(md.id, md.media_product_type, connection.access_token);
    const caption = md.caption ?? "";
    const date = brDate(md.timestamp!);
    const views = insights.views ?? insights.plays;
    const fallbackTitle = `Post do Instagram ${date.slice(8, 10)}/${date.slice(5, 7)}`;

    const { error: insErr } = await admin.from("social_media_posts").insert({
      schedule_id: scheduleId,
      title: titleFromCaption(caption, fallbackTitle),
      post_type: mapPostType(md),
      network: "instagram",
      scheduled_date: date,
      scheduled_time: brTime(md.timestamp!),
      status: "published",
      published_at: md.timestamp,
      copy: caption || null,
      hashtags: extractHashtags(caption),
      ai_generated: false,
      ig_media_id: md.id,
      video_link: md.permalink ?? null,
      notes: "Importado automaticamente do Instagram na sincronização (post feito fora do planejamento).",
      created_by: createdBy ?? null,
      metric_likes: md.like_count ?? null,
      metric_comments: md.comments_count ?? null,
      metric_reach: insights.reach ?? null,
      metric_saves: insights.saved ?? null,
      metric_shares: insights.shares ?? null,
      metric_views: views ?? null,
      metrics_updated_at: new Date().toISOString(),
    });
    if (insErr) {
      console.error("instagram-sync: erro ao importar mídia", md.id, insErr);
    } else {
      created++;
    }
  }

  await admin
    .from("sm_instagram_accounts")
    .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("schedule_id", scheduleId);

  return {
    mediaFound: media.length,
    matched: matches.size,
    updated,
    created,
    unmatchedPosts: dbPosts.length - matches.size,
  };
}
