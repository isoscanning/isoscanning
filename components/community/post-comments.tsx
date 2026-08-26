"use client";

import { useCallback, useEffect, useState } from "react";
import { Send, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PublicComment } from "@/lib/community-types";
import { revalidateCommunityPaths } from "@/app/actions/community";

interface CommentNode extends PublicComment {
  replies: CommentNode[];
}

interface PostCommentsProps {
  postId: string;
  communitySlug: string;
  postSlug: string | null;
  /** Comentários renderizados no servidor (aparecem no HTML para o Google). */
  initialComments: PublicComment[];
}

// A API devolve o mesmo shape com Date serializada; normaliza para PublicComment.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(raw: any[]): PublicComment[] {
  return (raw || []).map((c) => ({
    id: c.id,
    postId: c.postId,
    parentId: c.parentId ?? null,
    authorId: c.authorId,
    content: c.content,
    createdAt: typeof c.createdAt === "string" ? c.createdAt : new Date(c.createdAt).toISOString(),
    likesCount: c.likesCount ?? 0,
    hasLiked: !!c.hasLiked,
    author: c.author ?? { name: "Usuário" },
  }));
}

function buildTree(flat: PublicComment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];
  flat.forEach((c) => map.set(c.id, { ...c, replies: [] }));
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

interface CommentItemProps {
  comment: CommentNode;
  depth: number;
  onLike: (commentId: string, hasLiked: boolean) => void;
  onReply: (comment: CommentNode) => void;
}

function CommentItem({ comment, depth, onLike, onReply }: CommentItemProps) {
  return (
    <div className={`mt-4 flex gap-3 ${depth > 0 ? "ml-8 sm:ml-12" : ""}`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={comment.author.avatarUrl ?? undefined} alt={comment.author.name} />
        <AvatarFallback>{comment.author.name?.[0] || "U"}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="inline-block w-full min-w-[200px] rounded-2xl bg-muted/50 p-3 sm:w-auto">
          <div className="mb-1 flex items-center gap-2 text-sm">
            <span className="font-semibold">{comment.author.name || "Membro da Comunidade"}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
        </div>

        <div className="ml-2 mt-1 flex items-center gap-4 text-xs font-medium text-muted-foreground">
          <time dateTime={comment.createdAt}>
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ptBR })}
          </time>
          <button
            type="button"
            onClick={() => onLike(comment.id, comment.hasLiked)}
            className={`cursor-pointer hover:underline ${comment.hasLiked ? "font-bold text-primary" : ""}`}
          >
            Gostar {comment.likesCount ? `(${comment.likesCount})` : ""}
          </button>
          <button type="button" onClick={() => onReply(comment)} className="cursor-pointer hover:underline">
            Responder
          </button>
        </div>

        {comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} depth={depth + 1} onLike={onLike} onReply={onReply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PostComments({ postId, communitySlug, postSlug, initialComments }: PostCommentsProps) {
  const { userProfile } = useAuth();
  const userId = userProfile?.id;

  const [comments, setComments] = useState<PublicComment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<CommentNode | null>(null);
  const [sending, setSending] = useState(false);

  const refetch = useCallback(async () => {
    try {
      const res = await api.get(`/posts/${postId}/comments${userId ? `?userId=${userId}` : ""}`);
      setComments(normalize(res.data));
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  }, [postId, userId]);

  // Logado: rebusca para saber quais comentários o usuário já curtiu (hasLiked).
  useEffect(() => {
    if (userId) refetch();
  }, [userId, refetch]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) {
      toast.error("Faça login para comentar.");
      return;
    }
    if (!newComment.trim()) return;

    try {
      setSending(true);
      await api.post(`/posts/${postId}/comments`, {
        content: newComment,
        parentId: replyingTo?.id,
      });
      await refetch();
      revalidateCommunityPaths(communitySlug, postSlug).catch(() => {});
      setNewComment("");
      setReplyingTo(null);
    } catch (error) {
      console.error("Error creating comment:", error);
      toast.error("Erro ao publicar comentário.");
    } finally {
      setSending(false);
    }
  };

  const toggleLike = async (commentId: string, hasLiked: boolean) => {
    if (!userProfile) {
      toast.error("Faça login para curtir.");
      return;
    }
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, hasLiked: !hasLiked, likesCount: Math.max(0, c.likesCount + (hasLiked ? -1 : 1)) }
          : c,
      ),
    );
    try {
      await api.post(`/posts/comments/${commentId}/${hasLiked ? "unlike" : "like"}`);
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error("Erro ao curtir comentário.");
      refetch();
    }
  };

  const tree = buildTree(comments);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Comentários {comments.length ? `(${comments.length})` : ""}</h2>

      {userProfile ? (
        <div className="mb-8">
          {replyingTo && (
            <div className="flex items-center justify-between rounded-t-lg border-b border-background/50 bg-muted p-2 px-4 text-sm text-muted-foreground">
              <span>
                Respondendo a <strong>{replyingTo.author.name}</strong>
              </span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setReplyingTo(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          <form onSubmit={handleComment} className={`flex gap-3 ${replyingTo ? "rounded-b-lg border-t-0 bg-muted/30 p-3" : ""}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={userProfile.avatarUrl || undefined} />
              <AvatarFallback>{userProfile.displayName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-1 gap-2">
              <Input
                id="comment-input"
                placeholder={replyingTo ? "Escreva sua resposta..." : "Adicione um comentário..."}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 bg-background"
              />
              <Button type="submit" disabled={sending || !newComment.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="mb-8 rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
          Faça login para participar da discussão.
        </div>
      )}

      <div className="space-y-2">
        {tree.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            depth={0}
            onLike={toggleLike}
            onReply={(c) => {
              setReplyingTo(c);
              setTimeout(() => document.getElementById("comment-input")?.focus(), 100);
            }}
          />
        ))}
        {tree.length === 0 && (
          <p className="py-6 text-center text-muted-foreground">Nenhum comentário ainda. Seja o primeiro!</p>
        )}
      </div>
    </div>
  );
}
