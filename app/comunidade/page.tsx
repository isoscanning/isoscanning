"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, MessageSquare } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api-service";
import { Header } from "@/components/header";

interface Community {
    id: string;
    name: string;
    slug: string;
    description: string;
    avatarUrl?: string;
    memberCount?: number;
    _count?: {
        members: number;
        posts: number;
    };
}

export default function CommunityPage() {
    const { userProfile } = useAuth();
    const [communities, setCommunities] = useState<Community[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchCommunities();
    }, []);

    const fetchCommunities = async () => {
        try {
            const response = await api.get("/communities");
            setCommunities(response.data);
        } catch (error) {
            console.error("Failed to fetch communities", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCommunities = communities.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const CommunitySkeleton = () => (
        <Card className="h-full border border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[120px]" />
                    <Skeleton className="h-3 w-[80px]" />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                </div>
                <div className="flex gap-4 pt-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <div className="container mx-auto py-10 px-4 max-w-7xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight mb-2">Comunidade</h1>
                        <p className="text-muted-foreground text-lg">Conecte-se com outros profissionais e clientes de todo o país.</p>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar comunidades..."
                                className="pl-10 h-11 bg-muted/30 border-muted"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {userProfile && (
                            <Button asChild size="lg" className="h-11 shadow-sm px-6">
                                <Link href="/comunidade/criar">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Criar Comunidade
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {loading ? (
                        Array.from({ length: 6 }).map((_, index) => (
                            <CommunitySkeleton key={index} />
                        ))
                    ) : filteredCommunities.length > 0 ? (
                        filteredCommunities.map((community) => (
                            <Link key={community.id} href={`/c/${community.slug}`} className="block group">
                                <Card className="h-full border-border/50 bg-card hover:bg-accent/5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden">
                                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                        <Avatar className="h-14 w-14 border-2 border-primary/10 group-hover:border-primary/30 transition-colors">
                                            <AvatarImage src={community.avatarUrl} alt={community.name} className="object-cover" />
                                            <AvatarFallback className="bg-primary/5 text-primary text-xl font-bold">
                                                {community.name.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="overflow-hidden">
                                            <CardTitle className="text-xl font-bold truncate">{community.name}</CardTitle>
                                            <CardDescription className="font-mono text-xs">c/{community.slug}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground mb-6 line-clamp-3 leading-relaxed min-h-[60px]">
                                            {community.description}
                                        </p>
                                        <div className="flex items-center text-xs font-medium text-muted-foreground/80 gap-6 pt-4 border-t border-border/50">
                                            <span className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-default">
                                                <MessageSquare className="h-4 w-4" />
                                                <span className="text-foreground/90">{community._count?.posts || 0}</span> Posts
                                            </span>
                                            <span className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-default">
                                                <span className="text-foreground/90">{community._count?.members || 0}</span> membros
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-24 bg-muted/10 rounded-3xl border border-dashed border-muted">
                            <div className="flex justify-center mb-4">
                                <div className="p-4 bg-muted/30 rounded-full">
                                    <Search className="h-10 w-10 text-muted-foreground" />
                                </div>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Nenhuma comunidade encontrada</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                Não encontramos resultados for "{searchTerm}". Tente buscar por outros termos ou crie uma nova comunidade.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
