"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare, ThumbsUp, Share2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import api from "@/lib/api-service";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Post {
    id: string;
    title: string;
    content: string;
    author: {
        name: string;
        avatarUrl?: string;
    };
    communitySlug: string;
    communityName: string;
    likesCount: number;
    commentsCount: number;
    createdAt: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'none';
}

interface PostCardProps {
    post: Post;
    showCommunity?: boolean;
}

export function PostCard({ post, showCommunity = true }: PostCardProps) {
    const { userProfile } = useAuth();
    const router = useRouter();
    const [likes, setLikes] = useState(post.likesCount);
    const [isLiking, setIsLiking] = useState(false);
    const [hasLiked, setHasLiked] = useState(false); // Optimistic state since API doesn't return it yet

    const handleCardClick = () => {
        router.push(`/c/${post.communitySlug}/comments/${post.id}`);
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!userProfile) {
            toast.error("Faça login para curtir!");
            return;
        }

        if (isLiking) return;

        setIsLiking(true);
        try {
            if (hasLiked) {
                await api.post(`/posts/${post.id}/unlike`, { userId: userProfile.id });
                setLikes(Math.max(0, likes - 1));
                setHasLiked(false);
            } else {
                await api.post(`/posts/${post.id}/like`, { userId: userProfile.id });
                setLikes(likes + 1);
                setHasLiked(true);
            }
        } catch (error) {
            console.error("Error toggling like", error);
            toast.error("Erro ao curtir a publicação.");
        } finally {
            setIsLiking(false);
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const url = `${window.location.origin}/c/${post.communitySlug}/comments/${post.id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: post.title,
                    text: 'Confira esta publicação!',
                    url: url
                });
            } catch (err) {
                console.error("Error sharing", err);
            }
        } else {
            navigator.clipboard.writeText(url);
            toast.success("Link copiado para a área de transferência!");
        }
    };

    const handleCommentClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleCardClick();
    };

    return (
        <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={handleCardClick}>
            <CardHeader className="flex flex-row items-center gap-3 p-4 pb-2 space-y-0">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={post.author.avatarUrl} alt={post.author.name} />
                    <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-sm">
                    <div className="flex items-center gap-1">
                        {showCommunity && (
                            <>
                                <Link
                                    href={`/c/${post.communitySlug}`}
                                    className="font-bold hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    c/{post.communityName}
                                </Link>
                                <span className="text-muted-foreground">•</span>
                            </>
                        )}
                        <span className="text-muted-foreground">
                            Enviado por {post.author.name}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">
                            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ptBR })}
                        </span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <h3 className="text-lg font-semibold mb-2 leading-tight">{post.title}</h3>
                <p className="text-muted-foreground line-clamp-3 mb-3 text-sm">
                    {post.content}
                </p>
                {post.mediaType === 'image' && post.mediaUrl && (
                    <div className="mb-3 rounded-lg overflow-hidden max-h-96 bg-muted flex justify-center">
                        <img
                            src={post.mediaUrl}
                            alt={post.title}
                            className="object-contain max-h-96 w-full"
                        />
                    </div>
                )}

                <div className="flex items-center gap-1 text-muted-foreground mt-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`rounded-full gap-1 px-2 h-8 ${hasLiked ? "text-primary bg-primary/10" : "hover:bg-muted"}`}
                        onClick={handleLike}
                        disabled={isLiking}
                    >
                        <ThumbsUp className={`h-4 w-4 ${hasLiked ? "fill-current" : ""}`} />
                        <span className="text-xs font-bold">{likes}</span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full gap-1 px-2 h-8 hover:bg-muted"
                        onClick={handleCommentClick}
                    >
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-xs font-bold">{post.commentsCount} Comentários</span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full gap-1 px-2 h-8 hover:bg-muted"
                        onClick={handleShare}
                    >
                        <Share2 className="h-4 w-4" />
                        <span className="text-xs font-bold">Compartilhar</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
