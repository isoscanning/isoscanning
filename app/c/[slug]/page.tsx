"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Users, Info, Flag, Share2, Plus, Edit } from "lucide-react";
import { PostCard } from "@/components/community/post-card";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api-service";

import { Header } from "@/components/header";
import Link from "next/link";

interface Community {
    id: string;
    name: string;
    slug: string;
    description: string;
    avatarUrl?: string;
    bannerUrl?: string;
    ownerId: string;
    ownerName?: string;
    rules?: string[];
    createdAt: string;
    _count?: {
        members: number;
        posts: number;
    };
}

export default function CommunityDetail() {
    const params = useParams();
    const slug = params.slug as string;
    const { userProfile } = useAuth();

    const [community, setCommunity] = useState<Community | null>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [isMember, setIsMember] = useState(false);
    const fetchedForSlug = useRef("");

    useEffect(() => {
        if (slug && fetchedForSlug.current !== slug) {
            fetchedForSlug.current = slug;
            fetchCommunity();
        }
    }, [slug]);

    const fetchCommunity = async () => {
        try {
            const response = await api.get(`/communities/${slug}`);
            setCommunity(response.data);

            if (response.data?.id) {
                // Fetch posts in parallel with other initial community data if needed, but since it depends on community ID, we just await it here.
                const postsRes = await api.get(`/posts/community/${response.data.id}`);
                setPosts(postsRes.data);
            }
        } catch (error) {
            console.error("Failed to fetch community", error);
        } finally {
            setLoading(false);
        }
    };

    const checkMembershipRef = useRef("");

    useEffect(() => {
        const checkMembership = async () => {
            if (community?.id && userProfile?.id) {
                const depKey = `${community.id}-${userProfile.id}`;
                if (checkMembershipRef.current === depKey) return;
                checkMembershipRef.current = depKey;

                try {
                    const res = await api.get(`/communities/${community.id}/members/${userProfile.id}`);
                    setIsMember(res.data.isMember);
                } catch (error) {
                    console.error("Failed to check membership", error);
                }
            }
        };

        checkMembership();
    }, [community?.id, userProfile?.id]);

    const handleJoinToggle = async () => {
        if (!userProfile || !community) return;
        setJoining(true);
        try {
            if (isMember) {
                await api.post(`/communities/${community.id}/leave`, { userId: userProfile.id });
            } else {
                await api.post(`/communities/${community.id}/join`, { userId: userProfile.id });
            }
            setIsMember(!isMember);
        } catch (error) {
            console.error("Failed to toggle membership", error);
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                {/* Banner Skeleton */}
                <Skeleton className="h-32 md:h-48 w-full rounded-none" />

                <div className="container mx-auto px-4">
                    {/* Header Info Skeleton */}
                    <div className="relative mb-6 flex flex-col md:flex-row items-start md:items-end gap-4">
                        <div className="-mt-12">
                            <Skeleton className="h-24 w-24 rounded-full border-4 border-background" />
                        </div>
                        <div className="flex-1 mt-4 md:mb-2 space-y-3">
                            <Skeleton className="h-8 w-56" />
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-full max-w-lg" />
                            <Skeleton className="h-4 w-4/5 max-w-lg" />
                        </div>
                        <div className="flex gap-2 mb-4 md:mb-2">
                            <Skeleton className="h-10 w-32 rounded-full" />
                        </div>
                    </div>

                    {/* Content + Sidebar Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-4">
                            {/* Create post input skeleton */}
                            <Skeleton className="h-16 w-full rounded-lg" />
                            {/* Posts skeleton */}
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="border border-border/50 rounded-lg p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-3 w-full" />
                                    <Skeleton className="h-3 w-5/6" />
                                    <div className="flex gap-4 pt-1">
                                        <Skeleton className="h-3 w-16" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Sidebar skeleton */}
                        <div className="space-y-6">
                            <div className="border border-border/50 rounded-lg p-4 space-y-4">
                                <Skeleton className="h-4 w-36" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-4/5" />
                                <div className="flex justify-between pt-2">
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-8 w-16" />
                                </div>
                                <Skeleton className="h-10 w-full rounded-full" />
                            </div>
                            <div className="border border-border/50 rounded-lg p-4 space-y-3">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-4/5" />
                                <Skeleton className="h-3 w-3/5" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!community) {
        return <div className="container mx-auto py-8 text-center">Comunidade não encontrada.</div>;
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />
            {/* Banner */}
            <div className="h-32 md:h-48 bg-muted w-full relative overflow-hidden">
                {community.bannerUrl ? (
                    <img src={community.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600" />
                )}
            </div>

            <div className="container mx-auto px-4">
                {/* Header Info */}
                <div className="relative mb-6 flex flex-col md:flex-row items-start md:items-end gap-4">
                    <div className="-mt-12">
                        <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                            <AvatarImage src={community.avatarUrl} alt={community.name} />
                            <AvatarFallback className="text-2xl">{community.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="flex-1 mt-4 md:mb-2">
                        <h1 className="text-3xl font-bold">{community.name}</h1>
                        <p className="text-muted-foreground font-medium">c/{community.slug}</p>

                        {community.description && (
                            <p className="mt-4 max-w-2xl text-base text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                {community.description}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2 mb-4 md:mb-2 md:pb-2">
                        {userProfile?.id === community.ownerId && (
                            <Button
                                variant="outline"
                                asChild
                                className="rounded-full"
                            >
                                <Link href={`/c/${community.slug}/editar`}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar Comunidade
                                </Link>
                            </Button>
                        )}
                        <Button
                            variant={isMember ? "outline" : "default"}
                            onClick={handleJoinToggle}
                            disabled={joining}
                            className="rounded-full"
                        >
                            {isMember ? "Seguindo" : "Seguir Comunidade"}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Main Content (Posts) */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Create Post Input Trigger (if logged in) */}
                        {userProfile && (
                            <Link href={`/c/${community.slug}/novo`}>
                                <Card className="mb-6 hover:border-primary/50 transition-colors cursor-pointer">
                                    <CardContent className="p-4 flex gap-3 items-center">
                                        <Avatar>
                                            <AvatarImage src={userProfile.avatarUrl || undefined} />
                                            <AvatarFallback>{userProfile.displayName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <Input
                                            placeholder="Criar uma publicação..."
                                            className="pointer-events-none"
                                            readOnly
                                        />
                                        <Button variant="ghost" size="icon" asChild>
                                            <div>
                                                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Link>
                        )}

                        <Tabs defaultValue="new" className="w-full">
                            <TabsList className="mb-4">
                                <TabsTrigger value="new">Novos</TabsTrigger>
                                <TabsTrigger value="top">Em Alta</TabsTrigger>
                            </TabsList>
                            <TabsContent value="new" className="space-y-4">
                                {posts.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">Nenhuma publicação ainda. Seja o primeiro a criar uma!</p>
                                ) : (
                                    posts.map((post) => (
                                        <PostCard
                                            key={post.id}
                                            post={{
                                                id: post.id,
                                                title: post.title,
                                                content: post.content,
                                                author: post.author || { name: "Usuário Desconhecido" },
                                                communitySlug: community.slug,
                                                communityName: community.name,
                                                likesCount: post.likesCount || 0,
                                                commentsCount: post.commentsCount || 0,
                                                createdAt: post.createdAt,
                                                mediaType: post.mediaType,
                                                mediaUrl: post.mediaUrl
                                            }}
                                            showCommunity={false}
                                        />
                                    ))
                                )}
                            </TabsContent>
                            <TabsContent value="top">
                                <p className="text-center text-muted-foreground py-8">Nenhum post em alta ainda.</p>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader className="bg-muted/50 pb-3">
                                <CardContent className="p-0 font-semibold flex items-center gap-2">
                                    <Info className="h-4 w-4" /> Sobre a Comunidade
                                </CardContent>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="space-y-2">
                                    <p className="text-sm">{community.description}</p>
                                    {community.ownerName && (
                                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                            <span>Criada por</span>
                                            <span className="font-medium text-foreground">{community.ownerName}</span>
                                        </p>
                                    )}
                                </div>

                                <Separator />

                                <div className="flex justify-between text-sm">
                                    <div className="flex flex-col">
                                        <span className="font-bold">{community._count?.members || 0}</span>
                                        <span className="text-xs text-muted-foreground">Membros</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold">{community._count?.posts || 0}</span>
                                        <span className="text-xs text-muted-foreground">Posts</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold">
                                            {community.createdAt
                                                ? new Date(community.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
                                                : "Hoje"}
                                        </span>
                                        <span className="text-xs text-muted-foreground">Criado em</span>
                                    </div>
                                </div>

                                <Separator />

                                <Button className="w-full rounded-full" onClick={handleJoinToggle}>
                                    {isMember ? "Sair da Comunidade" : "Entrar na Comunidade"}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Regras</h3>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                {community.rules && community.rules.length > 0 ? (
                                    community.rules.map((rule, idx) => (
                                        <div key={idx} className="flex gap-2 items-start">
                                            <span className="font-bold text-muted-foreground">{idx + 1}.</span>
                                            <p>{rule}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground italic text-center py-2">Nenhuma regra definida ainda.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
