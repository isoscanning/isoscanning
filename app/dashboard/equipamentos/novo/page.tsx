"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { AlertCircle, CheckCircle2, ChevronLeft, Upload, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createEquipment, uploadEquipmentImages } from "@/lib/data-service";
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

import { LocationSelector } from "@/components/location-selector";

export default function NovoEquipamentoPage() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();

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

  const [locationIds, setLocationIds] = useState({
    countryId: 0,
    stateId: 0,
    cityId: 0
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!loading && !userProfile) {
      router.push("/login");
    }
  }, [userProfile, loading, router]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const processFiles = (files: File[]) => {
    if (files.length === 0) return;

    // Check total number of images
    const totalImages = selectedImages.length + files.length;
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

    setSelectedImages(prev => [...prev, ...files]);
    setError("");

    // Create previews for new files
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreviews(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);

    try {
      let imageUrls: string[] = [];

      // Upload images if selected
      if (selectedImages.length > 0 && userProfile?.id) {
        try {
          console.log(`Fazendo upload de ${selectedImages.length} imagens...`);
          imageUrls = await uploadEquipmentImages(selectedImages, userProfile.id);
          console.log("Upload das imagens concluído:", imageUrls);
        } catch (imageError: any) {
          console.error("Erro no upload das imagens:", imageError);
          setError(`Erro no upload das imagens: ${imageError.message}`);
          setSaving(false);
          return;
        }
      }

      // Create equipment
      try {
        console.log("Criando equipamento...");
        await createEquipment({
          ...formData,
          negotiationType: formData.negotiationType as "sale" | "rent" | "free",
          condition: formData.condition as "new" | "refurbished" | "used",
          rentPeriod: formData.rentPeriod as "day" | "week" | "month",
          price: formData.price ? Number.parseFloat(formData.price) : undefined,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          ownerId: userProfile?.id || "",
          ownerName: userProfile?.displayName || "",
          isAvailable: true,
        });
        console.log("Equipamento criado com sucesso!");

        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard/equipamentos");
        }, 1500);
      } catch (equipmentError: any) {
        console.error("Erro ao criar equipamento:", equipmentError);
        setError(`Erro ao salvar equipamento: ${equipmentError.message}`);
      }
    } catch (err: any) {
      console.error("Erro geral:", err);
      setError(err.message || "Erro inesperado ao cadastrar equipamento.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
                  Novo Equipamento
                </h1>
                <p className="text-muted-foreground">
                  Cadastre um equipamento para venda ou aluguel
                </p>
              </div>
            </div>
          </ScrollReveal>

          {success && (
            <Alert className="bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Equipamento cadastrado com sucesso! Redirecionando...
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

                      <div className="space-y-2">
                        <Label htmlFor="additionalConditions">
                          Observações Adicionais
                        </Label>
                        <Textarea
                          id="additionalConditions"
                          value={formData.additionalConditions}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              additionalConditions: e.target.value,
                            })
                          }
                          placeholder="Informações sobre garantia, nota fiscal, caixa original, etc..."
                          rows={3}
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

                        {imagePreviews.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {imagePreviews.map((preview, index) => (
                              <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border">
                                <img
                                  src={preview}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  className="absolute top-1 right-1 h-6 w-6 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newImages = selectedImages.filter((_, i) => i !== index);
                                    const newPreviews = imagePreviews.filter((_, i) => i !== index);
                                    setSelectedImages(newImages);
                                    setImagePreviews(newPreviews);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                                {index === 0 && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-1">
                                    Capa
                                  </div>
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
                        <div className="grid grid-cols-1 gap-2">
                          <Label>Localização *</Label>
                          <LocationSelector
                            className="grid-cols-1 sm:grid-cols-2"
                            selectedStateId={locationIds.stateId}
                            selectedCityId={locationIds.cityId}
                            initialStateUf={formData.state}
                            initialCityName={formData.city}
                            onStateChange={(id, name, uf) => {
                              setLocationIds(prev => ({ ...prev, stateId: id, cityId: 0 }));
                              setFormData(prev => ({ ...prev, state: uf, city: '' }));
                            }}
                            onCityChange={(id, name) => {
                              setLocationIds(prev => ({ ...prev, cityId: id }));
                              setFormData(prev => ({ ...prev, city: name }));
                            }}
                          />
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button type="submit" className="w-full" size="lg" disabled={saving || success}>
                          {saving ? "Publicando..." : "Publicar Anúncio"}
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
