"use client";

import { Camera, CheckCircle2, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LocationSelector } from "@/components/location-selector";
import { type Specialty } from "@/lib/data-service";
import { useState } from "react";

interface PersonalDataFormProps {
    formData: any;
    setFormData: (data: any) => void;
    avatarPreview: string | null;
    uploadingAvatar: boolean;
    handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    availableSpecialties: Specialty[];
    validationErrors: string[];
    setValidationErrors: (errors: any) => void;
    removeSpecialty: (spec: string) => void;
    toggleSpecialty: (spec: string) => void;
    countries: any[];
    selectedCountryCode: string;
    setSelectedCountryCode: (code: string) => void;
    ESTADOS: string[];
}

export function PersonalDataForm({
    formData,
    setFormData,
    avatarPreview,
    uploadingAvatar,
    handleAvatarChange,
    availableSpecialties,
    validationErrors,
    setValidationErrors,
    removeSpecialty,
    toggleSpecialty,
    countries,
    selectedCountryCode,
    setSelectedCountryCode,

    ESTADOS
}: PersonalDataFormProps) {
    const [localCountryId, setLocalCountryId] = useState<number | null>(null);
    const [localStateId, setLocalStateId] = useState<number | null>(null);
    const [localCityId, setLocalCityId] = useState<number | null>(null);
    return (
        <Card className="border-2 shadow-sm">
            <CardHeader className="space-y-1 pb-6">
                <CardTitle className="text-2xl">Informações Básicas</CardTitle>
                <CardDescription className="text-base">Seus dados de contato e apresentação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-4 pb-6 border-b">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-muted to-muted/50 border-4 border-background shadow-lg overflow-hidden flex items-center justify-center ring-2 ring-border/50">
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <Camera className="w-12 h-12 text-muted-foreground" />
                            )}
                        </div>
                        <label
                            htmlFor="avatar-upload"
                            className="absolute inset-0 rounded-full flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                            {uploadingAvatar ? (
                                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <div className="flex flex-col items-center gap-1">
                                    <Camera className="w-6 h-6 text-white" />
                                    <span className="text-xs text-white font-medium">Editar</span>
                                </div>
                            )}
                        </label>
                        <input
                            type="file"
                            id="avatar-upload"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                        />
                    </div>
                    <div className="text-center">
                        <p className="font-medium">Foto de Perfil</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Clique para alterar (máx 5MB)</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="displayName">Nome Completo *</Label>
                        <Input
                            id="displayName"
                            value={formData.displayName}
                            onChange={(e) => {
                                setFormData({ ...formData, displayName: e.target.value });
                                if (validationErrors.includes("displayName")) {
                                    setValidationErrors((prev: string[]) => prev.filter(f => f !== "displayName"));
                                }
                            }}
                            className={cn(validationErrors.includes("displayName") && "border-destructive focus-visible:ring-destructive")}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="artisticName">Nome Artístico / Estúdio</Label>
                        <Input
                            id="artisticName"
                            value={formData.artisticName}
                            onChange={(e) => setFormData({ ...formData, artisticName: e.target.value })}
                            placeholder="Como quer ser conhecido"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <Label className={cn(
                        "text-base font-semibold",
                        validationErrors.includes("specialties") && "text-destructive"
                    )}>Especialidades *</Label>
                    <p className="text-sm text-muted-foreground -mt-1">Selecione suas áreas de atuação</p>

                    <div className={cn(
                        "flex flex-wrap gap-2 p-3 min-h-[56px] border-2 rounded-lg bg-background transition-colors",
                        validationErrors.includes("specialties")
                            ? "border-destructive ring-2 ring-destructive/20"
                            : "border-border hover:border-muted-foreground/30"
                    )}>
                        {formData.specialties.length === 0 && <span className="text-muted-foreground text-sm self-center px-1">Nenhuma especialidade selecionada</span>}
                        {formData.specialties.map((spec: string) => (
                            <Badge key={spec} variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 text-sm">
                                {spec}
                                <button type="button" onClick={() => removeSpecialty(spec)} className="hover:text-destructive transition-colors">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </Badge>
                        ))}
                    </div>

                    <div className="border-2 rounded-lg max-h-[240px] overflow-y-auto p-2 bg-muted/20">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                            {availableSpecialties.map(spec => {
                                const isSelected = formData.specialties.includes(spec.name)
                                return (
                                    <div
                                        key={spec.id}
                                        onClick={() => toggleSpecialty(spec.name)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all",
                                            "hover:bg-accent hover:shadow-sm",
                                            isSelected && "bg-primary/10 dark:bg-primary/20 border border-primary/30"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-5 h-5 border-2 rounded-md flex items-center justify-center transition-all",
                                            isSelected
                                                ? "bg-primary border-primary text-primary-foreground scale-110"
                                                : "border-input hover:border-primary/50"
                                        )}>
                                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                                        </div>
                                        <span className="text-sm font-medium">{spec.name}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Descrição / Bio *</Label>
                    <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => {
                            setFormData({ ...formData, description: e.target.value });
                            if (validationErrors.includes("description")) {
                                setValidationErrors((prev: string[]) => prev.filter(f => f !== "description"));
                            }
                        }}
                        placeholder="Fale sobre seus serviços, equipamentos e experiência..."
                        rows={5}
                        className={cn(validationErrors.includes("description") && "border-destructive focus-visible:ring-destructive")}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label>Locais</Label>
                    <LocationSelector
                        key={localCountryId} // Remount if country changes to ensure clean state if needed, or rely on internal logic
                        initialCountryName={formData.country || "Brazil"} // Default to Brazil if not set? Or pass "Brazil" as initial
                        initialStateUf={formData.state}
                        initialCityName={formData.city}

                        selectedCountryId={localCountryId}
                        selectedStateId={localStateId}
                        selectedCityId={localCityId}

                        onCountryChange={(id, name) => {
                            setLocalCountryId(id);
                            setFormData({ ...formData, country: name, state: "", city: "" });
                            setLocalStateId(null);
                            setLocalCityId(null);
                        }}
                        onStateChange={(id, name, uf) => {
                            setLocalStateId(id);
                            setFormData({ ...formData, state: uf, city: "" });
                            setLocalCityId(null);
                        }}
                        onCityChange={(id, name, ddd) => {
                            setLocalCityId(id);

                            // If we have a DDD and phone is empty, pre-fill it
                            let newPhone = formData.phone;
                            if (ddd && (!newPhone || newPhone.trim() === "")) {
                                newPhone = `(${ddd}) `;
                            }

                            setFormData({ ...formData, city: name, phone: newPhone });
                        }}

                        className="grid-cols-1 md:grid-cols-3"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">Telefone / WhatsApp</Label>
                    <div className="flex gap-2">
                        <Select
                            value={selectedCountryCode}
                            onValueChange={setSelectedCountryCode}
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="País" />
                            </SelectTrigger>
                            <SelectContent>
                                {countries.map((country) => {
                                    const code = `${country.idd.root}${country.idd.suffixes?.[0] || ''}`;
                                    return (
                                        <SelectItem key={code} value={code}>
                                            <span className="flex items-center gap-2">
                                                <span>{country.flag}</span>
                                                <span>{code}</span>
                                            </span>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                        <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
