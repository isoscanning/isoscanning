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
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateEquipment, fetchUserEquipments, uploadEquipmentImages, deleteEquipmentImages } from "@/lib/data-service";

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
    const newItems: ImageItem[] = [];

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
        additionalConditions: "",
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
      // Problem: We need to respect the order in 'items'.
      // 'items' has a mix of existing (ref by preview url) and new (ref by file object).
      // We have 'existingUrls' (subset) and 'uploadedUrls' (subset).
      // We need to map 'items' to their final URLs.

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!userProfile) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-3xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Editar Equipamento</h1>
            <p className="text-muted-foreground mt-2">
              Atualize as informações do seu equipamento
            </p>
          </div>

          {success && (
            <Alert>
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
            <Card>
              <CardHeader>
                <CardTitle>Informações do Equipamento</CardTitle>
                <CardDescription>
                  Atualize os dados do equipamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Equipamento *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ex: Canon EOS R5"
                    required
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
                      <SelectTrigger>
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
                    <Label htmlFor="negotiationType">
                      Tipo de Negociação *
                    </Label>
                    <Select
                      value={formData.negotiationType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, negotiationType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sale">Venda</SelectItem>
                        <SelectItem value="rent">Aluguel</SelectItem>
                        <SelectItem value="free">
                          Disponibilização Gratuita
                        </SelectItem>
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

                <div className="space-y-2">
                  <Label htmlFor="condition">Estado de Conservação *</Label>
                  <Select
                    value={formData.condition}
                    onValueChange={(value) =>
                      setFormData({ ...formData, condition: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Novo</SelectItem>
                      <SelectItem value="refurbished">Seminovo</SelectItem>
                      <SelectItem value="used">Usado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.negotiationType !== "free" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">
                        {formData.negotiationType === "sale"
                          ? "Preço de Venda"
                          : "Valor do Aluguel"}{" "}
                        *
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                        placeholder="0.00"
                        required={formData.negotiationType !== "free"}
                      />
                    </div>

                    {formData.negotiationType === "rent" && (
                      <div className="space-y-2">
                        <Label htmlFor="rentPeriod">Período</Label>
                        <Select
                          value={formData.rentPeriod}
                          onValueChange={(value) =>
                            setFormData({ ...formData, rentPeriod: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="day">Por dia</SelectItem>
                            <SelectItem value="week">Por semana</SelectItem>
                            <SelectItem value="month">Por mês</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Descreva o equipamento, suas características e condições..."
                    rows={5}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="images">Fotos do Equipamento</Label>
                  <div className="space-y-4">
                    <Input
                      id="images"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      multiple
                      onChange={handleImageSelect}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    <p className="text-sm text-muted-foreground">
                      Máximo 5 imagens, 1MB cada. Formatos: JPEG, PNG, WebP
                    </p>

                    {items.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {items.map((item, index) => (
                          <div key={item.id} className="relative group">
                            <img
                              src={item.preview}
                              alt={`Preview ${index + 1}`}
                              className={`w-full h-32 object-cover rounded-lg border-2 ${index === 0 ? "border-primary" : "border-border"}`}
                            />

                            {/* Badges/Actions */}
                            <div className="absolute top-2 left-2 flex gap-1">
                              {index === 0 && (
                                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium shadow-sm">
                                  Principal
                                </span>
                              )}
                            </div>

                            <div className="absolute top-1 right-1 flex gap-1">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="h-6 w-6 p-0 rounded-full"
                                onClick={() => handleDeleteImage(index)}
                              >
                                ×
                              </Button>
                            </div>

                            {/* "Make Main" Overlay */}
                            {index !== 0 && (
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg pointer-events-none">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="pointer-events-auto"
                                  onClick={() => handleMakeMain(index)}
                                >
                                  Definir Principal
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Estado *</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) =>
                        setFormData({ ...formData, state: value })
                      }
                      required
                    >
                      <SelectTrigger>
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

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving || success}>
                    {saving ? "Salvando..." : "Atualizar Equipamento"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
