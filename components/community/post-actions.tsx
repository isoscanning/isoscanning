"use client";

import { useState } from "react";
import { MessageSquare, Share2, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api-service";

interface PostActionsProps {
  postId: string;
  initialLikes: number;
  commentsCount: number;
  title: string;
  /** Caminho canônico do post (ex.: /c/drones/dji-avata-na-chuva). */
  path: string;
}

/** Barra de ações (curtir / comentários / compartilhar) da página do post. */
export function PostActions({ postId, initialLikes, commentsCount, title, path }: PostActionsProps) {
  const { userProfile } = useAuth();
  const [likes, setLikes] = useState(initialLikes);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    if (!userProfile) {
      toast.error("Faça login para curtir!");
      return;
    }
    if (isLiking) return;
    setIsLiking(true);
    try {
      if (hasLiked) {
        await api.post(`/posts/${postId}/unlike`);
        setLikes((v) => Math.max(0, v - 1));
        setHasLiked(false);
      } else {
        await api.post(`/posts/${postId}/like`);
        setLikes((v) => v + 1);
        setHasLiked(true);
      }
    } catch (error) {
      console.error("Error toggling like", error);
      toast.error("Erro ao curtir a publicação.");
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${path}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: "Confira esta publicação!", url });
      } catch (err) {
        console.error("Error sharing", err);
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 text-muted-foreground">
      <Button
        variant="ghost"
        size="sm"
        className={`h-9 gap-1.5 rounded-full px-3 ${hasLiked ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
        onClick={handleLike}
        disabled={isLiking}
      >
        <ThumbsUp className={`h-4 w-4 ${hasLiked ? "fill-current" : ""}`} />
        <span className="text-xs font-bold">{likes}</span>
      </Button>

      <Button variant="ghost" size="sm" className="h-9 gap-1.5 rounded-full px-3 hover:bg-muted" asChild>
        <a href="#comentarios">
          <MessageSquare className="h-4 w-4" />
          <span className="text-xs font-bold">{commentsCount} Comentários</span>
        </a>
      </Button>

      <Button variant="ghost" size="sm" className="h-9 gap-1.5 rounded-full px-3 hover:bg-muted" onClick={handleShare}>
        <Share2 className="h-4 w-4" />
        <span className="text-xs font-bold">Compartilhar</span>
      </Button>
    </div>
  );
}
