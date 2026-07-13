"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { tokenManager } from "@/lib/token-manager";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PostSlideOver } from "@/components/social-media/post-slide-over";
import { PremiumGate } from "@/components/social-media/premium-gate";
import {
  ArrowLeft, RefreshCw, Loader2, Instagram, LayoutGrid, Play, Layers,
  Heart, MessageCircle, ImagePlus, GripVertical, ExternalLink, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import {
  SocialMediaSchedule, SocialMediaPost, IgFeedMedia, PostType,
  POST_TYPE_CONFIG, isPremiumSmTier,
} from "@/lib/social-media-types";

// Tipos de post que aparecem no grid do perfil do Instagram
const GRID_POST_TYPES: PostType[] = ["feed_image", "carrossel", "reels", "influencer"];

type FeedCell =
  | { kind: "planned"; post: SocialMediaPost; sortKey: string }
  | { kind: "real"; media: IgFeedMedia; sortKey: string };

function plannedSortKey(p: SocialMediaPost) {
  return `${p.scheduled_date}T${(p.scheduled_time || "12:00").slice(0, 5)}`;
}

function formatCellDate(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

export default function FeedSimulatorPage() {
  const params = useParams();
  const { userProfile, loading } = useAuth();
  const scheduleId = params.scheduleId as string;

  const [schedule, setSchedule] = useState<SocialMediaSchedule | null>(null);
  const [userRole, setUserRole] = useState<string>("viewer");
  const [plannedPosts, setPlannedPosts] = useState<SocialMediaPost[]>([]);
  const [realMedia, setRealMedia] = useState<IgFeedMedia[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [fetching, setFetching] = useState(true);
  // Plano do DONO do cronograma libera o recurso para toda a equipe
  const [ownerAllowed, setOwnerAllowed] = useState<boolean | null>(null);
  const [refreshingFeed, setRefreshingFeed] = useState(false);

  // Controles visuais
  const [ratio, setRatio] = useState<"3:4" | "1:1">("3:4"); // grid novo do IG é 3:4
  const [highlight, setHighlight] = useState(true);

  // Drag & drop (só planejados)
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const [selectedPost, setSelectedPost] = useState<SocialMediaPost | null>(null);

  const canEdit = userRole === "owner" || userRole === "editor" || userRole === "approver";

  const fetchRealFeed = useCallback(async () => {
    if (!tokenManager.get()) return;
    setRefreshingFeed(true);
    try {
      const res = await fetch(`/api/social-media/instagram/feed?scheduleId=${scheduleId}`, {
        headers: tokenManager.authHeader(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Erro ao carregar o feed");
      setConnected(Boolean(data.connected));
      setRealMedia((data.media as IgFeedMedia[]) || []);
    } catch (err) {
      console.error("feed fetch error:", err);
      setConnected(false);
      toast.error((err as { message?: string })?.message || "Erro ao carregar o feed do Instagram");
    } finally {
      setRefreshingFeed(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    if (loading || !userProfile) return;
    (async () => {
      setFetching(true);
      try {
        const { data: sched, error: schedErr } = await supabase
          .from("social_media_schedules")
          .select("*")
          .eq("id", scheduleId)
          .single();
        if (schedErr) throw schedErr;
        setSchedule(sched as SocialMediaSchedule);

        // Recurso Pro/Ultra — validado pelo plano do dono do cronograma
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("subscription_tier")
          .eq("id", (sched as SocialMediaSchedule).owner_id)
          .maybeSingle();
        const allowed = isPremiumSmTier(ownerProfile?.subscription_tier as string | null);
        setOwnerAllowed(allowed);
        if (!allowed) {
          setFetching(false);
          return;
        }

        if ((sched as SocialMediaSchedule).owner_id === userProfile.id) {
          setUserRole("owner");
        } else {
          const { data: member } = await supabase
            .from("social_media_team_members")
            .select("role")
            .eq("schedule_id", scheduleId)
            .eq("user_id", userProfile.id)
            .eq("status", "active")
            .maybeSingle();
          setUserRole(member?.role || "viewer");
        }

        // Posts planejados que aparecem no grid (não publicados/rejeitados)
        const { data: posts, error: postsErr } = await supabase
          .from("social_media_posts")
          .select("*")
          .eq("schedule_id", scheduleId)
          .eq("network", "instagram")
          .in("post_type", GRID_POST_TYPES)
          .not("status", "in", "(published,rejected)")
          .order("scheduled_date", { ascending: false });
        if (postsErr) throw postsErr;
        setPlannedPosts((posts as SocialMediaPost[]) || []);

        await fetchRealFeed();
      } catch (err) {
        console.error("feed simulator fetch error:", err);
        toast.error("Erro ao carregar o simulador");
      } finally {
        setFetching(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userProfile, scheduleId]);

  // Grid: planejados + reais intercalados por data (mais recente primeiro)
  const cells = useMemo<FeedCell[]>(() => {
    const planned: FeedCell[] = plannedPosts.map((p) => ({
      kind: "planned", post: p, sortKey: plannedSortKey(p),
    }));
    const real: FeedCell[] = realMedia.map((m) => ({
      kind: "real", media: m, sortKey: (m.timestamp ?? "").slice(0, 16) || "0000",
    }));
    return [...planned, ...real]
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
      .slice(0, 60);
  }, [plannedPosts, realMedia]);

  // Troca as datas de dois posts planejados (mecânica do arrastar)
  async function swapPlanned(aId: string, bId: string) {
    if (aId === bId) return;
    const a = plannedPosts.find((p) => p.id === aId);
    const b = plannedPosts.find((p) => p.id === bId);
    if (!a || !b) return;

    const prev = plannedPosts;
    setPlannedPosts((list) =>
      list.map((p) =>
        p.id === a.id
          ? { ...p, scheduled_date: b.scheduled_date, scheduled_time: b.scheduled_time }
          : p.id === b.id
            ? { ...p, scheduled_date: a.scheduled_date, scheduled_time: a.scheduled_time }
            : p
      )
    );

    const now = new Date().toISOString();
    const [r1, r2] = await Promise.all([
      supabase.from("social_media_posts")
        .update({ scheduled_date: b.scheduled_date, scheduled_time: b.scheduled_time, updated_at: now })
        .eq("id", a.id),
      supabase.from("social_media_posts")
        .update({ scheduled_date: a.scheduled_date, scheduled_time: a.scheduled_time, updated_at: now })
        .eq("id", b.id),
    ]);
    if (r1.error || r2.error) {
      setPlannedPosts(prev);
      toast.error("Erro ao reorganizar — tente novamente");
    } else {
      toast.success(`Datas trocadas: ${formatCellDate(b.scheduled_date)} ↔ ${formatCellDate(a.scheduled_date)}`);
    }
  }

  function handlePostUpdate(updated: SocialMediaPost) {
    setPlannedPosts((list) => {
      const next = list.map((p) => (p.id === updated.id ? { ...p, ...updated } : p));
      // Post publicado/rejeitado sai do grid de planejados
      return next.filter((p) => p.status !== "published" && p.status !== "rejected");
    });
    setSelectedPost((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
  }

  const aspectClass = ratio === "3:4" ? "aspect-[3/4]" : "aspect-square";
  const handle = schedule?.account_handle ? `@${schedule.account_handle}` : schedule?.client_name;

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-background/50">
        <Header />
        <main className="container mx-auto max-w-lg py-10 px-4 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-24 rounded-2xl" />
          <div className="grid grid-cols-3 gap-0.5">
            {[...Array(9)].map((_, i) => <Skeleton key={i} className="aspect-[3/4]" />)}
          </div>
        </main>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen bg-background/50">
        <Header />
        <main className="container mx-auto max-w-lg py-10 px-4">
          <p className="text-muted-foreground">Cronograma não encontrado.</p>
        </main>
      </div>
    );
  }

  // Paywall: dono do cronograma não é Pro/Ultra
  if (ownerAllowed === false) {
    return (
      <div className="min-h-screen bg-background/50">
        <Header />
        <main className="container mx-auto max-w-lg py-10 px-4 space-y-4">
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/social-media/${scheduleId}`}>
              <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-pink-500" />
              Simulador de Feed
            </h1>
          </div>
          <PremiumGate
            title="Visualize o feed antes de publicar"
            description="Veja exatamente como o perfil do Instagram vai ficar, misturando os posts planejados com o feed real."
            bullets={[
              "Prévia do grid igual ao Instagram (3:4 e 1:1)",
              "Arraste os posts para reorganizar as datas",
              "Feed real da conta conectada intercalado",
              "Anexe as artes e monte a harmonia visual",
            ]}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background/50">
      <Header />
      <main className="container mx-auto max-w-5xl py-8 px-4">
        <div className="grid lg:grid-cols-[1fr_260px] gap-8 items-start">

          {/* ── Coluna principal: mockup do perfil ── */}
          <div className="mx-auto w-full max-w-[430px] space-y-4">

            {/* Top bar */}
            <div className="flex items-center gap-3">
              <Link href={`/dashboard/social-media/${scheduleId}`}>
                <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
              </Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-pink-500" />
                  Simulador de Feed
                </h1>
                <p className="text-xs text-muted-foreground truncate">{schedule.client_name}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRealFeed}
                disabled={refreshingFeed}
                className="gap-1.5 shrink-0"
              >
                {refreshingFeed ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Atualizar
              </Button>
            </div>

            {/* "Celular" */}
            <div className="rounded-3xl border border-border bg-card shadow-xl overflow-hidden">

              {/* Header do perfil */}
              <div className="p-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600 shrink-0">
                  <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                    <Instagram className="h-7 w-7 text-pink-500" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{handle}</p>
                  <div className="flex gap-4 mt-1.5 text-xs">
                    <span><strong>{plannedPosts.length}</strong> planejados</span>
                    <span><strong>{realMedia.length}</strong> publicados</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">
                    {schedule.client_niche || "Prévia de como o perfil ficará"}
                  </p>
                </div>
              </div>

              {/* Divisor com ícone de grid (imita as abas do perfil) */}
              <div className="border-t border-border flex justify-center py-2">
                <LayoutGrid className="h-4 w-4 text-foreground" />
              </div>

              {/* Grid */}
              {cells.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <ImagePlus className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm font-medium">Nada para exibir ainda</p>
                  <p className="text-xs text-muted-foreground">
                    Crie posts de Instagram no calendário e anexe as artes — ou conecte a conta para trazer o feed real.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-0.5 bg-border">
                  {cells.map((cell) => {
                    if (cell.kind === "real") {
                      const m = cell.media;
                      return (
                        <a
                          key={`real-${m.id}`}
                          href={m.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`relative ${aspectClass} bg-muted overflow-hidden group`}
                          title="Publicado — abrir no Instagram"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.image ?? ""} alt="" className="w-full h-full object-cover" loading="lazy" />
                          {(m.media_product_type === "REELS" || m.media_type === "VIDEO") && (
                            <Play className="absolute top-1.5 right-1.5 h-4 w-4 text-white drop-shadow" fill="white" />
                          )}
                          {m.media_type === "CAROUSEL_ALBUM" && (
                            <Layers className="absolute top-1.5 right-1.5 h-4 w-4 text-white drop-shadow" />
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs font-semibold">
                            {typeof m.like_count === "number" && (
                              <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" fill="white" />{m.like_count}</span>
                            )}
                            {typeof m.comments_count === "number" && (
                              <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" fill="white" />{m.comments_count}</span>
                            )}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </div>
                        </a>
                      );
                    }

                    const p = cell.post;
                    const cfg = POST_TYPE_CONFIG[p.post_type];
                    const isDragging = draggingId === p.id;
                    const isDragOver = dragOverId === p.id && draggingId !== p.id;
                    return (
                      <div
                        key={`planned-${p.id}`}
                        draggable={canEdit}
                        onDragStart={(e) => {
                          setDraggingId(p.id);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("postId", p.id);
                        }}
                        onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                        onDragOver={(e) => { e.preventDefault(); setDragOverId(p.id); }}
                        onDragLeave={() => setDragOverId((v) => (v === p.id ? null : v))}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromId = e.dataTransfer.getData("postId");
                          setDragOverId(null);
                          setDraggingId(null);
                          if (fromId) swapPlanned(fromId, p.id);
                        }}
                        onClick={() => setSelectedPost(p)}
                        className={`relative ${aspectClass} bg-muted overflow-hidden group cursor-pointer transition-all ${
                          isDragging ? "opacity-40" : ""
                        } ${isDragOver ? "scale-95 ring-2 ring-sky-400" : ""}`}
                        title={`${p.title} — clique para editar${canEdit ? ", arraste para reorganizar" : ""}`}
                      >
                        {p.media_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.media_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className={`w-full h-full ${cfg?.bgColor ?? "bg-muted"} bg-opacity-80 flex flex-col items-center justify-center gap-1 p-2 text-center`}>
                            <ImagePlus className="h-5 w-5 text-white/90" />
                            <span className="text-[10px] font-semibold text-white/95 leading-tight line-clamp-3">
                              {p.title}
                            </span>
                          </div>
                        )}

                        {/* Ícone do formato (como no IG real) */}
                        {p.post_type === "reels" && (
                          <Play className="absolute top-1.5 right-1.5 h-4 w-4 text-white drop-shadow" fill="white" />
                        )}
                        {p.post_type === "carrossel" && (
                          <Layers className="absolute top-1.5 right-1.5 h-4 w-4 text-white drop-shadow" />
                        )}

                        {/* Marcação de planejado */}
                        {highlight && (
                          <>
                            <div className="absolute inset-0 border-2 border-dashed border-sky-400/90 pointer-events-none" />
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-sky-500/90 text-white text-[10px] font-bold flex items-center gap-0.5">
                              <CalendarDays className="h-2.5 w-2.5" />
                              {formatCellDate(p.scheduled_date)}
                            </span>
                          </>
                        )}
                        {canEdit && (
                          <GripVertical className="absolute top-1.5 left-1.5 h-3.5 w-3.5 text-white/80 opacity-0 group-hover:opacity-100 drop-shadow" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {canEdit && plannedPosts.length > 1 && (
              <p className="text-[11px] text-muted-foreground text-center">
                Arraste um post tracejado sobre outro para trocar as datas entre eles — o calendário é atualizado na hora.
              </p>
            )}
          </div>

          {/* ── Coluna lateral: controles e legenda ── */}
          <div className="space-y-4 lg:sticky lg:top-24">

            {/* Proporção */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">Proporção do grid</p>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-muted">
                {(["3:4", "1:1"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRatio(r)}
                    className={`py-1.5 rounded-md text-xs font-medium transition-all ${
                      ratio === r ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r} {r === "3:4" ? "(atual do IG)" : "(clássico)"}
                  </button>
                ))}
              </div>

              <p className="text-xs font-semibold text-muted-foreground pt-1">Exibição</p>
              <button
                onClick={() => setHighlight((v) => !v)}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-border text-xs hover:bg-muted/40 transition-colors"
              >
                <span>Destacar planejados</span>
                <span className={`w-8 h-[18px] rounded-full px-0.5 flex items-center transition-colors ${highlight ? "bg-sky-500 justify-end" : "bg-muted-foreground/30 justify-start"}`}>
                  <span className="w-3.5 h-3.5 rounded-full bg-white block" />
                </span>
              </button>
              <p className="text-[11px] text-muted-foreground">
                Desligue para ver a prévia limpa, exatamente como o perfil ficará.
              </p>
            </div>

            {/* Legenda */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2.5 text-xs">
              <p className="font-semibold text-muted-foreground">Legenda</p>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded border-2 border-dashed border-sky-400 shrink-0" />
                <span>Post planejado — clique para editar e anexar a arte</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded bg-gradient-to-tr from-amber-400 via-pink-500 to-violet-600 shrink-0" />
                <span>Publicado no Instagram — passe o mouse para ver curtidas</span>
              </div>
            </div>

            {/* Estado da conexão */}
            {connected === false && (
              <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-2">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <Instagram className="h-3.5 w-3.5" />
                  Instagram não conectado
                </p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                  O simulador está mostrando apenas os posts planejados. Conecte a conta no calendário
                  para intercalar com o feed real.
                </p>
                <Link href={`/dashboard/social-media/${scheduleId}`}>
                  <Button variant="outline" size="sm" className="w-full text-xs h-8 mt-1">Ir para o calendário</Button>
                </Link>
              </div>
            )}

            {/* Posts sem arte */}
            {canEdit && plannedPosts.some((p) => !p.media_url) && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">
                  {plannedPosts.filter((p) => !p.media_url).length} post(s) sem arte
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Clique nas células coloridas e use "Enviar arte do post" para completar a prévia do feed.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Slide-over de edição (mesmo do calendário) */}
      {selectedPost && userProfile && (
        <PostSlideOver
          post={selectedPost}
          scheduleId={scheduleId}
          clientName={schedule.client_name}
          clientNiche={schedule.client_niche}
          tone={schedule.tone_of_voice}
          targetAudience={schedule.target_audience}
          objective={schedule.objective}
          userRole={userRole}
          userId={userProfile.id}
          onClose={() => setSelectedPost(null)}
          onUpdate={handlePostUpdate}
          onDelete={(postId) => {
            setPlannedPosts((prev) => prev.filter((p) => p.id !== postId));
            setSelectedPost(null);
          }}
        />
      )}
    </div>
  );
}
