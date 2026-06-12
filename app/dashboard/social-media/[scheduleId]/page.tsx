"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PostSlideOver } from "@/components/social-media/post-slide-over";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Users,
  Instagram, Facebook, Youtube, Linkedin, Twitter, Music2,
  GripVertical, Sparkles, X, Loader2, CalendarDays, Check, Plus, Trash2,
  Share2, Copy, RefreshCw, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  SocialMediaSchedule, SocialMediaPost, NetworkType, PostType, PostStatus,
  POST_TYPE_CONFIG, MONTHS_PT, COMMEMORATIVE_DATES
} from "@/lib/social-media-types";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const STATUS_DOT: Record<PostStatus, string> = {
  draft:      "bg-amber-400 animate-pulse",
  in_review:  "bg-yellow-300 animate-pulse",
  rejected:   "bg-red-400 animate-pulse",
  approved:   "bg-emerald-300",
  scheduled:  "bg-sky-300",
  published:  "bg-green-300",
};

const NETWORK_ICONS: Record<NetworkType, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
};

const POST_TYPE_OPTIONS: { value: PostType; label: string; description: string }[] = [
  { value: "feed_image", label: "Post Estático", description: "Imagem única no feed" },
  { value: "reels",      label: "Reels",         description: "Vídeo curto vertical" },
  { value: "carrossel",  label: "Carrossel",      description: "Slides / múltiplas imagens" },
  { value: "story",      label: "Stories",        description: "Conteúdo temporário 24h" },
  { value: "influencer", label: "Influencer",     description: "Post em parceria com influencer" },
  { value: "shorts",     label: "Shorts",         description: "Vídeo curto YouTube" },
];

const TONE_OPTIONS = [
  "Profissional e formal",
  "Descontraído e informal",
  "Inspiracional e motivacional",
  "Educativo e informativo",
  "Divertido e criativo",
  "Persuasivo e comercial",
];

const NETWORK_LABELS: Record<NetworkType, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  twitter: "Twitter/X",
  youtube: "YouTube",
};

function getCommemorativeDate(date: Date): string | undefined {
  const key = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return COMMEMORATIVE_DATES[key];
}

function toDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

interface GenerateForm {
  postTypes: PostType[];
  frequency: number;
  tone: string;
  extraContext: string;
}

interface CreatePostForm {
  title: string;
  post_type: PostType;
  network: NetworkType;
  scheduled_date: string;
  scheduled_time: string;
  copy: string;
  hashtags: string;
}

