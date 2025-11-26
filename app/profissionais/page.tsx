"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search, MapPin, Star, Filter, X } from "lucide-react";
import Link from "next/link";
import { fetchProfessionals, type Professional } from "@/lib/data-service";

const ESPECIALIDADES = [
  "Todos",
  "Fotógrafo",
  "Videomaker",
  "Editor de Vídeo",
  "Editor de Fotos",
  "Produtor Audiovisual",
  "Drone Pilot",
  "Fotógrafo de Eventos",
  "Fotógrafo de Produtos",
  "Fotógrafo de Retratos",
  "Cinegrafista",
];

const ESTADOS = [
  "Todos",
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

export default function ProfissionaisPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("Todos");
  const [selectedState, setSelectedState] = useState("Todos");
  const [selectedCity, setSelectedCity] = useState("");
  const [minRating, setMinRating] = useState([0]);

  useEffect(() => {
    loadProfessionals();
  }, []);

  const loadProfessionals = async () => {
    setLoading(true);
    try {
      const data = await fetchProfessionals();
      setProfessionals(data as any);
    } catch (error) {
      console.error("[v0] Error loading professionals:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfessionals = professionals.filter((prof) => {
    const matchesSearch =
      searchTerm === "" ||
      prof.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prof.artisticName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prof.specialty?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSpecialty =
      selectedSpecialty === "Todos" || prof.specialty === selectedSpecialty;

    const matchesState =
      selectedState === "Todos" || prof.state === selectedState;

    const matchesCity =
      selectedCity === "" ||
      prof.city?.toLowerCase().includes(selectedCity.toLowerCase());

    const matchesRating = (prof.averageRating || 0) >= minRating[0];

    return (
      matchesSearch &&
      matchesSpecialty &&
      matchesState &&
      matchesCity &&
      matchesRating
    );
  });

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSpecialty("Todos");
    setSelectedState("Todos");
    setSelectedCity("");
    setMinRating([0]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Buscar Profissionais
            </h1>
            <p className="text-muted-foreground">
              Encontre fotógrafos, videomakers e profissionais de audiovisual
              qualificados
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, especialidade ou palavra-chave..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Especialidade</Label>
                    <Select
                      value={selectedSpecialty}
                      onValueChange={setSelectedSpecialty}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ESPECIALIDADES.map((esp) => (
                          <SelectItem key={esp} value={esp}>
                            {esp}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                      value={selectedState}
                      onValueChange={setSelectedState}
                    >
                      <SelectTrigger>
                        <SelectValue />
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

                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input
                      placeholder="Digite a cidade"
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Avaliação mínima: {minRating[0]} estrelas</Label>
                    <Slider
                      value={minRating}
                      onValueChange={setMinRating}
                      max={5}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <Button variant="ghost" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Limpar filtros
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          <div className="mb-4 text-sm text-muted-foreground">
            {loading
              ? "Carregando..."
              : `${filteredProfessionals.length} profissionais encontrados`}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="h-24 w-24 rounded-full bg-muted mx-auto mb-4"></div>
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3 mx-auto"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProfessionals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Nenhum profissional encontrado com os filtros aplicados.
                </p>
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Limpar filtros
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProfessionals.map((prof) => (
                <Card
                  key={prof.id}
                  className="hover:border-primary transition-colors"
                >
                  <CardContent className="pt-6">
                    <Link href={`/profissionais/${prof.id}`}>
                      <div className="text-center space-y-4">
                        {/* Avatar */}
                        <div className="relative mx-auto h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {prof.avatarUrl ? (
                            <img
                              src={prof.avatarUrl || "/placeholder.svg"}
                              alt={prof.displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-3xl font-bold text-primary">
                              {prof.displayName?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div>
                          <h3 className="font-semibold text-lg">
                            {prof.artisticName || prof.displayName}
                          </h3>
                          {prof.specialty && (
                            <p className="text-sm text-muted-foreground">
                              {prof.specialty}
                            </p>
                          )}
                        </div>

                        {/* Location */}
                        {(prof.city || prof.state) && (
                          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>
                              {prof.city}
                              {prof.city && prof.state && ", "}
                              {prof.state}
                            </span>
                          </div>
                        )}

                        {/* Rating */}
                        {prof.totalReviews && prof.totalReviews > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-4 w-4 fill-primary text-primary" />
                            <span className="font-medium">
                              {prof.averageRating?.toFixed(1)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({prof.totalReviews})
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Sem avaliações
                          </p>
                        )}

                        {/* Description Preview */}
                        {prof.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {prof.description}
                          </p>
                        )}

                        <Button className="w-full mt-4">Ver Perfil</Button>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
