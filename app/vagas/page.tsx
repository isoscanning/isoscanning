"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Briefcase,
    MapPin,
    Clock,
    DollarSign,
    Search,
    Filter,
    Sparkles,
    CheckCircle2,
    ArrowRight,
    Calendar,
    X,
} from "lucide-react";
import { fetchJobOffers, fetchSpecialties, type JobOffer, type Specialty } from "@/lib/data-service";
import Link from "next/link";
import { ScrollReveal } from "@/components/scroll-reveal";
import { CountUp } from "@/components/typing-text";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const TIPOS_TRABALHO = [
    { value: "all", label: "Todos" },
    { value: "freelance", label: "Freelance" },
    { value: "full_time", label: "Tempo Integral" },
    { value: "part_time", label: "Meio Período" },
    { value: "project", label: "Por Projeto" },
];

const ESTADOS = [
    "Todos", "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export default function VagasPublicasPage() {
    const [vagas, setVagas] = useState<JobOffer[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Todas");
    const [selectedJobType, setSelectedJobType] = useState("all");
    const [selectedState, setSelectedState] = useState("Todos");
    const [selectedCity, setSelectedCity] = useState("");

    useEffect(() => {
        const loadData = async () => {
            try {
                const [vagasData, specialtiesData] = await Promise.all([
                    fetchJobOffers(),
                    fetchSpecialties()
                ]);
                setVagas(vagasData);
                setSpecialties(specialtiesData);
            } catch (error) {
                console.error("Erro ao buscar dados:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const filteredVagas = vagas.filter((vaga) => {
        const matchesSearch =
            searchTerm === "" ||
            vaga.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vaga.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vaga.employerName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = selectedCategory === "Todas" || vaga.category === selectedCategory;
        const matchesJobType = selectedJobType === "all" || vaga.jobType === selectedJobType;
        const matchesState = selectedState === "Todos" || vaga.state === selectedState;
        const matchesCity = selectedCity === "" || vaga.city?.toLowerCase().includes(selectedCity.toLowerCase());

        return matchesSearch && matchesCategory && matchesJobType && matchesState && matchesCity;
    });

    const clearFilters = () => {
        setSearchTerm("");
        setSelectedCategory("Todas");
        setSelectedJobType("all");
        setSelectedState("Todos");
        setSelectedCity("");
    };

    const hasActiveFilters = selectedCategory !== "Todas" || selectedJobType !== "all" || selectedState !== "Todos" || selectedCity !== "";

    const getJobTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            freelance: "Freelance",
            full_time: "Tempo Integral",
            part_time: "Meio Período",
            project: "Por Projeto",
        };
        return types[type] || type;
    };

    const getJobTypeColor = (type: string) => {
        switch (type) {
            case "freelance": return "bg-blue-500";
            case "full_time": return "bg-green-500";
            case "part_time": return "bg-orange-500";
            case "project": return "bg-purple-500";
            default: return "bg-gray-500";
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative py-20 md:py-28 overflow-hidden">
                    {/* Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-cyan-50 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-cyan-950/30" />

                    {/* Animated gradient orbs */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-400/20 dark:bg-cyan-500/10 rounded-full blur-3xl" />
                    </div>

                    <div className="container mx-auto px-4 max-w-5xl relative z-10">
                        <ScrollReveal>
                            <div className="text-center mb-12">
                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-sm font-medium mb-6">
                                    <Briefcase className="h-4 w-4" />
                                    Oportunidades no Audiovisual
                                </span>

                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
                                    <span className="text-foreground">Encontre o </span>
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 dark:from-blue-400 dark:via-indigo-400 dark:to-cyan-400">
                                        job perfeito
                                    </span>
                                    <br />
                                    <span className="text-foreground">para sua carreira</span>
                                </h1>

                                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                                    Conecte-se com as melhores produções e empresas do mercado.
                                    Freelances, projetos e vagas fixas em um só lugar.
                                </p>
                            </div>
                        </ScrollReveal>

                        {/* Search Bar */}
                        <ScrollReveal delay={0.2}>
                            <div className="bg-background/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-primary/10 border-2 p-4">
                                <div className="flex flex-col md:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar vagas... (ex: Fotógrafo, Editor de Vídeo)"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-12 h-12 text-base rounded-xl border-2"
                                        />
                                    </div>
                                    <Button
                                        variant={showFilters ? "default" : "outline"}
                                        onClick={() => setShowFilters(!showFilters)}
                                        className="h-12 px-6 rounded-xl"
                                    >
                                        <Filter className="h-4 w-4 mr-2" />
                                        Filtros
                                        {hasActiveFilters && (
                                            <span className="ml-2 w-2 h-2 bg-primary rounded-full" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </ScrollReveal>

                        {/* Quick Stats */}
                        <ScrollReveal delay={0.4}>
                            <div className="flex flex-wrap justify-center gap-8 mt-10 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-yellow-500" />
                                    <span>Novas oportunidades todo dia</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <span>Empresas Verificadas</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Briefcase className="h-4 w-4 text-blue-500" />
                                    <span><CountUp end={150} duration={1.5} />+ Vagas Ativas</span>
                                </div>
                            </div>
                        </ScrollReveal>
                    </div>
                </section>

                {/* Filters Panel */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden border-b bg-muted/30"
                        >
                            <div className="container mx-auto max-w-7xl px-4 py-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Categoria</Label>
                                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Todas">Todas</SelectItem>
                                                {specialties.map((spec) => (
                                                    <SelectItem key={spec.id} value={spec.name}>{spec.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tipo de Trabalho</Label>
                                        <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {TIPOS_TRABALHO.map((tipo) => (
                                                    <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estado</Label>
                                        <Select value={selectedState} onValueChange={setSelectedState}>
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ESTADOS.map((estado) => (
                                                    <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cidade</Label>
                                        <Input
                                            placeholder="Digite a cidade"
                                            value={selectedCity}
                                            onChange={(e) => setSelectedCity(e.target.value)}
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>

                                {hasActiveFilters && (
                                    <div className="flex justify-end mt-4">
                                        <Button variant="ghost" onClick={clearFilters} size="sm" className="text-muted-foreground">
                                            <X className="h-4 w-4 mr-2" />
                                            Limpar filtros
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Results Section */}
                <section className="py-12 px-4">
                    <div className="container mx-auto max-w-7xl">
                        {/* Results Header */}
                        <ScrollReveal>
                            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                                        Vagas Disponíveis
                                    </h2>
                                    <p className="text-muted-foreground">
                                        {loading ? "Carregando..." : `${filteredVagas.length} oportunidades encontradas`}
                                    </p>
                                </div>

                                {/* Active Filters Pills */}
                                {hasActiveFilters && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {selectedCategory !== "Todas" && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium">
                                                {selectedCategory}
                                                <button onClick={() => setSelectedCategory("Todas")} className="ml-1 hover:bg-blue-500/20 rounded-full p-0.5">×</button>
                                            </span>
                                        )}
                                        {selectedJobType !== "all" && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-sm font-medium">
                                                {getJobTypeLabel(selectedJobType)}
                                                <button onClick={() => setSelectedJobType("all")} className="ml-1 hover:bg-indigo-500/20 rounded-full p-0.5">×</button>
                                            </span>
                                        )}
                                        {selectedState !== "Todos" && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-full text-sm font-medium">
                                                <MapPin className="h-3.5 w-3.5" />
                                                {selectedState}
                                                <button onClick={() => setSelectedState("Todos")} className="ml-1 hover:bg-cyan-500/20 rounded-full p-0.5">×</button>
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
                                        <CardContent className="p-6 space-y-4">
                                            <div className="h-6 bg-muted rounded w-3/4" />
                                            <div className="h-4 bg-muted rounded w-1/2" />
                                            <div className="h-20 bg-muted rounded w-full" />
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : filteredVagas.length === 0 ? (
                            /* Empty State */
                            <ScrollReveal>
                                <div className="text-center py-20">
                                    <div className="h-24 w-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                                        <Briefcase className="h-10 w-10 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Nenhuma vaga encontrada</h3>
                                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                        Não encontramos vagas com os filtros selecionados.
                                        Tente ajustar sua busca.
                                    </p>
                                    <Button variant="outline" onClick={clearFilters} className="rounded-full">
                                        Limpar Filtros
                                    </Button>
                                </div>
                            </ScrollReveal>
                        ) : (
                            /* Job Cards Grid */
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredVagas.map((vaga, index) => (
                                    <motion.div
                                        key={vaga.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4, delay: index * 0.1 }}
                                    >
                                        <Card className="group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-2 hover:border-primary/30 overflow-hidden bg-card h-full flex flex-col">
                                            <CardContent className="p-6 flex flex-col flex-1">
                                                <div className="flex justify-between items-start mb-4">
                                                    <Badge variant="secondary" className="rounded-full">
                                                        {vaga.category}
                                                    </Badge>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getJobTypeColor(vaga.jobType)}`}>
                                                        {getJobTypeLabel(vaga.jobType)}
                                                    </span>
                                                </div>

                                                <div className="mb-4">
                                                    <h3 className="font-bold text-xl text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                                        {vaga.title}
                                                    </h3>
                                                    <p className="text-sm font-medium text-primary">
                                                        {vaga.employerName}
                                                    </p>
                                                </div>

                                                <div className="space-y-3 text-sm text-muted-foreground mb-6 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 text-muted-foreground/70" />
                                                        <span>
                                                            {vaga.locationType === "remote"
                                                                ? "Remoto"
                                                                : `${vaga.city || "Cidade não informada"}${vaga.state ? `, ${vaga.state}` : ""}`}
                                                        </span>
                                                    </div>

                                                    {(vaga.budgetMin !== null && vaga.budgetMin !== undefined) ||
                                                        (vaga.budgetMax !== null && vaga.budgetMax !== undefined) ? (
                                                        <div className="flex items-center gap-2">
                                                            <DollarSign className="h-4 w-4 text-muted-foreground/70" />
                                                            <span>
                                                                {vaga.budgetMin !== null && vaga.budgetMin !== undefined && `A partir de R$ ${vaga.budgetMin}`}
                                                                {!vaga.budgetMin && vaga.budgetMax !== null && vaga.budgetMax !== undefined && `Até R$ ${vaga.budgetMax}`}
                                                            </span>
                                                        </div>
                                                    ) : null}

                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4 text-muted-foreground/70" />
                                                        <span>Publicado em {new Date(vaga.createdAt).toLocaleDateString()}</span>
                                                    </div>

                                                    {vaga.startDate && (
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-muted-foreground/70" />
                                                            <span>
                                                                Início: {new Date(vaga.startDate).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" asChild>
                                                    <Link href={`/vagas/${vaga.id}`}>
                                                        Ver Detalhes
                                                        <ArrowRight className="ml-2 h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 dark:from-blue-700 dark:via-indigo-700 dark:to-cyan-700">
                    <div className="container mx-auto px-4">
                        <ScrollReveal>
                            <div className="max-w-3xl mx-auto text-center text-white">
                                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                                    Precisa contratar um profissional?
                                </h2>
                                <p className="text-lg text-white/90 mb-8">
                                    Publique sua vaga gratuitamente e encontre os melhores talentos
                                    para o seu projeto audiovisual.
                                </p>
                                <Link href="/dashboard/vagas/nova">
                                    <Button
                                        size="lg"
                                        variant="secondary"
                                        className="h-14 px-10 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300"
                                    >
                                        Publicar Vaga Agora
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
