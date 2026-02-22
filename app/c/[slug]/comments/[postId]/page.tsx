"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCard } from "@/components/community/post-card";
import { ArrowLeft, Send, X } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api-service";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Comment {
    id: string;
    postId: string;
    parentId?: string;
    authorId: string;
    content: string;
    createdAt: string;
    likesCount?: number;
    hasLiked?: boolean;
    author?: {
        name: string;
        avatarUrl?: string;
    };
    replies?: Comment[];
}

export default function PostCommentsPage() {
    const params = useParams();
    const slug = params.slug as string;
    const postId = params.postId as string;
    const { userProfile } = useAuth();

    const [communityName, setCommunityName] = useState("");
    const [post, setPost] = useState<any>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!slug || !postId) return;
        fetchData();
    }, [slug, postId, userProfile?.id]); // Refetch if user changes to get updated likes

    const fetchData = async () => {
        try {
            const [communityRes, postRes, commentsRes] = await Promise.all([
                api.get(`/communities/${slug}`),
                api.get(`/posts/${postId}`),
                api.get(`/posts/${postId}/comments${userProfile ? `?userId=${userProfile.id}` : ''}`)
            ]);

            setCommunityName(communityRes.data.name);
            setPost(postRes.data);

            const rawComments = commentsRes.data || [];
            const commentMap = new Map<string, Comment>();
            const rootComments: Comment[] = [];

            rawComments.forEach((c: Comment) => {
                c.replies = [];
                commentMap.set(c.id, c);
            });

            rawComments.forEach((c: Comment) => {
                if (c.parentId && commentMap.has(c.parentId)) {
                    commentMap.get(c.parentId)!.replies!.push(c);
                } else {
                    rootComments.push(c);
                }
            });

            setComments(rootComments);
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
            await api.post(`/posts/${postId}/comments`, {
                userId: userProfile.id,
                content: newComment,
                parentId: replyingTo?.id
            });

            // Refetch to cleanly get the updated nested structure
            await fetchData();

            // Optimistic post comment count update
            setPost((prev: any) => ({
                ...prev,
                commentsCount: (prev?.commentsCount || 0) + 1
            }));

            setNewComment("");
            setReplyingTo(null);
        } catch (error: any) {
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

        try {
            // Optimistic update of the UI
            const updateTree = (nodes: Comment[]): Comment[] => {
                return nodes.map(node => {
                    if (node.id === commentId) {
                        return {
                            ...node,
                            hasLiked: !hasLiked,
                            likesCount: (node.likesCount || 0) + (!hasLiked ? 1 : -1)
                        };
                    }
                    if (node.replies && node.replies.length > 0) {
                        return { ...node, replies: updateTree(node.replies) };
                    }
                    return node;
                });
            };
            setComments(prev => updateTree(prev));

            if (hasLiked) {
                await api.post(`/posts/comments/${commentId}/unlike`, { userId: userProfile.id });
            } else {
                await api.post(`/posts/comments/${commentId}/like`, { userId: userProfile.id });
            }
        } catch (error) {
            console.error("Error toggling like:", error);
            toast.error("Erro ao curtir comentário.");
            fetchData(); // Rollback on error
        }
    };

    if (loading) {
        return <div className="min-h-screen bg-background text-center py-20">Carregando...</div>;
    }

    if (!post) {
        return <div className="min-h-screen bg-background text-center py-20">Publicação não encontrada.</div>;
    }

    // Recursive Comment Item Component
    const CommentItem = ({ comment, depth = 0 }: { comment: Comment, depth?: number }) => {
        return (
            <div className={`flex gap-3 mt-4 ${depth > 0 ? "ml-12" : ""}`}>
                <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={comment.author?.avatarUrl} />
                    <AvatarFallback>{comment.author?.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="bg-muted/50 p-3 rounded-2xl inline-block w-full sm:w-auto min-w-[200px]">
                        <div className="flex items-center gap-2 mb-1 text-sm">
                            <span className="font-semibold">{comment.author?.name || 'Membro da Comunidade'}</span>
                            {/* Option to show author title or badge here if we had it */}
                        </div>
                        <p className="text-sm">{comment.content}</p>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground font-medium ml-2">
                        <span>{comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ptBR }) : 'agora mesmo'}</span>
                        <button
                            onClick={() => toggleLike(comment.id, !!comment.hasLiked)}
                            className={`hover:underline cursor-pointer ${comment.hasLiked ? "text-primary font-bold" : ""}`}
                        >
                            Gostar {comment.likesCount ? `(${comment.likesCount})` : ""}
                        </button>
                        <button
                            onClick={() => {
                                setReplyingTo(comment);
                                setTimeout(() => document.getElementById("comment-input")?.focus(), 100);
                            }}
                            className="hover:underline cursor-pointer"
                        >
                            Responder
                        </button>
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-2">
                            {comment.replies.map(reply => (
                                <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

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

                {/* Comment Input Component */}
                {userProfile ? (
                    <div className="mb-8">
                        {replyingTo && (
                            <div className="bg-muted p-2 px-4 rounded-t-lg text-sm text-muted-foreground flex items-center justify-between border-b border-background/50">
                                <span>Respondendo a <strong>{replyingTo.author?.name}</strong></span>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setReplyingTo(null)}>
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                        <form onSubmit={handleComment} className={`flex gap-3 ${replyingTo ? 'bg-muted/30 p-3 rounded-b-lg border-t-0' : ''}`}>
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={userProfile.avatarUrl || undefined} />
                                <AvatarFallback>{userProfile.displayName?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 flex gap-2">
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
                    <div className="bg-muted p-4 rounded-lg text-center text-sm text-muted-foreground mb-8">
                        Faça login para participar da discussão.
                    </div>
                )}

                {/* Comments List */}
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg mb-4">Comentários {post.commentsCount ? `(${post.commentsCount})` : ''}</h3>
                    {comments.map((comment) => (
                        <CommentItem key={comment.id} comment={comment} depth={0} />
                    ))}
                    {comments.length === 0 && (
                        <p className="text-muted-foreground text-center py-6">Nenhum comentário ainda. Seja o primeiro!</p>
                    )}
                </div>
            </div>
        </div>
    );
}

