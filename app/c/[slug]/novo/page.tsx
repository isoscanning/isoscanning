"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Image as ImageIcon, X } from "lucide-react";
import Link from "next/link";
import Image from "next/link"; // Not actually next/image since we just need URL for preview, but we'll use an img tag
import api from "@/lib/api-service";
import { toast } from "sonner";
import { uploadFile } from "@/lib/supabase-storage";

export default function CreatePostPage() {
    const router = useRouter();
    const params = useParams();
    const slug = params.slug as string;
    const { userProfile } = useAuth();

    const [communityId, setCommunityId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Verify it's an image
        if (!file.type.startsWith('image/')) {
            toast.error("Por favor selecione uma imagem válida (JPG, PNG, etc).");
            return;
        }

        // Limit size (e.g. 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("A imagem deve ter no máximo 5MB.");
            return;
        }

        setMediaFile(file);
        const url = URL.createObjectURL(file);
        setMediaPreview(url);
    };

    const removeFile = () => {
        setMediaFile(null);
        if (mediaPreview) {
            URL.revokeObjectURL(mediaPreview);
            setMediaPreview(null);
        }
    };

    useEffect(() => {
        if (!slug) return;
        // Fetch community id based on slug
        api.get(`/communities/${slug}`)
            .then(res => setCommunityId(res.data.id))
            .catch(err => console.error("Error fetching community", err));
    }, [slug]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userProfile) {
            toast.error("Você precisa estar logado para criar uma publicação.");
            return;
        }

        if (!communityId) {
            toast.error("Carregando comunidade, aguarde um momento.");
            return;
        }

        try {
            setLoading(true);

            let mediaUrl = undefined;
            let mediaType = "none";

            if (mediaFile) {
                // Upload the image
                try {
                    const uploadedPath = await uploadFile(mediaFile, "posts");
                    // Assuming uploadFile returns a path, we need the public URL
                    // Or if uploadFile already returns public URL, we just use it
                    mediaUrl = uploadedPath;
                    mediaType = "image";
                } catch (uploadError) {
                    console.error("Error uploading image:", uploadError);
                    toast.error("Erro ao fazer upload da imagem. A publicação será criada sem a imagem.");
                    // Fall back to no image if upload fails but still try to create the post
                }
            }

            await api.post("/posts", {
                communityId,
                authorId: userProfile.id,
                title,
                content,
                mediaUrl,
                mediaType,
            });

            toast.success("Publicação criada com sucesso!");
            router.push(`/c/${slug}`);
        } catch (error: any) {
            console.error("Error creating post:", error);
            toast.error("Erro ao criar a publicação.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <div className="container mx-auto py-8 px-4 max-w-2xl">
                <Button variant="ghost" asChild className="mb-6 -ml-4">
                    <Link href={`/c/${slug}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para c/{slug}
                    </Link>
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl">Criar Publicação</CardTitle>
                    </CardHeader>
                    <form onSubmit={handleCreate}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Título</label>
                                <Input
                                    required
                                    placeholder="Ex: Como configurar o scanner D300?"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Conteúdo</label>
                                <Textarea
                                    required
                                    placeholder="Escreva sua dúvida, dica ou compartilhe um resultado..."
                                    rows={6}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full resize-none sm:resize-y"
                                />
                            </div>

                            {/* Image Upload Area */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Imagem (opcional)</label>
                                {!mediaPreview ? (
                                    <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10 dark:border-white/20">
                                        <div className="text-center">
                                            <ImageIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-500" aria-hidden="true" />
                                            <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-400">
                                                <label
                                                    htmlFor="file-upload"
                                                    className="relative cursor-pointer rounded-md bg-transparent font-semibold text-primary hover:text-primary/80 focus-within:outline-none"
                                                >
                                                    <span>Envie um arquivo</span>
                                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                                                </label>
                                                <p className="pl-1">ou arraste e solte apenas imagens.</p>
                                            </div>
                                            <p className="text-xs leading-5 text-gray-600 dark:text-gray-400">PNG, JPG até 5MB</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative inline-block mt-2">
                                        <div className="relative rounded-lg overflow-hidden border bg-muted group">
                                            {/* We use a regular img tag here because the temporary blob path doesn't play well with next/image */}
                                            <img
                                                src={mediaPreview}
                                                alt="Preview"
                                                className="max-h-64 object-contain"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    onClick={removeFile}
                                                    className="w-10 h-10 rounded-full"
                                                >
                                                    <X className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row justify-end pt-4 pb-6 space-y-3 sm:space-y-0 relative z-10">
                            <Button type="submit" disabled={loading || !communityId} className="w-full sm:w-auto">
                                {loading ? "Publicando..." : "Publicar"}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
