"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star } from "lucide-react";
import Link from "next/link";
import { fetchProfessionals, type Professional } from "@/lib/data-service";
import { SearchBar } from "@/components/search-bar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

export default function ProfissionaisPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSpecialty, setSelectedSpecialty] = useState("Todos");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

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

  const handleSearch = (filters: {
    city: string;
    date: Date | undefined;
    specialty: string;
  }) => {
    setSelectedCity(filters.city);
    setSelectedDate(filters.date);
    setSelectedSpecialty(filters.specialty);
  };

  const filteredProfessionals = professionals.filter((prof) => {
    const matchesSpecialty =
      selectedSpecialty === "Todos" || prof.specialty === selectedSpecialty;

    const matchesCity =
      selectedCity === "" ||
      prof.city?.toLowerCase().includes(selectedCity.toLowerCase());

    // Date filtering would go here if backend supported it or if we had availability data
    // const matchesDate = ...

    return matchesSpecialty && matchesCity;
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <div className="bg-gray-100 py-16 md:py-24 px-4 text-center">
          <div className="container mx-auto max-w-4xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight text-gray-900">
              Encontre o talento certo
              <br />
              <span className="text-blue-600">na hora e no lugar certo.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Conecte-se com os melhores fotógrafos e videógrafos disponíveis
              para a sua data específica e especialidade.
            </p>

            <div className="relative z-10 -mb-28 md:-mb-32">
              <SearchBar
                onSearch={handleSearch}
                specialties={ESPECIALIDADES}
                className="shadow-xl"
              />
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="pt-32 pb-16 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Profissionais Disponíveis
              </h2>
              <span className="text-muted-foreground">
                {filteredProfessionals.length} resultados
              </span>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse border-0 shadow-sm">
                    <CardContent className="pt-0 p-0">
                      <div className="h-64 bg-muted rounded-t-xl w-full"></div>
                      <div className="p-6 space-y-4">
                        <div className="h-6 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProfessionals.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  Nenhum profissional encontrado com os filtros selecionados.
                </p>
                <Button
                  variant="link"
                  onClick={() => {
                    setSelectedCity("");
                    setSelectedSpecialty("Todos");
                    setSelectedDate(undefined);
                  }}
                  className="mt-4"
                >
                  Limpar filtros
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProfessionals.map((prof) => (
                  <Card
                    key={prof.id}
                    className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm overflow-hidden bg-white"
                  >
                    <CardContent className="p-0">
                      <Link href={`/profissionais/${prof.id}`}>
                        {/* Image/Avatar Area - Mimicking the prototype's large image style */}
                        <div className="relative h-64 bg-gray-100 overflow-hidden flex items-center justify-center">
                          <Avatar className="h-full w-full rounded-none">
                            <AvatarImage
                              src={prof.avatarUrl || undefined}
                              alt={prof.displayName}
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <AvatarFallback className="text-2xl bg-muted text-muted-foreground rounded-none">
                              {prof.displayName?.charAt(0).toUpperCase() || "P"}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        <div className="p-6">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-bold text-xl text-gray-900 mb-1">
                                {prof.artisticName || prof.displayName}
                              </h3>
                              <p className="text-sm font-medium text-blue-600">
                                {prof.specialty || "Profissional"}
                              </p>
                            </div>
                            <div className="bg-green-50 text-green-700 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                              Disponível
                            </div>
                          </div>

                          {prof.description && (
                            <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">
                              {prof.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div className="flex gap-2">
                              {/* Tags based on specialty or other data could go here */}
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                                {prof.specialty?.split(" ")[0] || "Geral"}
                              </span>
                            </div>

                            <div className="flex items-center text-blue-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                              Ver Perfil →
                            </div>
                          </div>
                        </div>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