export default function ScheduleCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const scheduleId = params.scheduleId as string;

  const [schedule, setSchedule] = useState<SocialMediaSchedule | null>(null);
  const [posts, setPosts] = useState<SocialMediaPost[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SocialMediaPost | null>(null);
  const [userRole, setUserRole] = useState<string>("viewer");
  const [viewMonth, setViewMonth] = useState<{ month: number; year: number } | null>(null);
  const [networkFilter, setNetworkFilter] = useState<NetworkType | "all">("all");

  // Drag state
  const [draggingPostId, setDraggingPostId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [dragOverDelete, setDragOverDelete] = useState(false);
  const dragStarted = useRef(false);

  // Delete state
  const [pendingDeletePost, setPendingDeletePost] = useState<SocialMediaPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Generate modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateForm, setGenerateForm] = useState<GenerateForm>({
    postTypes: ["feed_image", "reels", "carrossel", "story"],
    frequency: 4,
    tone: "",
    extraContext: "",
  });

  // Context menu (right-click on card)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; post: SocialMediaPost } | null>(null);

  // Share modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareActive, setShareActive] = useState<boolean | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareRevoking, setShareRevoking] = useState(false);
  const [shareToggling, setShareToggling] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Create post modal
  const [createModal, setCreateModal] = useState<{ date: string } | null>(null);
  const [createForm, setCreateForm] = useState<CreatePostForm>({
    title: "",
    post_type: "feed_image",
    network: "instagram",
    scheduled_date: "",
    scheduled_time: "",
    copy: "",
    hashtags: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  const canEdit = userRole === "owner" || userRole === "editor" || userRole === "approver";

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  useEffect(() => {
    if (!userProfile) return;
    fetchData();
  }, [userProfile, scheduleId]);

  async function fetchData() {
    if (!userProfile) return;
    setFetching(true);
    try {
      const { data: sched, error: schedErr } = await supabase
        .from("social_media_schedules")
        .select("*")
        .eq("id", scheduleId)
        .single();

      if (schedErr) throw schedErr;
      setSchedule(sched as SocialMediaSchedule);
      setViewMonth({ month: sched.month, year: sched.year });

      if (sched.owner_id === userProfile.id) {
        setUserRole("owner");
      } else {
        const { data: member } = await supabase
          .from("social_media_team_members")
          .select("role")
          .eq("schedule_id", scheduleId)
          .eq("user_id", userProfile.id)
          .eq("status", "active")
          .single();
        setUserRole(member?.role || "viewer");
      }

      await fetchPosts(sched.month, sched.year);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar cronograma");
    } finally {
      setFetching(false);
    }
  }

  async function fetchPosts(month: number, year: number) {
    setLoadingPosts(true);
    try {
      const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0);
      const lastDayStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("social_media_posts")
        .select("*")
        .eq("schedule_id", scheduleId)
        .gte("scheduled_date", firstDay)
        .lte("scheduled_date", lastDayStr)
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true, nullsFirst: false });

      if (error) throw error;
      setPosts((data as SocialMediaPost[]) || []);
    } finally {
      setLoadingPosts(false);
    }
  }

  async function openShareModal() {
    setShowShareModal(true);
    if (shareToken) return;
    setShareLoading(true);
    try {
      const { data, error } = await supabase.rpc("sm_get_or_create_share_link", {
        p_schedule_id: scheduleId,
      });
      if (error) throw error;
      const res = data as { token: string; active: boolean };
      setShareToken(res.token);
      setShareActive(res.active);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? JSON.stringify(err);
      console.error("share error:", msg, err);
      toast.error("Erro ao gerar link. Execute o SQL de share no Supabase.");
    } finally {
      setShareLoading(false);
    }
  }

  async function handleToggleShare(active: boolean) {
    setShareToggling(true);
    try {
      const { error } = await supabase.rpc("sm_toggle_share_link", {
        p_schedule_id: scheduleId,
        p_active: active,
      });
      if (error) throw error;
      setShareActive(active);
      toast.success(active ? "Compartilhamento ativado" : "Compartilhamento desativado");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? JSON.stringify(err);
      console.error("toggle error:", msg);
      toast.error("Erro ao alterar compartilhamento");
    } finally {
      setShareToggling(false);
    }
  }

  async function handleRevokeShare() {
    setShareRevoking(true);
    try {
      const { data, error } = await supabase.rpc("sm_revoke_share_link", {
        p_schedule_id: scheduleId,
      });
      if (error) throw error;
      const res = data as { token: string; active: boolean };
      setShareToken(res.token);
      setShareActive(res.active);
      setShareCopied(false);
      toast.success("Novo link gerado");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? JSON.stringify(err);
      console.error("revoke error:", msg);
      toast.error("Erro ao revogar link");
    } finally {
      setShareRevoking(false);
    }
  }

  function copyShareLink() {
    if (!shareToken) return;
    const url = `${window.location.origin}/social-media/view/${shareToken}`;
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  function navigateMonth(direction: -1 | 1) {
    if (!viewMonth) return;
    let { month, year } = viewMonth;
    month += direction;
    if (month > 12) { month = 1; year++; }
    if (month < 1) { month = 12; year--; }
    setViewMonth({ month, year });
    fetchPosts(month, year);
  }

  function handlePostUpdate(updated: SocialMediaPost) {
    setPosts((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    setSelectedPost(updated);
  }

  function openCreateModal(date: string) {
    const defaultNetwork = (schedule?.networks?.[0] || "instagram") as NetworkType;
    setCreateForm({
      title: "",
      post_type: "feed_image",
      network: defaultNetwork,
      scheduled_date: date,
      scheduled_time: "",
      copy: "",
      hashtags: "",
    });
    setCreateModal({ date });
  }

  async function handleCreatePost() {
    if (!schedule || !userProfile || !createModal) return;
    if (!createForm.title.trim()) {
      toast.error("Informe o título do post");
      return;
    }
    setIsCreating(true);
    try {
      const hashtags = createForm.hashtags
        .split(/[\s,]+/)
        .map((h) => h.replace(/^#/, "").trim())
        .filter(Boolean);

      const { data, error } = await supabase
        .from("social_media_posts")
        .insert({
          schedule_id: scheduleId,
          title: createForm.title.trim(),
          post_type: createForm.post_type,
          network: createForm.network,
          scheduled_date: createForm.scheduled_date,
          scheduled_time: createForm.scheduled_time || null,
          copy: createForm.copy || null,
          hashtags,
          status: "draft",
          ai_generated: false,
          created_by: userProfile.id,
        })
        .select()
        .single();

      if (error) throw error;

      setPosts((prev) => [...prev, data as SocialMediaPost].sort((a, b) =>
        a.scheduled_date.localeCompare(b.scheduled_date)
      ));
      setCreateModal(null);
      toast.success("Post criado com sucesso");
      setSelectedPost(data as SocialMediaPost);
    } catch (err) {
      console.error("handleCreatePost error:", err);
      toast.error("Erro ao criar post");
    } finally {
      setIsCreating(false);
    }
  }

  function openGenerateModal() {
    if (!schedule) return;
    setGenerateForm({
      postTypes: ["feed_image", "reels", "carrossel", "story"],
      frequency: schedule.posting_frequency || 4,
      tone: schedule.tone_of_voice || "",
      extraContext: "",
    });
    setShowGenerateModal(true);
  }

  function togglePostType(type: PostType) {
    setGenerateForm((prev) => ({
      ...prev,
      postTypes: prev.postTypes.includes(type)
        ? prev.postTypes.filter((t) => t !== type)
        : [...prev.postTypes, type],
    }));
  }

  async function handleGenerateForMonth() {
    if (!schedule || !viewMonth || !userProfile) return;
    if (generateForm.postTypes.length === 0) {
      toast.error("Selecione ao menos um tipo de post");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/social-media/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: schedule.client_name,
          clientNiche: schedule.client_niche,
          month: viewMonth.month,
          year: viewMonth.year,
          networks: schedule.networks,
          postTypes: generateForm.postTypes,
          frequency: generateForm.frequency,
          tone: generateForm.tone || schedule.tone_of_voice,
          targetAudience: schedule.target_audience,
          extraContext: generateForm.extraContext || undefined,
        }),
      });

      if (!response.ok) throw new Error("Erro na geração");
      const { posts: generatedPosts, error: apiError } = await response.json();
      if (apiError) throw new Error(apiError);

      const postsToInsert = generatedPosts.map((p: Record<string, unknown>) => ({
        ...p,
        schedule_id: scheduleId,
        created_by: userProfile.id,
        status: "draft",
        hashtags: p.hashtags || [],
      }));

      const { error: insertErr } = await supabase
        .from("social_media_posts")
        .insert(postsToInsert);

      if (insertErr) throw insertErr;

      await fetchPosts(viewMonth.month, viewMonth.year);
      setShowGenerateModal(false);
      toast.success(`${generatedPosts.length} posts gerados para ${MONTHS_PT[viewMonth.month - 1]} ${viewMonth.year}!`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar cronograma. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Drag & Drop ──────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, post: SocialMediaPost) => {
    dragStarted.current = true;
    setDraggingPostId(post.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("postId", post.id);
    e.dataTransfer.setData("fromDate", post.scheduled_date);
    if (e.currentTarget instanceof HTMLElement) {
      const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
      ghost.style.opacity = "0.85";
      ghost.style.transform = "rotate(-1.5deg) scale(1.05)";
      ghost.style.position = "absolute";
      ghost.style.top = "-1000px";
      ghost.style.width = `${e.currentTarget.offsetWidth}px`;
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 10, 10);
      setTimeout(() => document.body.removeChild(ghost), 0);
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingPostId(null);
    setDragOverDate(null);
    setTimeout(() => { dragStarted.current = false; }, 50);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(dateStr);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverDate(null);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData("postId");
    const fromDate = e.dataTransfer.getData("fromDate");
    setDragOverDate(null);
    setDraggingPostId(null);

    if (!postId || fromDate === targetDate) return;

    setPosts((prev) =>
      prev.map((p) => p.id === postId ? { ...p, scheduled_date: targetDate } : p)
    );

    const { error } = await supabase
      .from("social_media_posts")
      .update({ scheduled_date: targetDate, updated_at: new Date().toISOString() })
      .eq("id", postId);

    if (error) {
      setPosts((prev) =>
        prev.map((p) => p.id === postId ? { ...p, scheduled_date: fromDate } : p)
      );
      toast.error("Erro ao mover post");
    } else {
      toast.success("Post movido com sucesso");
      setSelectedPost((prev) => prev?.id === postId ? { ...prev, scheduled_date: targetDate } : prev);
    }
  }, []);
  const handleDropOnDelete = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const postId = e.dataTransfer.getData("postId");
    setDragOverDelete(false);
    setDraggingPostId(null);
    setTimeout(() => { dragStarted.current = false; }, 50);
    if (postId) {
      const post = posts.find((p) => p.id === postId);
      if (post) setPendingDeletePost(post);
    }
  }, [posts]);

  async function handleConfirmDelete() {
    if (!pendingDeletePost) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc("sm_delete_post", { p_post_id: pendingDeletePost.id });
      if (error) throw error;
      setPosts((prev) => prev.filter((p) => p.id !== pendingDeletePost.id));
      if (selectedPost?.id === pendingDeletePost.id) setSelectedPost(null);
      toast.success("Post excluído");
      setPendingDeletePost(null);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? JSON.stringify(err);
      console.error("delete error:", msg, err);
      toast.error("Erro ao excluir post");
    } finally {
      setIsDeleting(false);
    }
  }
  // ─────────────────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    if (!viewMonth) return [];
    const { month, year } = viewMonth;
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const startOffset = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month - 1, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [viewMonth]);

  const postsByDate = useMemo(() => {
    const map: Record<string, SocialMediaPost[]> = {};
    const filtered = networkFilter === "all" ? posts : posts.filter((p) => p.network === networkFilter);
    for (const post of filtered) {
      if (!map[post.scheduled_date]) map[post.scheduled_date] = [];
      map[post.scheduled_date].push(post);
    }
    return map;
  }, [posts, networkFilter]);

  const postTypes = useMemo(() => {
    const types = new Set(posts.map((p) => p.post_type));
    return Array.from(types) as PostType[];
  }, [posts]);

  const networks = useMemo(() => {
    if (!schedule) return [];
    return (schedule.networks || []) as NetworkType[];
  }, [schedule]);

  const isEmptyMonth = !loadingPosts && !fetching && posts.length === 0;

  if (loading || !userProfile || fetching) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-8 px-4">
          <div className="container mx-auto max-w-7xl space-y-6">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-[600px] w-full rounded-xl" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!schedule || !viewMonth) return null;

  async function handleQuickStatusChange(post: SocialMediaPost, newStatus: PostStatus) {
    setContextMenu(null);

    // Atualização otimista — UI muda na hora
    const optimistic = { ...post, status: newStatus };
    setPosts((prev) => prev.map((p) => p.id === post.id ? optimistic : p));
    if (selectedPost?.id === post.id) setSelectedPost(optimistic);

    const now = new Date().toISOString();
    try {
      const { data, error } = await supabase.rpc("sm_update_post_status", {
        p_post_id:      post.id,
        p_status:       newStatus,
        p_approved_by:  newStatus === "approved" ? (userProfile?.id ?? null) : null,
        p_approved_at:  newStatus === "approved" ? now : null,
        p_published_at: newStatus === "published" ? now : null,
      });
      if (error) throw error;
      if (data) {
        setPosts((prev) => prev.map((p) => p.id === post.id ? (data as SocialMediaPost) : p));
        if (selectedPost?.id === post.id) setSelectedPost(data as SocialMediaPost);
      }
      toast.success("Status atualizado");
    } catch (err) {
      // Reverte se falhou
      setPosts((prev) => prev.map((p) => p.id === post.id ? post : p));
      if (selectedPost?.id === post.id) setSelectedPost(post);
      console.error("quick status error:", err);
      toast.error("Erro ao atualizar status");
    }
  }

  const monthName = MONTHS_PT[viewMonth.month - 1];
  const isOwnerMonth = schedule.month === viewMonth.month && schedule.year === viewMonth.year;
  const isDragging = draggingPostId !== null;

  return (
    <div className="min-h-screen flex flex-col bg-background/50">
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-7xl space-y-6">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard/social-media">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="font-bold text-lg leading-tight">{schedule.client_name}</h1>
                <p className="text-xs text-muted-foreground">
                  {schedule.client_niche} · {posts.length} posts · Cronograma {isOwnerMonth ? "principal" : "estendido"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {networks.length > 1 && (
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setNetworkFilter("all")}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${networkFilter === "all" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Todas
                  </button>
                  {networks.map((net) => {
                    const Icon = NETWORK_ICONS[net];
                    return Icon ? (
                      <button
                        key={net}
                        onClick={() => setNetworkFilter(net)}
                        className={`px-2 py-1 rounded-md text-xs transition-all flex items-center gap-1 ${networkFilter === net ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        title={net}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    ) : null;
                  })}
                </div>
              )}

              {userRole === "owner" && (
                <Button
                  variant={shareActive ? "default" : "outline"}
                  size="sm"
                  className={`gap-1.5 transition-all ${shareActive ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                  onClick={openShareModal}
                >
                  {shareActive ? (
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5" />
                  )}
                  {shareActive ? "Ao Vivo" : "Compartilhar"}
                </Button>
              )}

              {(userRole === "owner" || userRole === "editor") && (
                <Link href={`/dashboard/social-media/${scheduleId}/team`}>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Equipe
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Calendar Card */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">

            {/* Calendar Header */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <h2 className="text-xl font-bold">
                    {monthName} {viewMonth.year} — {schedule.client_name}
                  </h2>
                  <div className="flex items-center gap-4 flex-wrap">
                    {postTypes.map((type) => {
                      const cfg = POST_TYPE_CONFIG[type];
                      return (
                        <div key={type} className="flex items-center gap-1.5">
                          <div className={`w-3 h-3 rounded-sm ${cfg.bgColor}`} />
                          <span className="text-xs text-muted-foreground">{cfg.label}</span>
                        </div>
                      );
                    })}
                    {postTypes.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-emerald-600" />
                        <span className="text-xs text-muted-foreground">Data comemorativa</span>
                      </div>
                    )}
                    {canEdit && posts.length > 0 && (
                      <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border">
                        <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                        <span className="text-xs text-muted-foreground/60">Arraste os cards para mover</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Generate button shown when empty */}
                  {isEmptyMonth && canEdit && (
                    <Button
                      onClick={openGenerateModal}
                      size="sm"
                      className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Gerar para {monthName}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium w-32 text-center">{monthName} {viewMonth.year}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateMonth(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Delete drop zone — aparece durante drag */}
            <div
              className={`overflow-hidden transition-all duration-200 ${isDragging && canEdit ? "max-h-16" : "max-h-0"}`}
            >
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOverDelete(true); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverDelete(false); }}
                onDrop={handleDropOnDelete}
                className={`flex items-center justify-center gap-2.5 py-3 border-b transition-all duration-150 ${
                  dragOverDelete
                    ? "bg-red-500/20 border-red-400 dark:border-red-500"
                    : "bg-red-500/5 border-red-300/40 dark:border-red-700/30"
                }`}
              >
                <Trash2 className={`h-4 w-4 transition-colors ${dragOverDelete ? "text-red-500" : "text-red-400/50"}`} />
                <span className={`text-sm font-medium transition-colors ${dragOverDelete ? "text-red-500" : "text-red-400/50"}`}>
                  {dragOverDelete ? "Solte para excluir este post" : "Arraste um post aqui para excluir"}
                </span>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-semibold text-muted-foreground border-r border-border last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid wrapper (relative for empty state overlay) */}
            <div className="relative">

              {/* Loading overlay */}
              {loadingPosts && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando posts...
                  </div>
                </div>
              )}

              {/* Empty state overlay */}
              {isEmptyMonth && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="bg-card border border-border rounded-2xl p-8 shadow-xl max-w-sm w-full text-center space-y-4 pointer-events-auto mx-4">
                    <div className="w-14 h-14 bg-blue-100 dark:bg-blue-950/50 rounded-2xl flex items-center justify-center mx-auto">
                      <CalendarDays className="h-7 w-7 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">Nenhum post em {monthName} {viewMonth.year}</h3>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        Gere um cronograma com IA para <span className="font-medium text-foreground">{schedule.client_name}</span> neste mês.
                      </p>
                    </div>
                    {canEdit ? (
                      <Button
                        onClick={openGenerateModal}
                        className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Sparkles className="h-4 w-4" />
                        Gerar cronograma com IA
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">Apenas editores podem gerar conteúdo.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Calendar Grid */}
              <div className={`grid grid-cols-7 ${isDragging ? "select-none" : ""} ${isEmptyMonth ? "opacity-25" : ""}`}>
                {calendarDays.map((date, idx) => {
                  if (!date) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="min-h-[110px] border-r border-b border-border last:border-r-0 bg-muted/20"
                      />
                    );
                  }

                  const dateStr = toDateStr(date);
                  const dayPosts = postsByDate[dateStr] || [];
                  const commemorative = getCommemorativeDate(date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isLastCol = (idx + 1) % 7 === 0;
                  const isDropTarget = isDragging && dragOverDate === dateStr && canEdit;

                  return (
                    <div
                      key={dateStr}
                      onDragOver={canEdit ? (e) => handleDragOver(e, dateStr) : undefined}
                      onDragLeave={canEdit ? handleDragLeave : undefined}
                      onDrop={canEdit ? (e) => handleDrop(e, dateStr) : undefined}
                      className={[
                        "min-h-[110px] border-b border-border flex flex-col p-1.5 gap-1 transition-all duration-150",
                        !isLastCol ? "border-r" : "",
                        commemorative ? "bg-emerald-950/5 dark:bg-emerald-950/20" : "",
                        isWeekend && !commemorative ? "bg-muted/10" : "",
                        isDropTarget ? "bg-blue-500/10 ring-2 ring-inset ring-blue-500/60" : "",
                        isDragging && !isDropTarget && canEdit ? "cursor-copy" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <div className="flex items-start justify-between">
                        <span
                          className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                            isToday
                              ? "bg-blue-600 text-white"
                              : isDropTarget
                                ? "text-blue-500"
                                : "text-muted-foreground"
                          }`}
                        >
                          {date.getDate()}
                        </span>
                        {isDropTarget ? (
                          <span className="text-[9px] font-semibold text-blue-500 animate-pulse pr-0.5">
                            Soltar aqui
                          </span>
                        ) : canEdit && !isDragging && (
                          <button
                            onClick={() => openCreateModal(dateStr)}
                            className="w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-blue-500 hover:bg-blue-500/15 transition-all"
                            title={`Adicionar post`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {commemorative && (
                        <div className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 leading-tight px-0.5">
                          {commemorative}
                        </div>
                      )}

                      {dayPosts.map((post) => {
                        const cfg = POST_TYPE_CONFIG[post.post_type];
                        const isBeingDragged = draggingPostId === post.id;

                        const isPublished  = post.status === "published";
                        const isInReview   = post.status === "in_review";
                        const isScheduled  = post.status === "scheduled";

                        return (
                          <div
                            key={post.id}
                            draggable={canEdit}
                            onDragStart={canEdit ? (e) => handleDragStart(e, post) : undefined}
                            onDragEnd={canEdit ? handleDragEnd : undefined}
                            onClick={() => { if (!dragStarted.current) setSelectedPost(post); }}
                            onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, post }); }}
                            className={[
                              "relative w-full text-left rounded px-1.5 py-1 text-[10px] font-medium leading-tight",
                              cfg.bgColor, cfg.color,
                              canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                              isBeingDragged
                                ? "opacity-30 scale-95"
                                : "hover:opacity-90 hover:shadow-md transition-all duration-100",
                              isPublished  ? "opacity-50" : "",
                              isInReview   ? "ring-2 ring-yellow-400 [animation-duration:1.2s] animate-pulse" : "",
                              isScheduled  ? "ring-2 ring-green-400 [animation-duration:1.2s] animate-pulse" : "",
                            ].join(" ")}
                          >
                            <div className="flex items-center justify-between gap-0.5 opacity-80 mb-0.5">
                              <div className="flex items-center gap-0.5">
                                {canEdit && <GripVertical className="h-2.5 w-2.5 opacity-60 shrink-0" />}
                                <span className="uppercase tracking-wide text-[9px]">
                                  {cfg.label}{post.position_number ? ` #${String(post.position_number).padStart(2, "0")}` : ""}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                {post.scheduled_time && (
                                  <span className="text-[9px] opacity-80">{post.scheduled_time.slice(0, 5)}</span>
                                )}
                                {isInReview ? (
                                  <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-90" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
                                  </span>
                                ) : (
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[post.status]}`}
                                    title={post.status}
                                  />
                                )}
                              </div>
                            </div>
                            <div className="line-clamp-2 leading-tight">{post.title}</div>
                          </div>
                        );
                      })}

                      {isDropTarget && dayPosts.length === 0 && (
                        <div className="flex-1 flex items-center justify-center rounded border-2 border-dashed border-blue-400/50 min-h-[32px]">
                          <span className="text-[10px] text-blue-400 font-medium">Soltar aqui</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer stats */}
            <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-6 text-xs text-muted-foreground">
                <span>{posts.length} posts neste mês</span>
                {Object.entries(
                  posts.reduce((acc, p) => {
                    acc[p.status] = (acc[p.status] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([status, count]) => (
                  <span key={status}>
                    {count} {status === "draft" ? "em produção" : status === "in_review" ? "em revisão" : status === "approved" ? "aprovado" : status === "scheduled" ? "agendado" : status === "published" ? "publicado" : status}
                  </span>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                Cronograma gerado com IA · {schedule.posting_frequency}x/semana
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Post Slide-Over */}
      {selectedPost && (
        <PostSlideOver
          post={selectedPost}
          scheduleId={scheduleId}
          clientName={schedule.client_name}
          clientNiche={schedule.client_niche}
          tone={schedule.tone_of_voice}
          targetAudience={schedule.target_audience}
          userRole={userRole}
          userId={userProfile.id}
          onClose={() => setSelectedPost(null)}
          onUpdate={handlePostUpdate}
          onDelete={(postId) => {
            setPosts((prev) => prev.filter((p) => p.id !== postId));
            setSelectedPost(null);
          }}
        />
      )}

      {/* Create Post Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isCreating && setCreateModal(null)}
          />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-card z-10">
              <div>
                <h2 className="font-bold text-lg">Novo post manual</h2>
                <p className="text-sm text-muted-foreground">
                  {(() => {
                    try {
                      const [y, m, d] = createForm.scheduled_date.split("-").map(Number);
                      return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
                    } catch { return createForm.scheduled_date; }
                  })()}
                </p>
              </div>
              <button
                onClick={() => !isCreating && setCreateModal(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">

              {/* Título */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Título <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Dica de treino para segunda-feira"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  autoFocus
                />
              </div>

              {/* Tipo + Rede */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Tipo de post</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {POST_TYPE_OPTIONS.map((opt) => {
                      const cfg = POST_TYPE_CONFIG[opt.value];
                      const sel = createForm.post_type === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setCreateForm((p) => ({ ...p, post_type: opt.value }))}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left text-xs transition-all ${
                            sel ? "border-blue-500/60 bg-blue-500/10" : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-sm shrink-0 ${cfg.bgColor}`} />
                          <span className={sel ? "font-semibold" : ""}>{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Rede social</label>
                  <div className="flex flex-col gap-1.5">
                    {networks.map((net) => {
                      const Icon = NETWORK_ICONS[net];
                      const sel = createForm.network === net;
                      return (
                        <button
                          key={net}
                          type="button"
                          onClick={() => setCreateForm((p) => ({ ...p, network: net }))}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                            sel ? "border-blue-500/60 bg-blue-500/10 font-semibold" : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                          {NETWORK_LABELS[net]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Data + Horário */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Data</label>
                  <input
                    type="date"
                    value={createForm.scheduled_date}
                    onChange={(e) => setCreateForm((p) => ({ ...p, scheduled_date: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">
                    Horário <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <input
                    type="time"
                    value={createForm.scheduled_time}
                    onChange={(e) => setCreateForm((p) => ({ ...p, scheduled_time: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              </div>

              {/* Copy */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">
                  Legenda / Copy <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <textarea
                  value={createForm.copy}
                  onChange={(e) => setCreateForm((p) => ({ ...p, copy: e.target.value }))}
                  placeholder="Escreva a legenda do post..."
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Hashtags */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">
                  Hashtags <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={createForm.hashtags}
                  onChange={(e) => setCreateForm((p) => ({ ...p, hashtags: e.target.value }))}
                  placeholder="#marketing #academia #fitness"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 sticky bottom-0 bg-card">
              <Button variant="outline" onClick={() => setCreateModal(null)} disabled={isCreating}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreatePost}
                disabled={isCreating || !createForm.title.trim()}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white flex-1 max-w-[180px]"
              >
                {isCreating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
                ) : (
                  <><Plus className="h-4 w-4" />Criar post</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowShareModal(false)}
          />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Share2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Compartilhar Cronograma</h3>
                  <p className="text-xs text-muted-foreground">Visualização pública somente-leitura</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Toggle ativo/inativo */}
            {!shareLoading && shareToken && (
              <div className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${shareActive ? "border-blue-500/30 bg-blue-500/5" : "border-border bg-muted/30"}`}>
                <div>
                  <p className="text-sm font-medium">
                    {shareActive ? "Compartilhamento ativo" : "Compartilhamento inativo"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {shareActive ? "Qualquer pessoa com o link pode visualizar" : "O link está bloqueado temporariamente"}
                  </p>
                </div>
                <button
                  onClick={() => handleToggleShare(!shareActive)}
                  disabled={shareToggling}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${shareActive ? "bg-blue-600" : "bg-muted-foreground/30"}`}
                >
                  {shareToggling ? (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-3 w-3 animate-spin text-white" />
                    </span>
                  ) : (
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${shareActive ? "translate-x-5" : "translate-x-0"}`} />
                  )}
                </button>
              </div>
            )}

            {/* Link field */}
            {shareLoading ? (
              <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Gerando link...</span>
              </div>
            ) : shareToken && shareActive ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2.5">
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-xs text-muted-foreground truncate font-mono">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/social-media/view/${shareToken}`
                      : `/social-media/view/${shareToken}`}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={copyShareLink}
                  >
                    {shareCopied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copiar link
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(`/social-media/view/${shareToken}`, "_blank")}
                    title="Abrir visualização"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : shareToken && !shareActive ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                Ative o compartilhamento para exibir e copiar o link.
              </p>
            ) : null}

            {/* Revoke */}
            {shareToken && (
              <div className="border-t border-border pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium">Revogar link atual</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Gera um novo token. Links anteriores param de funcionar.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 shrink-0 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                    onClick={handleRevokeShare}
                    disabled={shareRevoking}
                  >
                    {shareRevoking ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Revogar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {pendingDeletePost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isDeleting && setPendingDeletePost(null)}
          />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-base">Excluir post?</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                &ldquo;<span className="font-medium text-foreground">{pendingDeletePost.title}</span>&rdquo; será excluído permanentemente e não poderá ser recuperado.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPendingDeletePost(null)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isGenerating && setShowGenerateModal(false)}
          />

          {/* Dialog */}
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-card z-10">
              <div>
                <h2 className="font-bold text-lg">Gerar cronograma</h2>
                <p className="text-sm text-muted-foreground">
                  {monthName} {viewMonth.year} · {schedule.client_name}
                </p>
              </div>
              <button
                onClick={() => !isGenerating && setShowGenerateModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">

              {/* Read-only info */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados do cliente</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="font-medium">{schedule.client_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nicho</p>
                    <p className="font-medium">{schedule.client_niche || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1.5">Redes sociais</p>
                    <div className="flex flex-wrap gap-1.5">
                      {networks.map((net) => {
                        const Icon = NETWORK_ICONS[net];
                        return (
                          <span
                            key={net}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-border text-xs font-medium"
                          >
                            {Icon && <Icon className="h-3 w-3" />}
                            {NETWORK_LABELS[net]}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Post types */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold">Tipos de post</p>
                  <p className="text-xs text-muted-foreground">Selecione os formatos que a IA vai gerar</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {POST_TYPE_OPTIONS.map((opt) => {
                    const isSelected = generateForm.postTypes.includes(opt.value);
                    const cfg = POST_TYPE_CONFIG[opt.value];
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => togglePostType(opt.value)}
                        className={[
                          "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                          isSelected
                            ? "border-blue-500/60 bg-blue-500/10"
                            : "border-border hover:border-muted-foreground/40 hover:bg-muted/40",
                        ].join(" ")}
                      >
                        <div className={`w-3 h-3 rounded-sm shrink-0 ${cfg.bgColor}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-none">{opt.label}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{opt.description}</p>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-blue-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Frequency + Tone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Posts por semana</label>
                  <input
                    type="number"
                    min={1}
                    max={14}
                    value={generateForm.frequency}
                    onChange={(e) => setGenerateForm((prev) => ({ ...prev, frequency: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                  <p className="text-[11px] text-muted-foreground">≈ {Math.round(generateForm.frequency * 4.3)} posts no mês</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Tom de voz</label>
                  <select
                    value={generateForm.tone}
                    onChange={(e) => setGenerateForm((prev) => ({ ...prev, tone: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    <option value="">Mesmo do cronograma</option>
                    {TONE_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Extra context */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">
                  Instruções especiais para {monthName}
                  <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
                </label>
                <textarea
                  value={generateForm.extraContext}
                  onChange={(e) => setGenerateForm((prev) => ({ ...prev, extraContext: e.target.value }))}
                  placeholder={`Ex: Temos lançamento de produto novo no dia 15. Focar em posts sobre Black Friday no final do mês. Evitar fins de semana.`}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 sticky bottom-0 bg-card">
              <Button
                variant="outline"
                onClick={() => setShowGenerateModal(false)}
                disabled={isGenerating}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGenerateForMonth}
                disabled={isGenerating || generateForm.postTypes.length === 0}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white flex-1 max-w-[220px]"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando com IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Gerar cronograma
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
          <div
            className="fixed z-[61] bg-popover border border-border rounded-xl shadow-2xl py-1.5 min-w-[180px] overflow-hidden"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 200),
              top: Math.min(contextMenu.y, window.innerHeight - 200),
            }}
          >
            <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border mb-1">
              Alterar status
            </p>
            {([
              { label: "Em Produção", status: "draft"     as PostStatus, dot: "bg-amber-400 animate-pulse" },
              { label: "Aprovado",    status: "approved"  as PostStatus, dot: "bg-emerald-400" },
              { label: "Agendado",    status: "scheduled" as PostStatus, dot: "bg-sky-400" },
              { label: "Postado",     status: "published" as PostStatus, dot: "bg-green-400" },
            ] as const).map(({ label, status, dot }) => {
              const isActive = contextMenu.post.status === status;
              return (
                <button
                  key={status}
                  onClick={() => handleQuickStatusChange(contextMenu.post, status)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left ${
                    isActive ? "bg-muted font-semibold" : "hover:bg-muted"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                  <span className="flex-1">{label}</span>
                  {isActive && <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}

      <Footer />
    </div>
  );
}
