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
import {
    AlertCircle,
    CheckCircle2,
    Briefcase,
    MapPin,
    Calendar,
    DollarSign,
    FileText,
    ArrowLeft,
    Save,
    Loader2
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createJobOffer, fetchSpecialties, Specialty } from "@/lib/data-service";
import { ScrollReveal } from "@/components/scroll-reveal";

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

import { LocationSelector } from "@/components/location-selector";

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
        requiresInvoice: false,
    });

    const [locationIds, setLocationIds] = useState({
        countryId: 0,
        stateId: 0,
        cityId: 0
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

            if (formData.budgetMin && Number(formData.budgetMin) < 0) {
                throw new Error("O orçamento mínimo não pode ser negativo.");
            }
            if (formData.budgetMax && Number(formData.budgetMax) < 0) {
                throw new Error("O orçamento máximo não pode ser negativo.");
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (formData.startDate) {
                const startDate = new Date(formData.startDate);
                // Adjust for timezone offset to compare correctly with date picker value
                const startDateAdjusted = new Date(startDate.getTime() + startDate.getTimezoneOffset() * 60000);

                if (startDateAdjusted < today) {
                    throw new Error("A data de início não pode ser anterior à data atual.");
                }

                if (formData.endDate) {
                    const endDate = new Date(formData.endDate);
                    const endDateAdjusted = new Date(endDate.getTime() + endDate.getTimezoneOffset() * 60000);

                    if (endDateAdjusted < startDateAdjusted) {
                        throw new Error("A data de término não pode ser anterior à data de início.");
                    }
                }
            }

            await createJobOffer({
                ...formData,
                category: categoryName,
                jobType: formData.jobType as any,
                locationType: formData.locationType as any,
                budgetMin: formData.budgetMin ? Number.parseFloat(formData.budgetMin) : undefined,
                budgetMax: formData.budgetMax ? Number.parseFloat(formData.budgetMax) : undefined,
                startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
                endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
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
        <div className="min-h-screen flex flex-col bg-background/50">
            <Header />

            <main className="flex-1 py-12 px-4">
                <div className="container mx-auto max-w-4xl space-y-8">

                    {/* Header Section */}
                    <ScrollReveal>
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b">
                            <div>
                                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                                    Publicar Nova Vaga
                                </h1>
                                <p className="text-muted-foreground mt-2">
                                    Encontre o profissional ideal para o seu projeto audiovisual
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() => router.back()}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Voltar
                            </Button>
                        </div>
                    </ScrollReveal>

                    {success && (
                        <ScrollReveal>
                            <Alert className="bg-green-500/10 border-green-500/20 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertDescription>
                                    Vaga publicada com sucesso! Redirecionando...
                                </AlertDescription>
                            </Alert>
                        </ScrollReveal>
                    )}

                    {error && (
                        <ScrollReveal>
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        </ScrollReveal>
                    )}

                    <ScrollReveal delay={0.2}>
                        <form onSubmit={handleSubmit}>
                            <Card className="border-t-4 border-t-primary shadow-lg">
                                <CardHeader>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                            <Briefcase className="h-5 w-5" />
                                        </div>
                                        <CardTitle>Detalhes da Oportunidade</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Preencha as informações abaixo para atrair os melhores candidatos.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">

                                    {/* Section 1: Basic Info */}
                                    <div className="grid gap-6 p-4 rounded-xl bg-muted/30">
                                        <div className="space-y-2">
                                            <Label htmlFor="title" className="text-base font-medium">Título da Vaga *</Label>
                                            <Input
                                                id="title"
                                                value={formData.title}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, title: e.target.value })
                                                }
                                                placeholder="Ex: Fotógrafo para Casamento em São Paulo"
                                                required
                                                minLength={5}
                                                className="text-lg py-6"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="specialtyId">Especialidade *</Label>
                                                <Select
                                                    value={formData.specialtyId}
                                                    onValueChange={(value) =>
                                                        setFormData({ ...formData, specialtyId: value })
                                                    }
                                                    required
                                                >
                                                    <SelectTrigger className="h-12">
                                                        <SelectValue placeholder="Selecione a área" />
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
                                                    <SelectTrigger className="h-12">
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
                                    </div>

                                    {/* Section 2: Logistics */}
                                    <div className="grid gap-6">
                                        <div className="flex items-center gap-2 pb-2 border-b">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Localização e Modalidade</h3>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                                            <LocationSelector
                                                className="col-span-1 md:col-span-2 grid-cols-1 sm:grid-cols-2"
                                                isDisabled={formData.locationType === "remote"}
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

                                    {/* Section 3: Budget & Dates */}
                                    <div className="grid gap-6">
                                        <div className="flex items-center gap-2 pb-2 border-b">
                                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Orçamento e Prazos</h3>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="budget">Orçamento Estimado (R$)</Label>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <span className="absolute left-3 top-2.5 text-muted-foreground">Min</span>
                                                        <Input
                                                            id="budgetMin"
                                                            type="number"
                                                            min="0"
                                                            className="pl-12"
                                                            value={formData.budgetMin}
                                                            onChange={(e) => {
                                                                let val = e.target.value;
                                                                if (val.includes('-')) return;
                                                                if (val.startsWith('0') && val.length > 1 && val[1] !== '.') {
                                                                    val = val.replace(/^0+/, '');
                                                                }
                                                                setFormData({ ...formData, budgetMin: val })
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="relative flex-1">
                                                        <span className="absolute left-3 top-2.5 text-muted-foreground">Máx</span>
                                                        <Input
                                                            id="budgetMax"
                                                            type="number"
                                                            min="0"
                                                            className="pl-12"
                                                            value={formData.budgetMax}
                                                            onChange={(e) => {
                                                                let val = e.target.value;
                                                                if (val.includes('-')) return;
                                                                if (val.startsWith('0') && val.length > 1 && val[1] !== '.') {
                                                                    val = val.replace(/^0+/, '');
                                                                }
                                                                setFormData({ ...formData, budgetMax: val })
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="startDate">Início</Label>
                                                    <Input
                                                        id="startDate"
                                                        type="date"
                                                        min={new Date().toISOString().split('T')[0]}
                                                        value={formData.startDate}
                                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                                        className={
                                                            formData.startDate && new Date(formData.startDate) < new Date(new Date().setHours(0, 0, 0, 0))
                                                                ? "border-red-500 focus-visible:ring-red-500"
                                                                : ""
                                                        }
                                                    />
                                                    {formData.startDate && new Date(formData.startDate) < new Date(new Date().setHours(0, 0, 0, 0)) && (
                                                        <span className="text-xs text-red-500">A data não pode ser menor que hoje</span>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="endDate">Término</Label>
                                                    <Input
                                                        id="endDate"
                                                        type="date"
                                                        min={formData.startDate || new Date().toISOString().split('T')[0]}
                                                        value={formData.endDate}
                                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                                        className={
                                                            formData.endDate && formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)
                                                                ? "border-red-500 focus-visible:ring-red-500"
                                                                : ""
                                                        }
                                                        disabled={!formData.startDate}
                                                    />
                                                    {formData.endDate && formData.startDate && new Date(formData.endDate) < new Date(formData.startDate) && (
                                                        <span className="text-xs text-red-500">A data final não pode ser menor que a inicial</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                                            <input
                                                type="checkbox"
                                                id="requiresInvoice"
                                                checked={formData.requiresInvoice}
                                                onChange={(e) => setFormData({ ...formData, requiresInvoice: e.target.checked })}
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <div className="flex flex-col">
                                                <Label htmlFor="requiresInvoice" className="cursor-pointer font-medium">Exige Nota Fiscal</Label>
                                                <span className="text-xs text-muted-foreground">O profissional deverá emitir NF para receber o pagamento.</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 4: Description */}
                                    <div className="grid gap-6">
                                        <div className="flex items-center gap-2 pb-2 border-b">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Descrição e Requisitos</h3>
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
                                                rows={6}
                                                required
                                                minLength={20}
                                                className="resize-y min-h-[120px]"
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
                                                rows={4}
                                                className="resize-y min-h-[100px]"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-6 border-t">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => router.back()}
                                            className="px-6 rounded-full"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={saving || success}
                                            className="px-6 rounded-full shadow-md hover:shadow-lg transition-all"
                                        >
                                            {saving ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Publicando...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="h-4 w-4 mr-2" />
                                                    Publicar Vaga
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </form>
                    </ScrollReveal>
                </div>
            </main >

            <Footer />
        </div >
    );
}
