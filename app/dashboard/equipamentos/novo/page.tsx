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
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createEquipment, uploadEquipmentImages } from "@/lib/data-service";

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

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !userProfile) {
      router.push("/login");
    }
  }, [userProfile, loading, router]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    // Check total number of images
    const totalImages = selectedImages.length + files.length;
    if (totalImages > 5) {
      setError("Máximo de 5 imagens por equipamento");
      return;
    }

    // Validate each file
    for (const file of files) {
      // Validate file size (1MB)
      const maxSize = 1024 * 1024; // 1MB
      if (file.size > maxSize) {
        setError(`Imagem "${file.name}" deve ter no máximo 1MB`);
        return;
      }

      // Validate file type
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
            <h1 className="text-3xl font-bold">Adicionar Equipamento</h1>
            <p className="text-muted-foreground mt-2">
              Cadastre um equipamento para venda, aluguel ou disponibilização
            </p>
          </div>

          {success && (
            <Alert>
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
            <Card>
              <CardHeader>
                <CardTitle>Informações do Equipamento</CardTitle>
                <CardDescription>
                  Preencha os dados do equipamento
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

                    {imagePreviews.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                              onClick={() => {
                                const newImages = selectedImages.filter((_, i) => i !== index);
                                const newPreviews = imagePreviews.filter((_, i) => i !== index);
                                setSelectedImages(newImages);
                                setImagePreviews(newPreviews);
                              }}
                            >
                              ×
                            </Button>
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

                <div className="space-y-2">
                  <Label htmlFor="additionalConditions">
                    Condições Adicionais
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
                    placeholder="Regras de uso, garantia, forma de entrega, etc..."
                    rows={3}
                  />
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
                    {saving ? "Salvando..." : "Cadastrar Equipamento"}
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
