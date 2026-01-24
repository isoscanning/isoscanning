"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle2, ChevronLeft, Upload, X, Star } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateEquipment, fetchUserEquipments, uploadEquipmentImages, deleteEquipmentImages } from "@/lib/data-service";
import { ScrollReveal } from "@/components/scroll-reveal";

const CATEGORIAS = [
  "Câmeras",
  "Lentes",
  "Iluminação",
  "Áudio",
  "Drones",
  "Tripés e Suportes",
  "Acessórios",
  "Edição",
];

const ESTADOS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

export default function EditarEquipamentoPage() {
  const router = useRouter();
  const params = useParams();
  const { userProfile, loading, isAnonymous } = useAuth();
  const equipmentId = params.id as string;

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    negotiationType: "sale",
    condition: "used",
    description: "",
    brand: "",
    model: "",
    price: "",
    rentPeriod: "day",
    city: "",
    state: "",
    additionalConditions: "",
  });

  // Image State Management
  interface ImageItem {
    id: string;
    preview: string;
    file?: File;
    isExisting: boolean;
  }

  const [items, setItems] = useState<ImageItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loadingEquipment, setLoadingEquipment] = useState(true);

  useEffect(() => {
    if (!loading && !userProfile) {
      router.push("/login");
    }

    if (userProfile && equipmentId) {
      loadEquipment();
    }
  }, [userProfile, loading, router, equipmentId]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    // Check total number of images (existing + new)
    const totalImages = items.length + files.length;
    if (totalImages > 5) {
      setError("Máximo de 5 imagens por equipamento");
      return;
    }

    // Validate each file
    for (const file of files) {
      const maxSize = 1024 * 1024; // 1MB
      if (file.size > maxSize) {
        setError(`Imagem "${file.name}" deve ter no máximo 1MB`);
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError(`Tipo de arquivo não permitido para "${file.name}". Use apenas JPEG, PNG ou WebP`);
        return;
      }
    }

    // Process new files
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setItems(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          preview: result,
          file: file,
          isExisting: false
        }]);
      };
      reader.readAsDataURL(file);
    });

    setError("");
  };

  const handleDeleteImage = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleMakeMain = (index: number) => {
    if (index === 0) return; // Already main
    setItems(prev => {
      const newItems = [...prev];
      const [item] = newItems.splice(index, 1);
      newItems.unshift(item);
      return newItems;
    });
  };

  const loadEquipment = async () => {
    if (!userProfile || !equipmentId) return;

    setLoadingEquipment(true);
    try {
      const equipments = await fetchUserEquipments(userProfile.id);
      const equipment = equipments.find((eq) => eq.id === equipmentId);

      if (!equipment) {
        setError(
          "Equipamento não encontrado ou você não tem permissão para editá-lo."
        );
        return;
      }

      setFormData({
        name: equipment.name,
        category: equipment.category,
        negotiationType: equipment.negotiationType,
        condition: equipment.condition,
        description: equipment.description || "",
        brand: equipment.brand || "",
        model: equipment.model || "",
        price: equipment.price?.toString() || "",
        rentPeriod: equipment.rentPeriod || "day",
        city: equipment.city,
        state: equipment.state,
        additionalConditions: equipment.additionalConditions || "",
      });

      // Initialize items from existing URLS
      if (equipment.imageUrls && equipment.imageUrls.length > 0) {
        const existingItems: ImageItem[] = equipment.imageUrls.map(url => ({
          id: Math.random().toString(36).substr(2, 9),
          preview: url,
          isExisting: true
        }));
        setItems(existingItems);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao carregar equipamento.");
    } finally {
      setLoadingEquipment(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);

    try {
      // 1. Separate items needing upload vs existing
      const existingUrls = items.filter(i => i.isExisting).map(i => i.preview);
      const newFiles = items.filter(i => !i.isExisting && i.file).map(i => i.file as File);

      // 2. Upload new files if any
      let uploadedUrls: string[] = [];
      if (newFiles.length > 0 && userProfile?.id) {
        try {
          console.log(`Fazendo upload de ${newFiles.length} novas imagens...`);
          uploadedUrls = await uploadEquipmentImages(newFiles, userProfile.id);
          console.log("Upload concluído:", uploadedUrls);
        } catch (imageError: any) {
          console.error("Erro no upload:", imageError);
          setError(`Erro no upload: ${imageError.message}`);
          setSaving(false);
          return;
        }
      }

      // 3. Construct final ordered array
      const finalImageUrls: string[] = [];
      let uploadIndex = 0;

      items.forEach(item => {
        if (item.isExisting) {
          finalImageUrls.push(item.preview);
        } else {
          // It's a new file, grab from uploadedUrls
          if (uploadedUrls[uploadIndex]) {
            finalImageUrls.push(uploadedUrls[uploadIndex]);
            uploadIndex++;
          }
        }
      });

      // Update equipment
      try {
        console.log("Atualizando equipamento...");
        await updateEquipment(equipmentId, {
          name: formData.name,
          category: formData.category,
          negotiationType: formData.negotiationType as "sale" | "rent" | "free",
          condition: formData.condition as "new" | "refurbished" | "used",
          description: formData.description,
          brand: formData.brand,
          model: formData.model,
          price: formData.price ? Number.parseFloat(formData.price) : undefined,
          rentPeriod:
            formData.negotiationType === "rent" ? (formData.rentPeriod as "day" | "week" | "month") : undefined,
          city: formData.city,
          state: formData.state,
          additionalConditions: formData.additionalConditions,
          imageUrls: finalImageUrls.length > 0 ? finalImageUrls : undefined,
        });
        console.log("Equipamento atualizado com sucesso!");

        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard/equipamentos");
        }, 1500);
      } catch (equipmentError: any) {
        console.error("Erro ao atualizar equipamento:", equipmentError);
        setError(`Erro ao salvar equipamento: ${equipmentError.message}`);
      }
    } catch (err: any) {
      console.error("Erro geral:", err);
      setError(err.message || "Erro inesperado ao atualizar equipamento.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingEquipment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userProfile) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">
          {/* Header */}
          <ScrollReveal>
            <div className="flex items-center gap-4 mb-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                  Editar Equipamento
                </h1>
                <p className="text-muted-foreground">
                  Atualize as informações do seu anúncio
                </p>
              </div>
            </div>
          </ScrollReveal>

          {success && (
            <Alert className="bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Equipamento atualizado com sucesso! Redirecionando...
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Main Column - Left (2/3) */}
              <div className="lg:col-span-2 space-y-6">

                {/* Basic Info Card */}
                <ScrollReveal delay={0.1}>
                  <Card>
                    <CardHeader>
                      <CardTitle>Informações Básicas</CardTitle>
                      <CardDescription>
                        Dados principais do seu equipamento
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Título do Anúncio *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="Ex: Câmera Canon EOS R5 Body"
                          required
                          className="text-lg font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="category">Categoria *</Label>
                          <Select
                            value={formData.category}
                            onValueChange={(value) =>
                              setFormData({ ...formData, category: value })
                            }
                            required
                          >
                            <SelectTrigger id="category">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIAS.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="condition">Condição *</Label>
                          <Select
                            value={formData.condition}
                            onValueChange={(value) =>
                              setFormData({ ...formData, condition: value })
                            }
                          >
                            <SelectTrigger id="condition">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">Novo (Lacrado)</SelectItem>
                              <SelectItem value="refurbished">Seminovo (Como novo)</SelectItem>
                              <SelectItem value="used">Usado (Com marcas de uso)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="brand">Marca</Label>
                          <Input
                            id="brand"
                            value={formData.brand}
                            onChange={(e) =>
                              setFormData({ ...formData, brand: e.target.value })
                            }
                            placeholder="Ex: Canon"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="model">Modelo</Label>
                          <Input
                            id="model"
                            value={formData.model}
                            onChange={(e) =>
                              setFormData({ ...formData, model: e.target.value })
                            }
                            placeholder="Ex: EOS R5"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>

                {/* Description Card */}
                <ScrollReveal delay={0.2}>
                  <Card>
                    <CardHeader>
                      <CardTitle>Detalhes e Descrição</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="description">Descrição Completa *</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({ ...formData, description: e.target.value })
                          }
                          placeholder="Descreva detalhes técnicos, tempo de uso, motivo da venda, etc..."
                          rows={8}
                          required
                          className="resize-none leading-relaxed"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              </div>

              {/* Sidebar - Right (1/3) */}
              <div className="space-y-6">

                {/* Images Card */}
                <ScrollReveal delay={0.3}>
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-muted/30">
                      <CardTitle className="text-base">Galeria de Fotos</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div
                          className="border-2 border-dashed rounded-xl p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative"
                          onClick={() => document.getElementById('images-input')?.click()}
                        >
                          <input
                            id="images-input"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            multiple
                            onChange={handleImageSelect}
                            className="hidden"
                          />
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                              <Upload className="h-5 w-5" />
                            </div>
                            <div className="text-sm font-medium">Clique para adicionar fotos</div>
                            <div className="text-xs text-muted-foreground">
                              Máximo 5 imagens (1MB cada)
                            </div>
                          </div>
                        </div>

                        {items.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {items.map((item, index) => (
                              <div key={item.id} className="relative group aspect-square rounded-lg overflow-hidden border">
                                <img
                                  src={item.preview}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  className="absolute top-1 right-1 h-6 w-6 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteImage(index);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                                {index === 0 ? (
                                  <div className="absolute bottom-0 left-0 right-0 bg-primary/90 text-primary-foreground text-[10px] text-center py-1 font-medium">
                                    Principal
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="absolute bottom-1 left-1 h-6 w-6 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary"
                                    title="Definir como principal"
                                    onClick={() => handleMakeMain(index)}
                                  >
                                    <Star className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>

                {/* Negociation Card */}
                <ScrollReveal delay={0.4}>
                  <Card>
                    <CardHeader className="bg-muted/30">
                      <CardTitle className="text-base">Valor e Localização</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-2">
                        <Label>Tipo de Negociação *</Label>
                        <Select
                          value={formData.negotiationType}
                          onValueChange={(value) =>
                            setFormData({ ...formData, negotiationType: value })
                          }
                        >
                          <SelectTrigger id="negotiationType">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sale">Venda</SelectItem>
                            <SelectItem value="rent">Aluguel</SelectItem>
                            <SelectItem value="free">Doação / Gratuito</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.negotiationType !== "free" && (
                        <div className="space-y-2">
                          <Label>
                            {formData.negotiationType === "sale" ? "Preço de Venda (R$)" : "Valor do Aluguel (R$)"} *
                          </Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={(e) =>
                              setFormData({ ...formData, price: e.target.value })
                            }
                            placeholder="0,00"
                            required={formData.negotiationType !== "free"}
                            className="text-lg font-bold"
                          />
                        </div>
                      )}

                      {formData.negotiationType === "rent" && (
                        <div className="space-y-2">
                          <Label>Período de Cobrança</Label>
                          <Select
                            value={formData.rentPeriod}
                            onValueChange={(value) =>
                              setFormData({ ...formData, rentPeriod: value })
                            }
                          >
                            <SelectTrigger id="rentPeriod">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="day">Por Dia</SelectItem>
                              <SelectItem value="week">Por Semana</SelectItem>
                              <SelectItem value="month">Por Mês</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="pt-4 border-t space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2 space-y-2">
                            <Label>Cidade *</Label>
                            <Input
                              id="city"
                              value={formData.city}
                              onChange={(e) =>
                                setFormData({ ...formData, city: e.target.value })
                              }
                              required
                              placeholder="Cidade"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>UF *</Label>
                            <Select
                              value={formData.state}
                              onValueChange={(value) =>
                                setFormData({ ...formData, state: value })
                              }
                              required
                            >
                              <SelectTrigger id="state">
                                <SelectValue placeholder="UF" />
                              </SelectTrigger>
                              <SelectContent>
                                {ESTADOS.map((estado) => (
                                  <SelectItem key={estado} value={estado}>
                                    {estado}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button type="submit" className="w-full" size="lg" disabled={saving || success}>
                          {saving ? "Salvando Alterações..." : "Atualizar Anúncio"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full mt-2"
                          onClick={() => router.back()}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              </div>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
