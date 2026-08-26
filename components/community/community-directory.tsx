"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, Plus, Search } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PublicCommunity } from "@/lib/community-types";

interface CommunityDirectoryProps {
  /** Lista carregada no servidor (app/comunidade/page.tsx) — já vem no HTML. */
  communities: PublicCommunity[];
}

export function CommunityDirectory({ communities }: CommunityDirectoryProps) {
  const { userProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const term = searchTerm.trim().toLowerCase();
  const filteredCommunities = term
    ? communities.filter(
        (c) => c.name.toLowerCase().includes(term) || (c.description || "").toLowerCase().includes(term),
      )
    : communities;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-7xl px-4 py-10">
        <div className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h1 className="mb-2 text-4xl font-extrabold tracking-tight">Comunidade</h1>
            <p className="text-lg text-muted-foreground">
              Conecte-se com outros profissionais e clientes de todo o país.
            </p>
          </div>

          <div className="flex w-full gap-3 md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar comunidades..."
                className="h-11 border-muted bg-muted/30 pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {userProfile && (
              <Button asChild size="lg" className="h-11 px-6 shadow-sm">
                <Link href="/comunidade/criar">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Comunidade
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filteredCommunities.length > 0 ? (
            filteredCommunities.map((community) => (
              <Link key={community.id} href={`/c/${community.slug}`} className="group block">
                <Card className="h-full overflow-hidden border-border/50 bg-card transition-all duration-300 hover:-translate-y-1 hover:bg-accent/5 hover:shadow-lg">
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <Avatar className="h-14 w-14 border-2 border-primary/10 transition-colors group-hover:border-primary/30">
                      <AvatarImage src={community.avatarUrl ?? undefined} alt={community.name} className="object-cover" />
                      <AvatarFallback className="bg-primary/5 text-xl font-bold text-primary">
                        {community.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                      <CardTitle className="truncate text-xl font-bold">{community.name}</CardTitle>
                      <CardDescription className="font-mono text-xs">c/{community.slug}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-6 line-clamp-3 min-h-[60px] text-sm leading-relaxed text-muted-foreground">
                      {community.description}
                    </p>
                    <div className="flex items-center gap-6 border-t border-border/50 pt-4 text-xs font-medium text-muted-foreground/80">
                      <span className="flex cursor-default items-center gap-1.5 transition-colors hover:text-primary">
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-foreground/90">{community._count?.posts || 0}</span> Posts
                      </span>
                      <span className="flex cursor-default items-center gap-1.5 transition-colors hover:text-primary">
                        <span className="text-foreground/90">{community._count?.members || 0}</span> membros
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="col-span-full rounded-3xl border border-dashed border-muted bg-muted/10 py-24 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-muted/30 p-4">
                  <Search className="h-10 w-10 text-muted-foreground" />
                </div>
              </div>
              <h3 className="mb-2 text-xl font-semibold">Nenhuma comunidade encontrada</h3>
              <p className="mx-auto max-w-sm text-muted-foreground">
                {term
                  ? `Não encontramos resultados para "${searchTerm}". Tente buscar por outros termos ou crie uma nova comunidade.`
                  : "Ainda não há comunidades. Seja o primeiro a criar uma!"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
