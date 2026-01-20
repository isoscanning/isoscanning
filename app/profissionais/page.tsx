"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Search, Users, Filter, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { fetchProfessionals, fetchSpecialties, type Professional, type Specialty } from "@/lib/data-service";
import { SearchBar } from "@/components/search-bar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollReveal } from "@/components/scroll-reveal";
import { CountUp } from "@/components/typing-text";
import { motion } from "framer-motion";

export default function ProfissionaisPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>(["Todos"]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSpecialty, setSelectedSpecialty] = useState("Todos");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  useEffect(() => {
    loadSpecialties();
    loadProfessionals();
  }, []);

  const loadSpecialties = async () => {
    const data = await fetchSpecialties();
    const names = data.map(s => s.name);
    setAvailableSpecialties(["Todos", ...names]);
  };

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

    return matchesSpecialty && matchesCity;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-28 overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50/50 to-pink-50 dark:from-blue-950/30 dark:via-purple-950/20 dark:to-pink-950/30" />

          {/* Animated gradient orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 max-w-5xl relative z-10">
            <ScrollReveal>
              <div className="text-center mb-12">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-sm font-medium mb-6">
                  <Sparkles className="h-4 w-4" />
                  Encontre os melhores profissionais
                </span>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
                  <span className="text-foreground">Encontre o </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400">
                    talento perfeito
                  </span>
                  <br />
                  <span className="text-foreground">para seu projeto</span>
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                  Conecte-se com fotógrafos e videógrafos qualificados,
                  disponíveis exatamente quando você precisa.
                </p>
              </div>
            </ScrollReveal>

            {/* Search Bar */}
            <ScrollReveal delay={0.2}>
              <div className="relative z-20">
                <SearchBar
                  onSearch={handleSearch}
                  specialties={availableSpecialties}
                  className="shadow-2xl shadow-primary/10 border-2"
                />
              </div>
            </ScrollReveal>

            {/* Quick Stats */}
            <ScrollReveal delay={0.4}>
              <div className="flex flex-wrap justify-center gap-8 mt-10 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Perfis Verificados</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>Avaliações Reais</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span><CountUp end={500} duration={1.5} />+ Profissionais</span>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Results Section */}
        <section className="py-16 px-4 bg-muted/30 dark:bg-muted/10">
          <div className="container mx-auto max-w-7xl">
            {/* Results Header */}
            <ScrollReveal>
              <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    Profissionais Disponíveis
                  </h2>
                  <p className="text-muted-foreground">
                    {loading ? "Carregando..." : `${filteredProfessionals.length} profissionais encontrados`}
                  </p>
                </div>

                {/* Active Filters */}
                {(selectedCity || selectedSpecialty !== "Todos") && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedCity && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                        <MapPin className="h-3.5 w-3.5" />
                        {selectedCity}
                        <button
                          onClick={() => setSelectedCity("")}
                          className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {selectedSpecialty !== "Todos" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full text-sm font-medium">
                        <Filter className="h-3.5 w-3.5" />
                        {selectedSpecialty}
                        <button
                          onClick={() => setSelectedSpecialty("Todos")}
                          className="ml-1 hover:bg-purple-500/20 rounded-full p-0.5"
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </ScrollReveal>

            {/* Loading State */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse border-2 overflow-hidden">
                    <CardContent className="pt-0 p-0">
                      <div className="h-72 bg-muted w-full" />
                      <div className="p-6 space-y-4">
                        <div className="h-6 bg-muted rounded w-3/4" />
                        <div className="h-4 bg-muted rounded w-1/2" />
                        <div className="h-4 bg-muted rounded w-2/3" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredProfessionals.length === 0 ? (
              /* Empty State */
              <ScrollReveal>
                <div className="text-center py-20">
                  <div className="h-24 w-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                    <Search className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Nenhum profissional encontrado</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Não encontramos profissionais com os filtros selecionados.
                    Tente ajustar sua busca.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedCity("");
                      setSelectedSpecialty("Todos");
                      setSelectedDate(undefined);
                    }}
                    className="rounded-full"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </ScrollReveal>
            ) : (
              /* Professional Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProfessionals.map((prof, index) => (
                  <motion.div
                    key={prof.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card className="group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-2 hover:border-primary/30 overflow-hidden bg-card h-full">
                      <CardContent className="p-0">
                        <Link href={`/profissionais/${prof.id}`}>
                          {/* Image Area */}
                          <div className="relative h-72 bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
                            <Avatar className="h-full w-full rounded-none">
                              <AvatarImage
                                src={prof.avatarUrl || undefined}
                                alt={prof.displayName}
                                className="object-cover group-hover:scale-110 transition-transform duration-700"
                              />
                              <AvatarFallback className="text-4xl bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary rounded-none h-full w-full flex items-center justify-center">
                                {prof.displayName?.charAt(0).toUpperCase() || "P"}
                              </AvatarFallback>
                            </Avatar>

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            {/* Availability Badge */}
                            <div className="absolute top-4 right-4">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/90 backdrop-blur-sm text-white text-xs font-bold rounded-full uppercase tracking-wide shadow-lg">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                Disponível
                              </span>
                            </div>

                            {/* View Profile Overlay */}
                            <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                              <span className="inline-flex items-center gap-2 text-white font-medium">
                                Ver Perfil Completo
                                <ArrowRight className="h-4 w-4" />
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-6">
                            <div className="mb-3">
                              <h3 className="font-bold text-xl text-foreground mb-1 group-hover:text-primary transition-colors">
                                {prof.artisticName || prof.displayName}
                              </h3>
                              <p className="text-sm font-medium text-primary">
                                {prof.specialty || "Profissional"}
                              </p>
                            </div>

                            {prof.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                {prof.description}
                              </p>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-4 border-t">
                              <div className="flex items-center gap-2">
                                {prof.city && (
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    {prof.city}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 text-yellow-500">
                                <Star className="h-4 w-4 fill-current" />
                                <span className="text-sm font-medium text-foreground">5.0</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-primary via-purple-600 to-pink-600 dark:from-primary/90 dark:via-purple-700 dark:to-pink-700">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="max-w-3xl mx-auto text-center text-white">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  É um profissional de fotografia?
                </h2>
                <p className="text-lg text-white/90 mb-8">
                  Cadastre-se gratuitamente e seja encontrado por clientes
                  que precisam do seu talento.
                </p>
                <Link href="/cadastro?tipo=profissional">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="h-14 px-10 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300"
                  >
                    Criar Meu Perfil Grátis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
