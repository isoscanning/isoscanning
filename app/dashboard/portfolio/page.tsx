"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  Trash2,
  Upload,
  Loader2,
  ImageIcon,
  AlertCircle,
  Camera,
  Layers,
  ImagePlus,
  Pencil
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchPortfolio,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  uploadPortfolioItemImage,
  type PortfolioItem
} from "@/lib/data-service";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ParticleBackground } from "@/components/particle-background";
import { ScrollReveal } from "@/components/scroll-reveal";

export default function PortfolioPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  // Portfolio State
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [newPortfolioItem, setNewPortfolioItem] = useState({
    title: "",
  });
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [portfolioPreviews, setPortfolioPreviews] = useState<{ url: string, type: 'image' | 'video' }[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<PortfolioItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Edit State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [existingMedia, setExistingMedia] = useState<{ url: string, type: 'image' | 'video' }[]>([]);

  // Status State
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Album Edit Modal State
  const [editAlbumModalOpen, setEditAlbumModalOpen] = useState(false);
  const [albumToEdit, setAlbumToEdit] = useState<PortfolioItem | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !userProfile) {
      router.push("/login");
    }
  }, [userProfile, loading, router]);

  // Load Portfolio on Mount
  useEffect(() => {
    const loadData = async () => {
      if (userProfile?.id) {
        await loadPortfolio();
      }
    };
    loadData();
  }, [userProfile]);

  const loadPortfolio = async () => {
    if (!userProfile?.id) return;
    setLoadingPortfolio(true);
    try {
      const items = await fetchPortfolio(userProfile.id);
      setPortfolioItems(items);
    } catch (error) {
      console.error("Error loading portfolio", error);
    } finally {
      setLoadingPortfolio(false);
    }
  };

  const validateVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  // Limits definition
  const MAX_MEDIA = 100;
  const MAX_VIDEOS = 10;

  const currentTotalMedia = portfolioItems.reduce((acc, item) => acc + (item.media?.length || 0), 0);
  const currentTotalVideos = portfolioItems.reduce((acc, item) => acc + (item.media?.filter(m => m.type === 'video').length || 0), 0);

  const isLimitReached = currentTotalMedia >= MAX_MEDIA;

  // Percentage for progress bar
  const usagePercentage = Math.min(100, (currentTotalMedia / MAX_MEDIA) * 100);

  const handlePortfolioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setFileError(null);

    const newFiles: File[] = [];
    const newPreviews: { url: string, type: 'image' | 'video' }[] = [];
    let videoCount = currentTotalVideos + portfolioFiles.filter(f => f.type.startsWith('video/')).length;

    // Ignore existing items size in total calculation if editing
    const totalMediaConsidered = editingItemId
      ? currentTotalMedia - existingMedia.length
      : currentTotalMedia;

    if (totalMediaConsidered + existingMedia.length + portfolioFiles.length + files.length > MAX_MEDIA) {
      setFileError(`Você só pode ter no máximo ${MAX_MEDIA} arquivos ao todo no seu portfólio.`);
      return;
    }

    let hasSkippedImageSize = false;
    let hasReachedVideoLimit = false;
    let hasSkippedVideoSize = false;
    let hasSkippedVideoDuration = false;

    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isImage && !isVideo) continue;

      if (isImage) {
        if (file.size > 15 * 1024 * 1024) {
          hasSkippedImageSize = true;
          continue;
        }
        newFiles.push(file);
        newPreviews.push({ url: URL.createObjectURL(file), type: 'image' });
      } else if (isVideo) {
        if (videoCount >= MAX_VIDEOS) {
          hasReachedVideoLimit = true;
          continue;
        }
        if (file.size > 150 * 1024 * 1024) {
          hasSkippedVideoSize = true;
          continue;
        }
        const duration = await validateVideoDuration(file);
        if (duration > 90) { // 1m30s
          hasSkippedVideoDuration = true;
          continue;
        }
        newFiles.push(file);
        newPreviews.push({ url: URL.createObjectURL(file), type: 'video' });
        videoCount++;
      }
    }

    const errorReasons: string[] = [];
    if (hasSkippedImageSize) errorReasons.push("algumas fotos possuem mais de 15MB");
    if (hasSkippedVideoSize) errorReasons.push("alguns vídeos possuem mais de 150MB");
    if (hasSkippedVideoDuration) errorReasons.push("alguns vídeos têm mais de 1m30s");
    if (hasReachedVideoLimit) errorReasons.push(`limite de ${MAX_VIDEOS} vídeos por profissional atingido`);

    if (errorReasons.length > 0) {
      if (hasSkippedImageSize && errorReasons.length === 1) {
        setFileError("Não foi possível carregar todas as fotos pois algumas possuem mais de 15 megas.");
      } else {
        setFileError(`Não foi possível carregar todos os itens pois ${errorReasons.join(", ")}.`);
      }
    }

    setPortfolioFiles(prev => [...prev, ...newFiles]);
    setPortfolioPreviews(prev => [...prev, ...newPreviews]);
  };

  const handleAddPortfolioItem = async () => {
    if (!userProfile?.id || !newPortfolioItem.title || portfolioFiles.length === 0) {
      setErrorMsg("Preencha o título e selecione pelo menos um arquivo.");
      return;
    }

    if (isLimitReached) {
      setErrorMsg(`Você já atingiu o limite de ${MAX_MEDIA} itens no portfólio.`);
      return;
    }

    try {
      setLoadingPortfolio(true);
      setErrorMsg("");
      setSuccessMsg("");

      // Upload files
      const newMediaList = await Promise.all(
        portfolioFiles.map(async (file, index) => {
          const url = await uploadPortfolioItemImage(file, userProfile.id);
          return { url, type: portfolioPreviews[index].type };
        })
      );

      const finalMediaPayload = [...existingMedia, ...newMediaList];

      if (editingItemId) {
        // Update portfolio item
        await updatePortfolioItem(editingItemId, {
          title: newPortfolioItem.title,
          media: finalMediaPayload
        });
        setSuccessMsg("Álbum atualizado com sucesso!");
      } else {
        // Create portfolio item
        await createPortfolioItem({
          title: newPortfolioItem.title,
          media: finalMediaPayload,
          professionalId: userProfile.id
        });
        setSuccessMsg("Item adicionado ao portfólio!");
      }

      await loadPortfolio();

      // Reset form
      cancelEdit();
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: any) {
      console.error("Error adding portfolio item:", err);
      // Nice error message if it's the 403 from backend
      if (err.message && err.message.includes("Portfolio limit reached")) {
        setErrorMsg("Limite do plano atingido (validado pelo servidor).");
      } else {
        setErrorMsg(err.message || "Erro ao adicionar item ao portfólio.");
      }
    } finally {
      setLoadingPortfolio(false);
    }
  };

  const handleDeleteItem = (id: string) => {
    setItemToDelete(id);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      setLoadingPortfolio(true);
      await deletePortfolioItem(itemToDelete);
      await loadPortfolio();

      if (itemToDelete === editingItemId) {
        cancelEdit();
      }

      setSuccessMsg("Item excluído com sucesso.");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      setErrorMsg("Erro ao excluir item.");
    } finally {
      setLoadingPortfolio(false);
      setItemToDelete(null);
    }
  };

  const handleAppendPhotos = (item: PortfolioItem) => {
    setEditingItemId(item.id);
    setExistingMedia(item.media || []);
    setNewPortfolioItem({ title: item.title });
    setPortfolioFiles([]);
    setPortfolioPreviews([]);
    setFileError(null);
    setErrorMsg("");
    setSuccessMsg("");

    // Auto-scroll to form top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Open file dialog automatically if needed
    const fileInput = document.getElementById("file-upload") as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setExistingMedia([]);
    setNewPortfolioItem({ title: "" });
    setPortfolioFiles([]);
    setPortfolioPreviews([]);
    setFileError(null);
  };

  const openEditAlbumModal = (item: PortfolioItem) => {
    setAlbumToEdit(item);
    setMediaToDelete([]);
    setEditAlbumModalOpen(true);
  };

  const toggleMediaDeletion = (url: string) => {
    setMediaToDelete(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  const handleSaveAlbumEdit = async () => {
    if (!albumToEdit) return;
    try {
      setIsSavingEdit(true);

      const finalMedia = albumToEdit.media?.filter(m => !mediaToDelete.includes(m.url)) || [];

      await updatePortfolioItem(albumToEdit.id, {
        title: albumToEdit.title,
        media: finalMedia
      });

      await loadPortfolio();
      setSuccessMsg("Álbum atualizado com sucesso.");
      setTimeout(() => setSuccessMsg(""), 5000);
      setEditAlbumModalOpen(false);
    } catch (err) {
      setErrorMsg("Erro ao atualizar álbum.");
    } finally {
      setIsSavingEdit(false);
      setAlbumToEdit(null);
      setMediaToDelete([]);
    }
  };

  // Don't render if not authenticated
  if (loading || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      <Header />

      {/* Background Effects */}
      <ParticleBackground />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <main className="flex-1 py-12 px-4 relative z-10">
        <div className="container mx-auto max-w-6xl space-y-8">

          <ScrollReveal>
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary w-fit border border-primary/20 backdrop-blur-sm mb-2">
                <Camera className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Gerenciar Portfólio</span>
              </div>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-blue-500 w-fit">
                Meu Portfólio
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl">
                Adicione suas melhores fotos e vídeos. Seu portfólio permite até {MAX_MEDIA} arquivos no total.
              </p>
            </div>
          </ScrollReveal>

          {errorMsg && (
            <ScrollReveal>
              <Alert variant="destructive" className="backdrop-blur-sm bg-destructive/10 border-destructive/20">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            </ScrollReveal>
          )}

          {successMsg && (
            <ScrollReveal>
              <Alert className="border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400 backdrop-blur-sm">
                <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center mr-2">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <AlertDescription>{successMsg}</AlertDescription>
              </Alert>
            </ScrollReveal>
          )}

          <div className="grid gap-8 lg:grid-cols-12 lg:items-start">

            {/* Left Column: Upload Form */}
            <div className="lg:col-span-5 lg:sticky lg:top-24">
              <ScrollReveal delay={0.2}>
                <Card className="border-primary/10 shadow-xl bg-background/60 backdrop-blur-xl overflow-hidden relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />

                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Plus className="h-5 w-5" />
                      </div>
                      Adicionar Novo Item
                    </CardTitle>
                    <CardDescription>
                      Você pode adicionar até {MAX_MEDIA} arquivos no total.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">

                    {isLimitReached && (
                      <Alert className="bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Limite de {MAX_MEDIA} itens atingido.
                          </AlertDescription>
                        </div>
                        <Button variant="outline" size="sm" className="w-full mt-1 border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10" onClick={() => router.push('/precos')}>
                          Fazer Upgrade do Plano
                        </Button>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="title">Título do Trabalho</Label>
                      <Input
                        id="title"
                        placeholder="Ex: Ensaio de Casamento"
                        value={newPortfolioItem.title}
                        onChange={(e) =>
                          setNewPortfolioItem({ ...newPortfolioItem, title: e.target.value })
                        }
                        disabled={loadingPortfolio || isLimitReached}
                        className="bg-background/50 backdrop-blur-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Arquivo (Imagem ou Vídeo)</Label>
                      <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 relative overflow-hidden group/upload ${isLimitReached
                          ? "opacity-50 cursor-not-allowed border-muted"
                          : "hover:border-primary border-muted hover:bg-primary/5 cursor-pointer"
                          }`}
                      >
                        <input
                          type="file"
                          id="file-upload"
                          className="hidden"
                          onChange={handlePortfolioFileChange}
                          accept="image/*,video/*"
                          multiple
                          disabled={loadingPortfolio || isLimitReached}
                        />
                        <label htmlFor="file-upload" className={`cursor-pointer w-full h-full block relative z-10 ${isLimitReached ? "pointer-events-none" : ""}`}>
                          {portfolioPreviews.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2">
                              {portfolioPreviews.map((preview, idx) => (
                                <div key={idx} className="relative aspect-square rounded-md overflow-hidden shadow-sm bg-black/5">
                                  {preview.type === "video" ? (
                                    <video src={preview.url} className="w-full h-full object-cover" />
                                  ) : (
                                    <img src={preview.url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                                  )}
                                </div>
                              ))}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity backdrop-blur-[2px] rounded-xl">
                                <p className="text-white font-medium flex items-center gap-2">
                                  <Upload className="h-4 w-4" /> Adicionar / Alterar
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="py-6 flex flex-col items-center">
                              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover/upload:scale-110 transition-transform duration-300">
                                <Upload className="h-8 w-8 text-primary" />
                              </div>
                              <p className="text-base font-semibold text-foreground">
                                Clique ou arraste para enviar
                              </p>
                              <p className="text-xs text-muted-foreground mt-2 max-w-[200px]">
                                JPG/PNG (max 15MB) ou MP4 (max 150MB, 90s)
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                      {fileError && <p className="text-sm text-destructive mt-1 font-medium">{fileError}</p>}
                    </div>

                    <Button
                      onClick={handleAddPortfolioItem}
                      className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
                      disabled={loadingPortfolio || portfolioFiles.length === 0 || !newPortfolioItem.title || isLimitReached}
                    >
                      {loadingPortfolio ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        "Adicionar ao Portfólio"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </ScrollReveal>
            </div>

            {/* Right Column: Portfolio Grid */}
            <div className="lg:col-span-7 space-y-6">
              <ScrollReveal delay={0.3}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    Galeria
                  </h2>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full border border-border">
                      {currentTotalMedia} de {MAX_MEDIA} arquivos
                    </span>
                    {/* Progress bar */}
                    <div className="w-32 h-1.5 bg-secondary rounded-full mt-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isLimitReached ? 'bg-red-500' : 'bg-primary'}`}
                        style={{ width: `${usagePercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {portfolioItems.length === 0 ? (
                <ScrollReveal delay={0.4}>
                  <Card className="border-dashed border-2 bg-transparent shadow-none">
                    <CardContent className="py-20 text-center flex flex-col items-center">
                      <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
                        <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Seu portfólio está vazio</h3>
                      <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
                        Comece a adicionar seus melhores trabalhos. Um portfólio bem montado aumenta em 70% suas chances de fechar negócios.
                      </p>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  {portfolioItems.map((item, index) => (
                    <ScrollReveal key={item.id} delay={0.1 * index}>
                      <Card className="overflow-hidden group border-0 shadow-lg hover:shadow-xl transition-all duration-300 relative bg-card h-full flex flex-col">
                        <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-9 w-9 rounded-full shadow-lg backdrop-blur-md bg-white/90 hover:bg-white text-primary"
                            onClick={() => openEditAlbumModal(item)}
                            title="Editar mídias do álbum"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-9 w-9 rounded-full shadow-lg backdrop-blur-md bg-white/90 hover:bg-white text-primary"
                            onClick={() => handleAppendPhotos(item)}
                            title="Adicionar fotos a este álbum"
                          >
                            <ImagePlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-9 w-9 rounded-full shadow-lg backdrop-blur-md bg-red-500/90 hover:bg-red-600"
                            onClick={() => handleDeleteItem(item.id)}
                            title="Excluir item"
                          >
                            <Trash2 className="h-4 w-4 text-white" />
                          </Button>
                        </div>

                        <div className="aspect-[4/3] relative overflow-hidden bg-black/10">
                          {item.media?.[0]?.type === 'video' ? (
                            <video
                              src={item.media?.[0]?.url || ""}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                          ) : (
                            <img
                              src={item.media?.[0]?.url || "/placeholder.svg"}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                          <div className="absolute bottom-0 left-0 p-4 w-full">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full text-white/90 backdrop-blur-sm ${(item.media?.length || 0) > 1 ? 'bg-purple-500/50' : item.media?.[0]?.type === 'video' ? 'bg-blue-500/50' : 'bg-primary/50'}`}>
                                {(item.media?.length || 0) > 1 ? `Álbum (${item.media?.length})` : item.media?.[0]?.type === 'video' ? 'Vídeo' : 'Imagem'}
                              </span>
                            </div>
                            <h3 className="font-bold text-lg text-white line-clamp-1 drop-shadow-md">{item.title}</h3>
                          </div>
                        </div>
                      </Card>
                    </ScrollReveal>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <Dialog open={editAlbumModalOpen} onOpenChange={setEditAlbumModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Álbum: {albumToEdit?.title}</DialogTitle>
            <DialogDescription>
              Selecione as mídias (fotos ou vídeos) que você deseja EXCLUIR do portfólio. Mídias selecionadas ficarão avermelhadas.
            </DialogDescription>
          </DialogHeader>

          {albumToEdit?.media && albumToEdit.media.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
              {albumToEdit.media.map((mediaItem, idx) => {
                const isSelected = mediaToDelete.includes(mediaItem.url);
                return (
                  <div
                    key={idx}
                    className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${isSelected ? 'border-destructive opacity-80 scale-95' : 'border-transparent hover:border-primary/50'}`}
                    onClick={() => toggleMediaDeletion(mediaItem.url)}
                  >
                    {mediaItem.type === 'video' ? (
                      <video src={mediaItem.url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={mediaItem.url} alt={`Media ${idx}`} className="w-full h-full object-cover" />
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center backdrop-blur-[1px]">
                        <Trash2 className="w-6 h-6 text-white drop-shadow-md" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">Este álbum não possui mídias.</p>
          )}

          <DialogFooter className="mt-6 flex flex-col sm:flex-row sm:justify-between items-center gap-4">
            <div className="text-sm font-medium text-destructive">
              {mediaToDelete.length > 0 ? `${mediaToDelete.length} item(s) selecionado(s) para exclusão` : ''}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setEditAlbumModalOpen(false)} disabled={isSavingEdit}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleSaveAlbumEdit} disabled={mediaToDelete.length === 0 || isSavingEdit}>
                {isSavingEdit ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Confirmar Exclusão
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Isso excluirá permanentemente o item do seu portfólio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingPortfolio}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loadingPortfolio}
            >
              {loadingPortfolio ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
