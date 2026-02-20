"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Plus, MessageSquare, Heart, Share2 } from "lucide-react";
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

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <div className="container mx-auto py-8 px-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Comunidade</h1>
                        <p className="text-muted-foreground">Conecte-se com outros profissionais e clientes.</p>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar comunidades..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {userProfile && (
                            <Button asChild>
                                <Link href="/comunidade/criar">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Criar Comunidade
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <p>Carregando comunidades...</p>
                    ) : filteredCommunities.length > 0 ? (
                        filteredCommunities.map((community) => (
                            <Link key={community.id} href={`/c/${community.slug}`} className="block h-full">
                                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={community.avatarUrl} alt={community.name} />
                                            <AvatarFallback>{community.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-lg">{community.name}</CardTitle>
                                            <CardDescription>c/{community.slug}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                                            {community.description}
                                        </p>
                                        <div className="flex items-center text-xs text-muted-foreground gap-4">
                                            <span className="flex items-center gap-1">
                                                <MessageSquare className="h-3 w-3" />
                                                {community._count?.posts || 0} Posts
                                            </span>
                                            <span className="flex items-center gap-1">
                                                {community._count?.members || 0} membros
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12">
                            <p className="text-muted-foreground">Nenhuma comunidade encontrada.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
