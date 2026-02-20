"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Camera, Loader2, X } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api-service";
import { toast } from "sonner";
import { uploadFile } from "@/lib/supabase-storage";

export default function EditCommunityPage() {
    const router = useRouter();
    const params = useParams();
    const slug = params?.slug as string;
    const { userProfile } = useAuth();

    const [communityId, setCommunityId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [rules, setRules] = useState<string[]>([]);
    const [currentRule, setCurrentRule] = useState("");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    const [initialLoading, setInitialLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchCommunity = async () => {
            try {
                const response = await api.get(`/communities/${slug}`);
                const data = response.data;

                if (userProfile && data.ownerId !== userProfile.id) {
                    toast.error("Você não tem permissão para editar esta comunidade.");
                    router.push(`/c/${slug}`);
                    return;
                }

                setCommunityId(data.id);
                setName(data.name || "");
                setDescription(data.description || "");
                setRules(data.rules || []);
                setAvatarPreview(data.avatarUrl || null);

            } catch (error) {
                console.error("Error fetching community for edit:", error);
                toast.error("Erro ao carregar os dados da comunidade.");
                router.push("/comunidade");
            } finally {
                setInitialLoading(false);
            }
        };

        if (slug) {
            fetchCommunity();
        }
    }, [slug, userProfile, router]);

    const handleAddRule = () => {
        if (currentRule.trim() !== "") {
            setRules([...rules, currentRule.trim()]);
            setCurrentRule("");
        }
    };

    const handleRemoveRule = (index: number) => {
        setRules(rules.filter((_, i) => i !== index));
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
        document.getElementById("edit-avatar-upload")?.click();
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userProfile || !communityId) return;

        try {
            setSaving(true);
            let avatarUrl = avatarFile ? undefined : avatarPreview; // Keep existing if no new file

            if (avatarFile) {
                const uploadResult = await uploadFile(avatarFile, "posts");
                avatarUrl = uploadResult;
            }

            await api.put(`/communities/${communityId}`, {
                data: {
                    name,
                    description,
                    avatarUrl: avatarUrl || undefined, // Send undefined if null
                    rules,
                },
                userId: userProfile.id
            });

            toast.success("Comunidade atualizada com sucesso!");
            router.push(`/c/${slug}`);
            // Note: Since slug doesn't change, we can safely redirect to the same slug.
        } catch (error: any) {
            console.error("Error updating community:", error);
            toast.error("Erro ao atualizar a comunidade.");
        } finally {
            setSaving(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Header />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <div className="container mx-auto py-8 px-4 max-w-2xl">
                <Button variant="ghost" asChild className="mb-6 -ml-4">
                    <Link href={`/c/${slug}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para a Comunidade
                    </Link>
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle>Editar Comunidade</CardTitle>
                        <CardDescription>
                            Atualize as informações, regras e a imagem da sua comunidade.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleSave}>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col items-center mb-6">
                                <input
                                    type="file"
                                    id="edit-avatar-upload"
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
                                <p className="text-xs text-muted-foreground mt-2">Clique para alterar a imagem</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nome da Comunidade</label>
                                <Input
                                    placeholder="Ex: Desenvolvedores Front-end"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Slug (URL)</label>
                                <Input
                                    value={slug}
                                    disabled
                                    className="bg-muted text-muted-foreground"
                                />
                                <p className="text-xs text-muted-foreground">O endereço (slug) não pode ser alterado após a criação.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Descrição da Comunidade</label>
                                <Textarea
                                    placeholder="Escreva um breve resumo sobre o propósito desta comunidade..."
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full resize-none sm:resize-y"
                                />
                            </div>

                            <div className="space-y-4 pt-2">
                                <div>
                                    <label className="text-sm font-medium block mb-1">Regras da Comunidade</label>
                                    <p className="text-xs text-muted-foreground mb-3">Defina as regras para os membros participarem. (Ex: Sem spam, Respeito mútuo)</p>

                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Adicionar uma regra (Ex: Não vender itens de terceiros)"
                                            value={currentRule}
                                            onChange={(e) => setCurrentRule(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddRule();
                                                }
                                            }}
                                        />
                                        <Button type="button" onClick={handleAddRule} variant="secondary">Adicionar</Button>
                                    </div>
                                </div>

                                {rules.length > 0 && (
                                    <div className="space-y-2 mt-4 bg-muted/30 p-4 rounded-md border">
                                        {rules.map((rule, idx) => (
                                            <div key={idx} className="flex items-start justify-between gap-3 text-sm p-2 bg-background rounded border group">
                                                <span className="mt-0.5"><span className="font-semibold">{idx + 1}.</span> {rule}</span>
                                                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-50 group-hover:opacity-100" onClick={() => handleRemoveRule(idx)}>
                                                    <X className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full" disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {saving ? "Salvando..." : "Salvar Alterações"}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
