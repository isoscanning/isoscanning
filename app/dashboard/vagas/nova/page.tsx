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
import { createJobOffer, fetchSpecialties, Specialty } from "@/lib/data-service";

const TIPOS_TRABALHO = [
    { value: "freelance", label: "Freelance" },
    { value: "full_time", label: "Tempo Integral" },
    { value: "part_time", label: "Meio Período" },
    { value: "project", label: "Por Projeto" },
];

const MODALIDADES = [
    { value: "on_site", label: "Presencial" },
    { value: "remote", label: "Remoto" },
    { value: "hybrid", label: "Híbrido" },
];

const ESTADOS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
    "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export default function NovaVagaPage() {
    const router = useRouter();
    const { userProfile, loading } = useAuth();

    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [formData, setFormData] = useState({
        title: "",
        category: "",
        specialtyId: "",
        jobType: "freelance",
        locationType: "on_site",
        description: "",
        city: "",
        state: "",
        budgetMin: "",
        budgetMax: "",
        requirements: "",
        startDate: "",
        endDate: "",
    });

    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!loading && !userProfile) {
            router.push("/login");
        }
    }, [userProfile, loading, router]);

    useEffect(() => {
        fetchSpecialties().then(setSpecialties);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);
        setSaving(true);

        try {
            const selectedSpecialty = specialties.find(s => s.id === formData.specialtyId);
            const categoryName = selectedSpecialty ? selectedSpecialty.name : "Outros";

            await createJobOffer({
                ...formData,
                category: categoryName,
                jobType: formData.jobType as any,
                locationType: formData.locationType as any,
                budgetMin: formData.budgetMin ? Number.parseFloat(formData.budgetMin) : undefined,
                budgetMax: formData.budgetMax ? Number.parseFloat(formData.budgetMax) : undefined,
                isActive: true,
            });

            setSuccess(true);
            setTimeout(() => {
                router.push("/dashboard/vagas");
            }, 1500);
        } catch (err: any) {
            console.error("Erro ao criar vaga:", err);

            // Extract error message from API response
            let errorMessage = "Erro inesperado ao cadastrar vaga.";

            if (err.response?.data?.message) {
                if (Array.isArray(err.response.data.message)) {
                    errorMessage = err.response.data.message.join(", ");
                } else {
                    errorMessage = err.response.data.message;
                }
            } else if (err.message) {
                errorMessage = err.message;
            }

            setError(errorMessage);
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
                        <h1 className="text-3xl font-bold">Publicar Nova Vaga</h1>
                        <p className="text-muted-foreground mt-2">
                            Encontre o profissional ideal para o seu projeto audiovisual
                        </p>
                    </div>

                    {success && (
                        <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertDescription>
                                Vaga publicada com sucesso! Redirecionando...
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
                                <CardTitle>Informações da Vaga</CardTitle>
                                <CardDescription>
                                    Preencha os detalhes da oportunidade
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Título da Vaga *</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) =>
                                            setFormData({ ...formData, title: e.target.value })
                                        }
                                        placeholder="Ex: Fotógrafo para Casamento em São Paulo"
                                        required
                                        minLength={5}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="specialtyId">Especialidade *</Label>
                                        <Select
                                            value={formData.specialtyId}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, specialtyId: value })
                                            }
                                            required
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {specialties.map((spec) => (
                                                    <SelectItem key={spec.id} value={spec.id}>
                                                        {spec.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="jobType">Tipo de Trabalho *</Label>
                                        <Select
                                            value={formData.jobType}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, jobType: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TIPOS_TRABALHO.map((tipo) => (
                                                    <SelectItem key={tipo.value} value={tipo.value}>
                                                        {tipo.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="locationType">Modalidade *</Label>
                                        <Select
                                            value={formData.locationType}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, locationType: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MODALIDADES.map((mod) => (
                                                    <SelectItem key={mod.value} value={mod.value}>
                                                        {mod.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="budget">Orçamento (Opcional)</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="budgetMin"
                                                type="number"
                                                placeholder="Mín"
                                                value={formData.budgetMin}
                                                onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                                            />
                                            <Input
                                                id="budgetMax"
                                                type="number"
                                                placeholder="Máx"
                                                value={formData.budgetMax}
                                                onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="startDate">Data de Início (Opcional)</Label>
                                        <Input
                                            id="startDate"
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endDate">Data de Término (Opcional)</Label>
                                        <Input
                                            id="endDate"
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Descrição da Vaga *</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData({ ...formData, description: e.target.value })
                                        }
                                        placeholder="Descreva as responsabilidades, o projeto e o que você procura (mínimo 20 caracteres)..."
                                        rows={5}
                                        required
                                        minLength={20}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="requirements">Requisitos / Equipamentos Necessários</Label>
                                    <Textarea
                                        id="requirements"
                                        value={formData.requirements}
                                        onChange={(e) =>
                                            setFormData({ ...formData, requirements: e.target.value })
                                        }
                                        placeholder="Ex: Câmera Full Frame, Lente 50mm, Experiência com eventos..."
                                        rows={3}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="city">Cidade</Label>
                                        <Input
                                            id="city"
                                            value={formData.city}
                                            onChange={(e) =>
                                                setFormData({ ...formData, city: e.target.value })
                                            }
                                            disabled={formData.locationType === "remote"}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="state">Estado</Label>
                                        <Select
                                            value={formData.state}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, state: value })
                                            }
                                            disabled={formData.locationType === "remote"}
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
                                        {saving ? "Publicando..." : "Publicar Vaga"}
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
