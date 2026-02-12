"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Search, Users, Filter, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { ScrollReveal } from "@/components/scroll-reveal";
import { CountUp } from "@/components/typing-text";
import { useProfessionals } from "./hooks/use-professionals";
import { ProfessionalCard } from "./components/professional-card";

export default function ProfissionaisPage() {
  const {
    availableSpecialties,
    loading,
    selectedSpecialty,
    selectedCity,
    filteredProfessionals,
    handleSearch,
    setSelectedCity,
    setSelectedSpecialty,
    setSelectedDate
  } = useProfessionals();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* --- Hero Section --- */}
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

        {/* --- Results Section --- */}
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
                      trackEvent({ action: 'filter', category: 'Professionals', label: 'Clear Filters' });
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
                  <ProfessionalCard key={prof.id} professional={prof} index={index} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* --- CTA Section --- */}
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
                <Link href="/cadastro?tipo=profissional" onClick={() => trackEvent({ action: 'click_cta', category: 'Professionals', label: 'Create Profile Footer' })}>
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
