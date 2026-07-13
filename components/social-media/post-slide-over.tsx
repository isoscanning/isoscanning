"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { tokenManager } from "@/lib/token-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  X, Pencil, Sparkles, Loader2, Send, Check, AlertCircle, ThumbsDown,
  Clock, Hash, FileText, MessageSquare, History, Instagram, Facebook,
  Youtube, Linkedin, Twitter, Music2, ChevronDown, Link2, ExternalLink,
  Film, FolderOpen, Trash2, Wand2, RefreshCw, BarChart3, ImagePlus, Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import {
  SocialMediaPost, PostComment, NetworkType, PostStatus, PostType, ProductionStatus,
  POST_TYPE_CONFIG, STATUS_CONFIG, NETWORK_CONFIG, PRODUCTION_STATUS_CONFIG
} from "@/lib/social-media-types";
import { notifySocialMediaPostStatus, notifySocialMediaComment } from "@/lib/data-service";
import { RichText, RichTextArea } from "@/components/social-media/rich-text";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PostSlideOverProps {
  post: SocialMediaPost | null;
  scheduleId: string;
  clientName?: string;
  clientNiche?: string;
  tone?: string;
  targetAudience?: string;
  objective?: string;
  userRole: string;
  userId: string;
  onClose: () => void;
  onUpdate: (updated: SocialMediaPost) => void;
  onDelete?: (postId: string) => void;
}

// Refinos de 1 clique — cada chip envia a instrução para /api/social-media/refine-post
const REFINE_PRESETS: { label: string; instruction: string }[] = [
  { label: "Mais curta",        instruction: "Deixe a copy mais curta e direta, mantendo o gancho e o CTA." },
  { label: "Mais persuasiva",   instruction: "Torne a copy mais persuasiva e focada em conversão, com CTA mais forte." },
  { label: "Gancho mais forte", instruction: "Reescreva a primeira linha com um gancho mais chamativo (pergunta, dado surpreendente ou dor do público). Mantenha o restante coerente." },
  { label: "Mais descontraída", instruction: "Deixe o tom mais leve e descontraído, com linguagem próxima do público." },
  { label: "Mais profissional", instruction: "Deixe o tom mais profissional e sóbrio, sem perder a fluidez." },
  { label: "Focar em venda",    instruction: "Direcione a copy para venda: destaque benefícios, quebre objeções e finalize com CTA de compra/contato." },
];

const NETWORK_ICONS: Record<NetworkType, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
};

const STATUS_ACTIONS: Partial<Record<PostStatus, { label: string; next: PostStatus; icon: React.ComponentType<{ className?: string }>; color: string }[]>> = {
  draft: [
    { label: "Enviar para revisão", next: "in_review", icon: Send, color: "bg-yellow-600 hover:bg-yellow-700 text-white" },
  ],
  in_review: [
    { label: "Aprovar", next: "approved", icon: Check, color: "bg-green-600 hover:bg-green-700 text-white" },
    { label: "Voltar para produção", next: "draft", icon: AlertCircle, color: "bg-orange-500 hover:bg-orange-600 text-white" },
    { label: "Rejeitar", next: "rejected", icon: ThumbsDown, color: "bg-red-600 hover:bg-red-700 text-white" },
  ],
  approved: [
    { label: "Marcar agendado", next: "scheduled", icon: Clock, color: "bg-blue-600 hover:bg-blue-700 text-white" },
    { label: "Voltar para revisão", next: "in_review", icon: AlertCircle, color: "bg-yellow-600 hover:bg-yellow-700 text-white" },
  ],
  scheduled: [
    { label: "Marcar publicado", next: "published", icon: Check, color: "bg-blue-600 hover:bg-blue-700 text-white" },
  ],
  rejected: [
    { label: "Voltar para produção", next: "draft", icon: AlertCircle, color: "bg-amber-500 hover:bg-amber-600 text-white" },
  ],
  published: [],
};

