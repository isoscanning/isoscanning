"use client";

import { Trash2, Plus, Upload, ImageIcon, Eye, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { type PortfolioItem } from "@/lib/data-service";

interface PortfolioGalleryProps {
    portfolioItems: PortfolioItem[];
    loadingPortfolio: boolean;
    handleDeletePortfolioItem: (id: string) => void;
    newPortfolioItem: any;
    setNewPortfolioItem: (data: any) => void;
    handlePortfolioFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleAddPortfolioItem: () => void;
    portfolioPreview: string | null;
    fileError: string | null;
}

export function PortfolioGallery({
    portfolioItems,
    loadingPortfolio,
    handleDeletePortfolioItem,
    newPortfolioItem,
    setNewPortfolioItem,
    handlePortfolioFileChange,
    handleAddPortfolioItem,
    portfolioPreview,
    fileError
}: PortfolioGalleryProps) {
    return (
        <Card className="border-2 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
                <div className="space-y-1">
                    <CardTitle className="text-2xl">Seu Portfólio</CardTitle>
                    <CardDescription className="text-base">Imagens e vídeos dos seus melhores trabalhos</CardDescription>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Adicionar Item
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Novo Item do Portfólio</DialogTitle>
                            <DialogDescription>Adicione uma foto ou vídeo para mostrar seu talento.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="item-title">Título do Trabalho</Label>
                                <Input
                                    id="item-title"
                                    placeholder="Ex: Ensaio Gestante, Casamento Maria e João..."
                                    value={newPortfolioItem.title}
                                    onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, title: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Arquivo (Foto ou Vídeo)</Label>
                                <div
                                    className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => document.getElementById('portfolio-file')?.click()}
                                >
                                    {portfolioPreview ? (
                                        <div className="relative w-full aspect-video rounded-md overflow-hidden bg-black">
                                            {newPortfolioItem.mediaType === 'video' ? (
                                                <video src={portfolioPreview} className="w-full h-full object-contain" />
                                            ) : (
                                                <img src={portfolioPreview} alt="Preview" className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Upload className="h-6 w-6 text-primary" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-medium">Carregar mídia</p>
                                                <p className="text-xs text-muted-foreground mt-1">Fotos (máx 5MB) ou Vídeos (máx 1m30s, 50MB)</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                                {fileError && <p className="text-sm text-destructive font-medium">{fileError}</p>}
                                <input
                                    type="file"
                                    id="portfolio-file"
                                    className="hidden"
                                    accept="image/*,video/*"
                                    onChange={handlePortfolioFileChange}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                onClick={handleAddPortfolioItem}
                                className="w-full sm:w-auto"
                                disabled={loadingPortfolio || !portfolioPreview || !newPortfolioItem.title}
                            >
                                {loadingPortfolio ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adicionando...</> : "Adicionar ao Portfólio"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {loadingPortfolio && portfolioItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                        <p className="text-muted-foreground italic">Carregando mídias...</p>
                    </div>
                ) : portfolioItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl bg-muted/10">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold">Seu portfólio está vazio</h3>
                        <p className="text-muted-foreground max-w-xs mx-auto mt-1 mb-6">
                            Adicione fotos e vídeos dos seus trabalhos para atrair mais clientes e oportunidades.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {portfolioItems.map((item) => (
                            <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden border bg-black shadow-sm hover:shadow-md transition-all">
                                {item.mediaType === "video" ? (
                                    <video src={item.mediaUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                ) : (
                                    <img src={item.mediaUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="absolute bottom-0 left-0 right-0 p-4">
                                        <p className="text-white font-medium text-sm line-clamp-1">{item.title}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDeletePortfolioItem(item.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="secondary" className="h-7 text-[10px] uppercase tracking-wider font-bold" asChild>
                                                <a href={item.mediaUrl} target="_blank" rel="noopener noreferrer">
                                                    <Eye className="h-3 w-3 mr-1" /> Ver
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
