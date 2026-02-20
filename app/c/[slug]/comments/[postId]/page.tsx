"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCard } from "@/components/community/post-card";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api-service";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Comment {
    id: string;
    postId: string;
    authorId: string;
    content: string;
    createdAt: string;
    author?: {
        name: string;
        avatarUrl?: string;
    };
}

export default function PostCommentsPage() {
    const params = useParams();
    const slug = params.slug as string;
    const postId = params.postId as string;
    const { userProfile } = useAuth();

    // The backend findById returns the raw Post + author for now (via any). Wait, let's fetch community name too.
    const [communityName, setCommunityName] = useState("");
    const [post, setPost] = useState<any>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!slug || !postId) return;
        fetchData();
    }, [slug, postId]);

    const fetchData = async () => {
        try {
            const [communityRes, postRes, commentsRes] = await Promise.all([
                api.get(`/communities/${slug}`),
                // Oh wait, backend doesn't have an endpoint for GET /posts/:id. 
                // Let's assume we need to list them from community, or we can just fetch all and find it, but backend needs GET /posts/:id.
                // Wait, if backend doesn't have GET /posts/:id, this will fail. Let's add it to posts.controller.ts if it doesn't exist.
                api.get(`/posts/${postId}`),
                api.get(`/posts/${postId}/comments`)
            ]);

            setCommunityName(communityRes.data.name);
            setPost(postRes.data);

            // Comments might need author details. Since I didn't add the join for comments, I'll display anonymous or lookup locally.
            // For now, let's use the comments.
            setComments(commentsRes.data || []);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Publicação não encontrada.");
        } finally {
            setLoading(false);
        }
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userProfile) {
            toast.error("Faça login para comentar.");
            return;
        }

        if (!newComment.trim()) return;

        try {
            setSending(true);
            const res = await api.post(`/posts/${postId}/comments`, {
                userId: userProfile.id,
                content: newComment,
            });

            // Add the new comment optimistically
            setComments(prev => [...prev, {
                ...res.data,
                author: { name: userProfile.displayName || "Você", avatarUrl: userProfile.avatarUrl || undefined }
            }]);

            // Also update the post comment count optimistically
            setPost((prev: any) => ({
                ...prev,
                commentsCount: (prev?.commentsCount || 0) + 1
            }));

            setNewComment("");
        } catch (error: any) {
            console.error("Error creating comment:", error);
            toast.error("Erro ao publicar comentário.");
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-background text-center py-20">Carregando...</div>;
    }

    if (!post) {
        return <div className="min-h-screen bg-background text-center py-20">Publicação não encontrada.</div>;
    }

    return (
        <div className="min-h-screen bg-background pb-12">
            <Header />
            <div className="container mx-auto py-8 px-4 max-w-3xl">
                <Button variant="ghost" asChild className="mb-6 -ml-4">
                    <Link href={`/c/${slug}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para c/{slug}
                    </Link>
                </Button>

                {/* Original Post */}
                <div className="mb-8">
                    <PostCard
                        post={{
                            id: post.id,
                            title: post.title,
                            content: post.content,
                            author: post.author || { name: "Usuário" },
                            communitySlug: slug,
                            communityName: communityName,
                            likesCount: post.likesCount || 0,
                            commentsCount: post.commentsCount || 0,
                            createdAt: post.createdAt,
                            mediaType: post.mediaType,
                            mediaUrl: post.mediaUrl
                        }}
                        showCommunity={true}
                    />
                </div>

                {/* Comment Input */}
                {userProfile ? (
                    <form onSubmit={handleComment} className="flex gap-3 mb-8">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={userProfile.avatarUrl || undefined} />
                            <AvatarFallback>{userProfile.displayName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 flex gap-2">
                            <Input
                                placeholder="Adicione um comentário..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="flex-1"
                            />
                            <Button type="submit" disabled={sending || !newComment.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="bg-muted p-4 rounded-lg text-center text-sm text-muted-foreground mb-8">
                        Faça login para participar da discussão.
                    </div>
                )}

                {/* Comments List */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg mb-4">Comentários ({comments.length})</h3>
                    {comments.map((comment, index) => (
                        <div key={comment.id || index} className="flex gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={comment.author?.avatarUrl} />
                                <AvatarFallback>{comment.author?.name?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 bg-muted/50 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-1 text-sm">
                                    <span className="font-semibold">{comment.author?.name || 'Membro da Comunidade'}</span>
                                    <span className="text-muted-foreground text-xs">
                                        • {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ptBR }) : 'agora mesmo'}
                                    </span>
                                </div>
                                <p className="text-sm">{comment.content}</p>
                            </div>
                        </div>
                    ))}
                    {comments.length === 0 && (
                        <p className="text-muted-foreground text-center py-6">Nenhum comentário ainda. Seja o primeiro!</p>
                    )}
                </div>
            </div>
        </div>
    );
}
