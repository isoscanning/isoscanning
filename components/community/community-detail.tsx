"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Edit, Info, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api-service";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/community/post-card";
import type { PublicCommunity, PublicPost } from "@/lib/community-types";

interface CommunityDetailProps {
  /** Dados carregados no servidor (app/c/[slug]/page.tsx) — já vêm no HTML. */
  community: PublicCommunity;
  posts: PublicPost[];
}

export function CommunityDetail({ community, posts }: CommunityDetailProps) {
  const { userProfile } = useAuth();
  const [isMember, setIsMember] = useState(false);
  const [joining, setJoining] = useState(false);
  const checkedFor = useRef("");

  // Estado de membro é por usuário — resolvido no cliente, depois da hidratação.
  useEffect(() => {
    if (!userProfile?.id) {
      setIsMember(false);
      checkedFor.current = "";
      return;
    }
    const key = `${community.id}-${userProfile.id}`;
    if (checkedFor.current === key) return;
    checkedFor.current = key;

    api
      .get(`/communities/${community.id}/members/${userProfile.id}`)
      .then((res) => setIsMember(!!res.data?.isMember))
      .catch((error) => console.error("Failed to check membership", error));
  }, [community.id, userProfile?.id]);

  const handleJoinToggle = async () => {
    if (!userProfile) {
      toast.error("Faça login para seguir a comunidade.");
      return;
    }
    setJoining(true);
    try {
      await api.post(`/communities/${community.id}/${isMember ? "leave" : "join"}`);
      setIsMember(!isMember);
    } catch (error) {
      console.error("Failed to toggle membership", error);
      toast.error("Não foi possível atualizar sua participação.");
    } finally {
      setJoining(false);
    }
  };

  const topPosts = useMemo(
    () => [...posts].sort((a, b) => b.likesCount + b.commentsCount - (a.likesCount + a.commentsCount)),
    [posts],
  );

  const renderPosts = (list: PublicPost[], emptyMessage: string) =>
    list.length === 0 ? (
      <p className="py-8 text-center text-muted-foreground">{emptyMessage}</p>
    ) : (
      list.map((post) => (
        <PostCard
          key={post.id}
          post={{
            id: post.id,
            slug: post.slug,
            title: post.title,
            content: post.content,
            excerpt: post.excerpt,
            author: post.author,
            communitySlug: community.slug,
            communityName: community.name,
            likesCount: post.likesCount,
            commentsCount: post.commentsCount,
            createdAt: post.createdAt,
            mediaType: post.mediaType,
            mediaUrl: post.mediaUrl,
          }}
          showCommunity={false}
        />
      ))
    );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Banner */}
      <div className="relative h-32 w-full overflow-hidden bg-muted md:h-48">
        {community.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={community.bannerUrl} alt={`Banner de ${community.name}`} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-blue-500 to-purple-600" />
        )}
      </div>

      <div className="container mx-auto px-4">
        {/* Header Info */}
        <div className="relative mb-6 flex flex-col items-start gap-4 md:flex-row md:items-end">
          <div className="-mt-12">
            <Avatar className="h-24 w-24 border-4 border-background shadow-md">
              <AvatarImage src={community.avatarUrl ?? undefined} alt={community.name} />
              <AvatarFallback className="text-2xl">{community.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
          <div className="mt-4 flex-1 md:mb-2">
            <h1 className="text-3xl font-bold">{community.name}</h1>
            <p className="font-medium text-muted-foreground">c/{community.slug}</p>

            {community.description && (
              <p className="mt-4 max-w-2xl whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
                {community.description}
              </p>
            )}
          </div>
          <div className="mb-4 flex gap-2 md:mb-2 md:pb-2">
            {userProfile?.id === community.ownerId && (
              <Button variant="outline" asChild className="rounded-full">
                <Link href={`/c/${community.slug}/editar`}>
                  <Edit className="mr-2 h-4 w-4" />
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

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Main Content (Posts) */}
          <div className="space-y-6 md:col-span-2">
            {userProfile && (
              <Link href={`/c/${community.slug}/novo`}>
                <Card className="mb-6 cursor-pointer transition-colors hover:border-primary/50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Avatar>
                      <AvatarImage src={userProfile.avatarUrl || undefined} />
                      <AvatarFallback>{userProfile.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <Input placeholder="Criar uma publicação..." className="pointer-events-none" readOnly />
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
                {renderPosts(posts, "Nenhuma publicação ainda. Seja o primeiro a criar uma!")}
              </TabsContent>
              <TabsContent value="top" className="space-y-4">
                {renderPosts(topPosts, "Nenhum post em alta ainda.")}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar Info */}
          <aside className="space-y-6">
            <Card>
              <CardHeader className="bg-muted/50 pb-3">
                <CardContent className="flex items-center gap-2 p-0 font-semibold">
                  <Info className="h-4 w-4" /> Sobre a Comunidade
                </CardContent>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <p className="text-sm">{community.description}</p>
                  {community.ownerName && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
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
                        ? new Date(community.createdAt).toLocaleDateString("pt-BR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "Hoje"}
                    </span>
                    <span className="text-xs text-muted-foreground">Criado em</span>
                  </div>
                </div>

                <Separator />

                <Button className="w-full rounded-full" onClick={handleJoinToggle} disabled={joining}>
                  {isMember ? "Sair da Comunidade" : "Entrar na Comunidade"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Regras</h2>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {community.rules && community.rules.length > 0 ? (
                  community.rules.map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="font-bold text-muted-foreground">{idx + 1}.</span>
                      <p>{rule}</p>
                    </div>
                  ))
                ) : (
                  <p className="py-2 text-center italic text-muted-foreground">Nenhuma regra definida ainda.</p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
