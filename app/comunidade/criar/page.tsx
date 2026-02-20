"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api-service";
import { toast } from "sonner";
import { uploadFile } from "@/lib/supabase-storage";

export default function CreateCommunityPage() {
    const router = useRouter();
    const { userProfile } = useAuth();

    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [rules, setRules] = useState<string[]>([]);
    const [currentRule, setCurrentRule] = useState("");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Helper to generate slug
    const handleNameChange = (val: string) => {
        setName(val);
        const autoSlug = val
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
        setSlug(autoSlug);
    };

    const handleAddRule = () => {
        if (currentRule.trim() !== "") {
            setRules([...rules, currentRule.trim()]);
            setCurrentRule("");
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("A imagem deve ter no máximo 5MB.");
            return;
        }

        if (!file.type.startsWith("image/")) {
            toast.error("O arquivo deve ser uma imagem válida.");
            return;
        }

        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const handleAvatarClick = () => {
        document.getElementById("avatar-upload")?.click();
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userProfile) {
            toast.error("Você precisa estar logado para criar uma comunidade.");
            return;
        }

        try {
            setLoading(true);
            let avatarUrl = undefined;

            if (avatarFile) {
                const uploadResult = await uploadFile(avatarFile, "posts"); // Reusing posts bucket or we can use another bucket. Assuming 'posts' or 'communities' bucket. Let's use 'posts' since we know it's public and exists.
                avatarUrl = uploadResult;
            }

            const response = await api.post("/communities", {
                name,
                slug,
                description,
                avatarUrl,
                ownerId: userProfile.id,
                rules,
            });

            // Make the creator join automatically
            await api.post(`/communities/${response.data.id}/join`, {
                userId: userProfile.id
            });

            toast.success("Comunidade criada com sucesso!");
            router.push(`/c/${slug}`);
        } catch (error: any) {
            console.error("Error creating community:", error);
            toast.error("Erro ao criar a comunidade. Verifique se o slug já existe.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <div className="container mx-auto py-8 px-4 max-w-2xl">
                <Button variant="ghost" asChild className="mb-6 -ml-4">
                    <Link href="/comunidade">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para Comunidades
                    </Link>
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle>Criar Nova Comunidade</CardTitle>
                        <CardDescription>
                            Preencha os dados abaixo para iniciar um novo espaço de discussão na plataforma.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleCreate}>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col items-center mb-6">
                                <input
                                    type="file"
                                    id="avatar-upload"
                                    className="hidden"
                                    accept="image/png, image/jpeg, image/webp"
                                    onChange={handleAvatarChange}
                                />
                                <div
                                    className="relative cursor-pointer group rounded-full"
                                    onClick={handleAvatarClick}
                                >
                                    <Avatar className="h-24 w-24 border-4 border-background shadow-md group-hover:opacity-80 transition-opacity">
                                        <AvatarImage src={avatarPreview || undefined} alt="Avatar da Comunidade" className="object-cover" />
                                        <AvatarFallback className="text-3xl bg-muted text-muted-foreground">
                                            {name ? name.substring(0, 2).toUpperCase() : <Camera className="h-8 w-8 opacity-50" />}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="h-8 w-8 text-white" />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">Clique para adicionar uma imagem</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome da Comunidade</label>
                                <Input
                                    required
                                    placeholder="Ex: Dicas de Iluminação"
                                    value={name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Identificador (URL Slug)</label>
                                <div className="flex items-center">
                                    <span className="text-muted-foreground mr-1 text-sm">isoscanning.com/c/</span>
                                    <Input
                                        required
                                        placeholder="dicas-iluminacao"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Deve conter apenas letras minúsculas, números e hífens.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Descrição da Comunidade (Opcional)</label>
                                <Textarea
                                    placeholder="Escreva um breve resumo sobre o propósito desta comunidade..."
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full resize-none sm:resize-y"
                                />
                            </div>

                            <div className="space-y-4 pt-2">
                                <label className="text-sm font-medium">Regras da Comunidade (Opcional)</label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="Ex: Seja respeitoso com todos os membros."
                                        value={currentRule}
                                        onChange={(e) => setCurrentRule(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddRule();
                                            }
                                        }}
                                    />
                                    <Button type="button" variant="secondary" onClick={handleAddRule}>
                                        Inserir
                                    </Button>
                                </div>
                                {rules.length > 0 && (
                                    <div className="bg-muted/30 p-4 rounded-md border border-border/50 transition-all">
                                        <ul className="space-y-2 text-sm">
                                            {rules.map((rule, idx) => (
                                                <li key={idx} className="flex justify-between items-start group gap-2">
                                                    <div className="flex gap-2 text-muted-foreground break-words w-full">
                                                        <span className="font-bold">{idx + 1}.</span>
                                                        <span className="text-foreground">{rule}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="text-red-500 hover:text-red-700 opacity-60 hover:opacity-100 transition-opacity text-xs whitespace-nowrap mt-0.5 font-medium"
                                                        onClick={() => setRules(rules.filter((_, i) => i !== idx))}
                                                    >
                                                        Remover
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end pt-4 pb-6">
                            <Button type="submit" disabled={loading} size="lg" className="w-full sm:w-auto min-w-[200px]">
                                {loading ? "Criando..." : "Criar Comunidade"}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