export function PostSlideOver({
  post, scheduleId, clientName, clientNiche, tone, targetAudience, objective,
  userRole, userId, onClose, onUpdate, onDelete
}: PostSlideOverProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Chave da ação de IA em andamento ("rewrite" | "full" | "custom" | label do chip) — null = ociosa
  const [refining, setRefining] = useState<string | null>(null);
  const [refineInstruction, setRefineInstruction] = useState("");
  // Arte do post (Simulador de Feed)
  const [uploadingMedia, setUploadingMedia] = useState(false);
  // Métricas de desempenho (alimentam o relatório mensal)
  const [savingMetrics, setSavingMetrics] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [metricsForm, setMetricsForm] = useState({
    likes: "", comments: "", shares: "", saves: "", reach: "", views: "",
  });
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "comments">("content");

  const [editForm, setEditForm] = useState({
    title: post?.title || "",
    copy: post?.copy || "",
    hashtags: (post?.hashtags || []).join(" "),
    content_description: post?.content_description || "",
    scheduled_time: post?.scheduled_time || "",
    notes: post?.notes || "",
    material_link: post?.material_link || "",
    video_link: post?.video_link || "",
    capture_date: post?.capture_date || "",
    production_status: (post?.production_status || "pending") as ProductionStatus,
    post_type: (post?.post_type || "feed_image") as PostType,
  });

  useEffect(() => {
    if (post) {
      setEditForm({
        title: post.title,
        copy: post.copy || "",
        hashtags: (post.hashtags || []).join(" "),
        content_description: post.content_description || "",
        scheduled_time: post.scheduled_time || "",
        notes: post.notes || "",
        material_link: post.material_link || "",
        video_link: post.video_link || "",
        capture_date: post.capture_date || "",
        production_status: post.production_status || "pending",
        post_type: post.post_type,
      });
      setMetricsForm({
        likes: post.metric_likes != null ? String(post.metric_likes) : "",
        comments: post.metric_comments != null ? String(post.metric_comments) : "",
        shares: post.metric_shares != null ? String(post.metric_shares) : "",
        saves: post.metric_saves != null ? String(post.metric_saves) : "",
        reach: post.metric_reach != null ? String(post.metric_reach) : "",
        views: post.metric_views != null ? String(post.metric_views) : "",
      });
      setShowMetrics(post.metrics_updated_at != null || post.status === "published");
      fetchComments(post.id);
    }
  }, [post?.id]);

  async function fetchComments(postId: string) {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .rpc("sm_get_post_comments", { p_post_id: postId });
      if (error) console.error("sm_get_post_comments error:", error);
      setComments((data as any[]) || []);
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleSave() {
    if (!post) return;
    setSaving(true);
    try {
      const hashtags = editForm.hashtags
        .split(/[\s,]+/)
        .map((h) => h.replace(/^#/, "").trim())
        .filter(Boolean);

      const { data, error } = await supabase.rpc("sm_update_post", {
        p_post_id:             post.id,
        p_title:               editForm.title,
        p_post_type:           editForm.post_type,
        p_copy:                editForm.copy || "",
        p_hashtags:            hashtags,
        p_content_description: editForm.content_description || "",
        p_scheduled_time:      editForm.scheduled_time || null,
        p_notes:               editForm.notes || "",
        p_material_link:       editForm.material_link || "",
        p_video_link:          editForm.video_link || "",
        p_capture_date:        editForm.capture_date || null,
        p_production_status:   editForm.production_status,
      });

      if (error) throw error;
      onUpdate(data as SocialMediaPost);
      setEditing(false);
      toast.success("Post atualizado");
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? JSON.stringify(err);
      console.error("save error:", msg, err);
      toast.error("Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus: PostStatus, commentText?: string) {
    if (!post) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase.rpc("sm_update_post_status", {
        p_post_id:      post.id,
        p_status:       newStatus,
        p_approved_by:  newStatus === "approved" ? userId : null,
        p_approved_at:  newStatus === "approved" ? now : null,
        p_published_at: newStatus === "published" ? now : null,
      });

      if (error) throw error;

      // Auto-comment on status change
      const statusLabels: Partial<Record<PostStatus, string>> = {
        in_review: "enviou para revisão",
        approved: "aprovou este post",
        rejected: "rejeitou este post",
        draft: "solicitou revisões",
        scheduled: "marcou como agendado",
        published: "marcou como publicado",
      };

      const autoComment = commentText || statusLabels[newStatus];
      if (autoComment) {
        const commentType = newStatus === "approved" ? "approval"
          : newStatus === "rejected" ? "rejection"
          : "comment";
        const { error: commentErr } = await supabase.rpc("sm_add_post_comment", {
          p_post_id: post.id,
          p_comment: autoComment,
          p_comment_type: commentType,
        });
        if (commentErr) console.error("auto-comment error:", commentErr);
        await fetchComments(post.id);
      }

      onUpdate(data as SocialMediaPost);
      toast.success("Status atualizado");

      // Dispatch notification (non-blocking) for significant transitions
      const notifyStatuses: PostStatus[] = ["in_review", "approved", "rejected", "published"];
      if (notifyStatuses.includes(newStatus)) {
        notifySocialMediaPostStatus({
          postId: post.id,
          scheduleId,
          postTitle: post.title,
          newStatus,
          scheduleClientName: clientName ?? "",
        });
      }
    } catch {
      toast.error("Erro ao atualizar status");
    } finally {
      setSaving(false);
    }
  }

  async function handleRefine(instruction: string | undefined, scope: "copy" | "full", actionKey: string) {
    if (!post || refining) return;
    // Garante que o resultado fique visível: o conteúdo refinado vai para o
    // editForm, que só é exibido no modo de edição.
    if (!editing) setEditing(true);
    setRefining(actionKey);
    try {
      const currentHashtags = editForm.hashtags
        .split(/[\s,]+/)
        .map((h) => h.replace(/^#/, "").trim())
        .filter(Boolean);

      const res = await fetch("/api/social-media/refine-post", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenManager.authHeader() },
        body: JSON.stringify({
          scope,
          instruction,
          title: editForm.title || post.title,
          postType: editForm.post_type || post.post_type,
          network: post.network,
          copy: editForm.copy || undefined,
          hashtags: currentHashtags,
          contentDescription: editForm.content_description || undefined,
          clientName,
          clientNiche,
          tone,
          targetAudience,
          objective,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const apiMsg = (data as { error?: string })?.error;
        throw new Error(apiMsg || "Erro no refino pela IA");
      }

      setEditForm((prev) => ({
        ...prev,
        ...(scope === "full" && data.title ? { title: data.title } : {}),
        copy: data.copy || prev.copy,
        hashtags: (data.hashtags || []).map((h: string) => `#${h.replace(/^#/, "")}`).join(" ") || prev.hashtags,
        ...(scope === "full" && typeof data.content_description === "string" && data.content_description
          ? { content_description: data.content_description }
          : {}),
      }));
      setRefineInstruction("");
      toast.success(scope === "full"
        ? "Post regenerado com IA. Revise e clique em Salvar."
        : "Copy refinada com IA. Revise e clique em Salvar.");
    } catch (err) {
      const msg = (err as { message?: string })?.message || "Erro ao refinar com IA";
      console.error("refine-post error:", msg, err);
      toast.error(msg);
    } finally {
      setRefining(null);
    }
  }

  async function handleMediaUpload(file: File) {
    if (!post) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie um arquivo de imagem (JPG, PNG ou WebP).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande — o limite é 8MB.");
      return;
    }
    setUploadingMedia(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${scheduleId}/${post.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("sm-post-media")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("sm-post-media").getPublicUrl(path);
      const { data, error } = await supabase.rpc("sm_update_post_media", {
        p_post_id: post.id,
        p_media_url: pub.publicUrl,
      });
      if (error) throw error;
      onUpdate(data as SocialMediaPost);
      toast.success("Arte anexada — ela já aparece no Simulador de Feed.");
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "";
      console.error("media upload error:", msg, err);
      toast.error(msg.includes("Bucket not found") || msg.includes("does not exist") || msg.includes("function")
        ? "Banco desatualizado. Execute a migration 45-social-media-feed-media.sql no Supabase."
        : "Erro ao enviar a arte");
    } finally {
      setUploadingMedia(false);
    }
  }

  async function handleMediaRemove() {
    if (!post) return;
    setUploadingMedia(true);
    try {
      // Remove o arquivo do Storage (best-effort) e limpa a coluna
      const marker = "/sm-post-media/";
      const idx = (post.media_url ?? "").indexOf(marker);
      if (idx !== -1) {
        const path = decodeURIComponent(post.media_url!.slice(idx + marker.length));
        await supabase.storage.from("sm-post-media").remove([path]);
      }
      const { data, error } = await supabase.rpc("sm_update_post_media", {
        p_post_id: post.id,
        p_media_url: null,
      });
      if (error) throw error;
      onUpdate(data as SocialMediaPost);
      toast.success("Arte removida");
    } catch (err) {
      console.error("media remove error:", err);
      toast.error("Erro ao remover a arte");
    } finally {
      setUploadingMedia(false);
    }
  }

  async function handleSaveMetrics() {
    if (!post) return;
    setSavingMetrics(true);
    try {
      const toInt = (v: string) => {
        const n = parseInt(v.replace(/\D/g, ""), 10);
        return Number.isFinite(n) ? n : null;
      };
      const { data, error } = await supabase.rpc("sm_update_post_metrics", {
        p_post_id:  post.id,
        p_likes:    toInt(metricsForm.likes),
        p_comments: toInt(metricsForm.comments),
        p_shares:   toInt(metricsForm.shares),
        p_saves:    toInt(metricsForm.saves),
        p_reach:    toInt(metricsForm.reach),
        p_views:    toInt(metricsForm.views),
      });
      if (error) throw error;
      onUpdate(data as SocialMediaPost);
      toast.success("Métricas salvas — elas alimentam o relatório mensal.");
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "";
      console.error("sm_update_post_metrics error:", msg, err);
      toast.error(msg.includes("function") || msg.includes("does not exist")
        ? "Banco desatualizado. Execute a migration 43-social-media-analytics.sql no Supabase."
        : "Erro ao salvar métricas");
    } finally {
      setSavingMetrics(false);
    }
  }

  async function handleSendComment() {
    if (!post || !newComment.trim()) return;
    setSendingComment(true);
    try {
      const { error } = await supabase.rpc("sm_add_post_comment", {
        p_post_id: post.id,
        p_comment: newComment.trim(),
        p_comment_type: "comment",
      });
      if (error) throw error;
      setNewComment("");
      fetchComments(post.id);

      // Dispatch notification (non-blocking)
      notifySocialMediaComment({
        postId: post.id,
        scheduleId,
        postTitle: post.title,
        commentType: "comment",
        scheduleClientName: clientName ?? "",
      });
    } catch (err) {
      console.error("sm_add_post_comment error:", err);
      toast.error("Erro ao enviar comentário");
    } finally {
      setSendingComment(false);
    }
  }

  async function handleDelete() {
    if (!post) return;
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("sm_delete_post", { p_post_id: post.id });
      if (error) throw error;
      toast.success("Post excluído");
      onDelete?.(post.id);
      onClose();
    } catch (err) {
      console.error("sm_delete_post error:", err);
      toast.error("Erro ao excluir post");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (!post) return null;

  const POST_TYPE_OPTIONS_ORDERED: PostType[] = [
    "feed_image", "reels", "carrossel", "story", "influencer", "shorts", "thread"
  ];

  const typeConfig = POST_TYPE_CONFIG[editing ? editForm.post_type : post.post_type];
  const statusConfig = STATUS_CONFIG[post.status];
  const networkConfig = NETWORK_CONFIG[post.network];
  const NetworkIcon = NETWORK_ICONS[post.network];
  const canEdit = userRole === "owner" || userRole === "editor" || userRole === "approver";
  const canApprove = userRole === "owner" || userRole === "approver";
  const canDelete = userRole === "owner" || userRole === "editor";
  const statusActions = STATUS_ACTIONS[post.status] || [];
  const allowedActions = statusActions.filter(() =>
    post.status === "in_review" ? canApprove : canEdit || canApprove
  );

  const formattedDate = (() => {
    try {
      return format(new Date(post.scheduled_date + "T12:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR });
    } catch {
      return post.scheduled_date;
    }
  })();

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-background border-l border-border z-50 flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            {/* Type badge — atualiza visualmente ao trocar no modo edição */}
            <div className={`px-2 py-1 rounded text-xs font-bold shrink-0 transition-colors ${typeConfig?.bgColor} ${typeConfig?.color}`}>
              {typeConfig?.label || post.post_type.toUpperCase()}
              {post.position_number ? ` #${String(post.position_number).padStart(2, "0")}` : ""}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight line-clamp-2">{post.title}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {NetworkIcon && <NetworkIcon className={`h-3 w-3 ${networkConfig.color}`} />}
                  {networkConfig.label}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canDelete && !editing && (
              confirmDelete ? (
                <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-2 py-1">
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">Excluir post?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 px-1.5 py-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  >
                    {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmar"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  onClick={() => setConfirmDelete(true)}
                  title="Excluir post"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Date/time */}
        <div className="px-5 py-3 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="capitalize">{formattedDate}</span>
            {post.scheduled_time && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {post.scheduled_time.slice(0, 5)}h
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          {[
            { id: "content" as const, label: "Conteúdo", icon: FileText },
            { id: "comments" as const, label: `Comentários${comments.length ? ` (${comments.length})` : ""}`, icon: MessageSquare },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Content Tab */}
          {activeTab === "content" && (
            <div className="p-5 space-y-5">

              {/* Edit / Save actions */}
              {canEdit && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {editing ? "Modo de edição ativo" : "Clique em editar para modificar"}
                  </span>
                  {editing ? (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        <span className="ml-1">Salvar</span>
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                  )}
                </div>
              )}

              {/* Status overview (view mode) */}
              {!editing && (
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Status</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Aprovação</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[post.status].color}`}>
                        {STATUS_CONFIG[post.status].label}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Produção</p>
                      {(() => {
                        const ps = post.production_status || "pending";
                        const cfg = PRODUCTION_STATUS_CONFIG[ps];
                        return (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color} ${cfg.bgColor}`}>
                            {cfg.label}
                          </span>
                        );
                      })()}
                    </div>
                    {post.capture_date && (
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Data de Captação</p>
                        <span className="text-xs font-medium">
                          {(() => {
                            try { return format(new Date(post.capture_date + "T00:00:00"), "dd/MM/yyyy"); }
                            catch { return post.capture_date; }
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Title + Type (edit mode) */}
              {editing ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Título do Post</Label>
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Título do post"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo de Post</Label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {POST_TYPE_OPTIONS_ORDERED.map((t) => {
                        const cfg = POST_TYPE_CONFIG[t];
                        const sel = editForm.post_type === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setEditForm((p) => ({ ...p, post_type: t }))}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs text-left transition-all ${
                              sel
                                ? "border-blue-500/60 bg-blue-500/10 font-semibold"
                                : "border-border hover:border-muted-foreground/30 hover:bg-muted/40"
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-sm shrink-0 ${cfg.bgColor}`} />
                            <span className="truncate">{cfg.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Arte do post (Simulador de Feed) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Arte do post
                  </Label>
                  {canEdit && post.media_url && (
                    <button
                      type="button"
                      onClick={handleMediaRemove}
                      disabled={uploadingMedia}
                      className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
                    >
                      Remover
                    </button>
                  )}
                </div>
                {post.media_url ? (
                  <div className="relative rounded-lg overflow-hidden border border-border group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.media_url} alt="Arte do post" className="w-full max-h-72 object-cover" />
                    {canEdit && (
                      <label className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/60 text-white text-xs cursor-pointer hover:bg-black/80 transition-colors">
                        {uploadingMedia ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
                        Trocar
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleMediaUpload(f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                ) : canEdit ? (
                  <label className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border hover:border-blue-400 p-5 cursor-pointer transition-colors text-center">
                    {uploadingMedia
                      ? <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
                    <span className="text-sm font-medium">Enviar arte do post</span>
                    <span className="text-[11px] text-muted-foreground">JPG/PNG até 8MB — aparece no Simulador de Feed</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleMediaUpload(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Sem arte anexada</p>
                )}
              </div>

              {/* Copy */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Legenda / Copy
                  </Label>
                  {(canEdit) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRefine(undefined, "copy", "rewrite")}
                      disabled={refining !== null}
                      className="h-7 text-xs gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      {refining === "rewrite"
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Sparkles className="h-3 w-3" />}
                      {editForm.copy ? "Reescrever" : "Gerar"} com IA
                    </Button>
                  )}
                </div>
                {editing ? (
                  <RichTextArea
                    value={editForm.copy}
                    onChange={(v) => setEditForm((p) => ({ ...p, copy: v }))}
                    placeholder="Escreva a legenda do post..."
                    rows={6}
                  />
                ) : (
                  <div className="rounded-lg border border-border p-3 text-sm bg-muted/20 min-h-[80px]">
                    {post.copy
                      ? <RichText text={post.copy} />
                      : <span className="text-muted-foreground italic">Sem legenda cadastrada</span>}
                  </div>
                )}
              </div>

              {/* Refino rápido com IA */}
              {canEdit && (
                <div className="rounded-lg border border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/10 p-3 space-y-2.5">
                  <Label className="text-xs flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                    <Wand2 className="h-3.5 w-3.5" />
                    Refino rápido com IA
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {REFINE_PRESETS.map(({ label, instruction }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => handleRefine(instruction, "copy", label)}
                        disabled={refining !== null}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800 bg-background text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                      >
                        {refining === label && <Loader2 className="h-3 w-3 animate-spin" />}
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={refineInstruction}
                      onChange={(e) => setRefineInstruction(e.target.value)}
                      placeholder='Instrução livre: ex. "cite a promoção de julho no início"'
                      className="h-8 text-xs flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && refineInstruction.trim()) {
                          e.preventDefault();
                          handleRefine(refineInstruction.trim(), "copy", "custom");
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRefine(refineInstruction.trim(), "copy", "custom")}
                      disabled={refining !== null || !refineInstruction.trim()}
                      className="h-8 text-xs gap-1.5 shrink-0"
                    >
                      {refining === "custom" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Aplicar
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRefine(refineInstruction.trim() || undefined, "full", "full")}
                    disabled={refining !== null}
                    className="h-7 w-full text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    {refining === "full" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Regenerar post inteiro (nova ideia, copy e brief)
                  </Button>
                </div>
              )}

              {/* Hashtags */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  Hashtags
                </Label>
                {editing ? (
                  <Input
                    value={editForm.hashtags}
                    onChange={(e) => setEditForm((p) => ({ ...p, hashtags: e.target.value }))}
                    placeholder="#marketing #socialmedia #conteudo"
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {(post.hashtags || []).length > 0
                      ? post.hashtags.map((h, idx) => (
                        <span key={`${h}-${idx}`} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                          #{h.replace(/^#/, "")}
                        </span>
                      ))
                      : <span className="text-xs text-muted-foreground italic">Sem hashtags</span>
                    }
                  </div>
                )}
              </div>

              {/* Brief para criador */}
              <div className="space-y-2">
                <Label className="text-xs">Brief para o Criador de Conteúdo</Label>
                {editing ? (
                  <RichTextArea
                    value={editForm.content_description}
                    onChange={(v) => setEditForm((p) => ({ ...p, content_description: v }))}
                    placeholder="Descreva o que deve ser filmado/fotografado, ângulos, referências visuais..."
                    rows={4}
                  />
                ) : (
                  <div className="rounded-lg border border-border p-3 text-sm bg-muted/20 min-h-[60px]">
                    {post.content_description
                      ? <RichText text={post.content_description} />
                      : <span className="text-muted-foreground italic">Sem brief cadastrado</span>}
                  </div>
                )}
              </div>

              {/* Links de produção */}
              <div className="space-y-3 pt-1 border-t border-border">
                <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                  <Link2 className="h-3.5 w-3.5" />
                  Links de produção
                </Label>

                {/* Material link */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <FolderOpen className="h-3 w-3 text-amber-500" />
                    Material para produção
                  </Label>
                  {editing ? (
                    <Input
                      value={editForm.material_link}
                      onChange={(e) => setEditForm((p) => ({ ...p, material_link: e.target.value }))}
                      placeholder="https://drive.google.com/... ou link do briefing"
                      className="text-sm"
                    />
                  ) : post.material_link ? (
                    <a
                      href={post.material_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-sm text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors group"
                    >
                      <FolderOpen className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate text-xs">{post.material_link}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground italic px-1">Nenhum link cadastrado</p>
                  )}
                </div>

                {/* Video link */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Film className="h-3 w-3 text-blue-500" />
                    Conteúdo pronto
                  </Label>
                  {editing ? (
                    <Input
                      value={editForm.video_link}
                      onChange={(e) => setEditForm((p) => ({ ...p, video_link: e.target.value }))}
                      placeholder="https://drive.google.com/... ou link do vídeo/artes prontas"
                      className="text-sm"
                    />
                  ) : post.video_link ? (
                    <a
                      href={post.video_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-50 dark:bg-blue-950/20 px-3 py-2 text-sm text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/40 transition-colors group"
                    >
                      <Film className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate text-xs">{post.video_link}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground italic px-1">Nenhum link cadastrado</p>
                  )}
                </div>
              </div>

              {/* Desempenho / métricas — alimentam o relatório mensal */}
              <div className="space-y-3 pt-1 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowMetrics((v) => !v)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <Label className="text-xs flex items-center gap-1.5 text-muted-foreground cursor-pointer">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Desempenho do post
                    {post.metrics_updated_at && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        registrado
                      </span>
                    )}
                  </Label>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showMetrics ? "rotate-180" : ""}`} />
                </button>
                {showMetrics && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        ["likes", "Curtidas"],
                        ["comments", "Comentários"],
                        ["shares", "Compart."],
                        ["saves", "Salvos"],
                        ["reach", "Alcance"],
                        ["views", "Visualizações"],
                      ] as const).map(([key, label]) => (
                        <div key={key} className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">{label}</Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={metricsForm[key]}
                            disabled={!canEdit}
                            onChange={(e) => setMetricsForm((p) => ({ ...p, [key]: e.target.value.replace(/\D/g, "") }))}
                            placeholder="—"
                            className="h-8 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSaveMetrics}
                        disabled={savingMetrics}
                        className="h-8 w-full text-xs gap-1.5"
                      >
                        {savingMetrics ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Salvar métricas
                      </Button>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      As métricas alimentam o Relatório Mensal do cronograma (curtidas, comentários e ranking de posts).
                    </p>
                  </div>
                )}
              </div>

              {/* Production fields (edit mode) */}
              {editing && (
                <div className="space-y-3 pt-1 border-t border-border">
                  <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                    <History className="h-3.5 w-3.5" />
                    Produção
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data de Captação</Label>
                      <Input
                        type="date"
                        value={editForm.capture_date}
                        onChange={(e) => setEditForm((p) => ({ ...p, capture_date: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status de Produção</Label>
                      <select
                        value={editForm.production_status}
                        onChange={(e) => setEditForm((p) => ({ ...p, production_status: e.target.value as ProductionStatus }))}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <option value="pending">Pendente</option>
                        <option value="in_progress">Em Produção</option>
                        <option value="done">Concluído</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {editing && (
                <div className="space-y-2">
                  <Label className="text-xs">Notas internas</Label>
                  <RichTextArea
                    value={editForm.notes}
                    onChange={(v) => setEditForm((p) => ({ ...p, notes: v }))}
                    placeholder="Observações internas sobre este post..."
                    rows={2}
                  />
                </div>
              )}
              {!editing && post.notes && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Notas</Label>
                  <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground bg-muted/20">
                    <RichText text={post.notes} />
                  </div>
                </div>
              )}

              {/* Status Actions */}
              {!editing && allowedActions.length > 0 && (
                <div className="pt-2 border-t border-border space-y-2">
                  <Label className="text-xs text-muted-foreground">Ações de fluxo</Label>
                  <div className="flex flex-wrap gap-2">
                    {allowedActions.map(({ label, next, icon: Icon, color }) => (
                      <Button
                        key={next}
                        size="sm"
                        onClick={() => handleStatusChange(next)}
                        disabled={saving}
                        className={`gap-2 ${color}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === "comments" && (
            <div className="flex flex-col h-full">
              <div className="flex-1 p-5 space-y-3 overflow-y-auto">
                {loadingComments ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    Nenhum comentário ainda. Seja o primeiro a comentar.
                  </div>
                ) : (
                  comments.map((c) => {
                    const commentTypeColors: Record<string, string> = {
                      approval: "border-l-2 border-green-500 bg-green-50 dark:bg-green-950/20",
                      rejection: "border-l-2 border-red-500 bg-red-50 dark:bg-red-950/20",
                      suggestion: "border-l-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
                      comment: "",
                    };
                    return (
                      <div key={c.id} className={`rounded-lg p-3 border border-border text-sm ${commentTypeColors[c.comment_type] || ""}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-xs">
                            {(c as any).profile?.display_name || "Usuário"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(c.created_at), "dd/MM HH:mm")}
                          </span>
                        </div>
                        <p className="text-sm">{c.comment}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Comment input */}
              <div className="p-4 border-t border-border bg-background shrink-0">
                <div className="flex gap-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escreva um comentário ou sugestão..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendComment();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendComment}
                    disabled={!newComment.trim() || sendingComment}
                    size="icon"
                    className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                  >
                    {sendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
