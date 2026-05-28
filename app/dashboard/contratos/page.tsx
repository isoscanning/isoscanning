"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  FileSignature,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  PenLine,
  AlertCircle,
  ChevronRight,
  FileText,
  Upload,
} from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/api-service";

interface Contract {
  id: string;
  title: string;
  clientName: string;
  clientEmail: string;
  status: string;
  source: string;
  contractValue?: number | null;
  serviceStartDate?: string | null;
  createdAt: string;
  parties?: { partyRole: string; signedAt?: string | null }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Rascunho", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", icon: PenLine },
  sent: { label: "Enviado", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: Send },
  partially_signed: { label: "Parcialmente Assinado", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300", icon: Clock },
  fully_signed: { label: "Totalmente Assinado", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
  expired: { label: "Expirado", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", icon: AlertCircle },
};

const SOURCE_LABELS: Record<string, string> = {
  standalone: "Independente",
  proposal: "Proposta",
  quote: "Orçamento",
};

export default function ContratosPage() {
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  useEffect(() => {
    if (!userProfile) return;
    const fetchContracts = async () => {
      setLoadingContracts(true);
      try {
        const params = new URLSearchParams();
        if (filterStatus) params.set("status", filterStatus);
        const res = await apiClient.get(`/contracts?${params.toString()}`);
        setContracts(res.data.data ?? []);
        setTotal(res.data.total ?? 0);
      } catch (e) {
        console.error("Erro ao carregar contratos", e);
      } finally {
        setLoadingContracts(false);
      }
    };
    fetchContracts();
  }, [userProfile, filterStatus]);

  const filtered = contracts.filter((c) =>
    !searchTerm ||
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.clientEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statsCount = {
    draft: contracts.filter((c) => c.status === "draft").length,
    sent: contracts.filter((c) => c.status === "sent" || c.status === "partially_signed").length,
    signed: contracts.filter((c) => c.status === "fully_signed").length,
    total: contracts.length,
  };

  if (loading || !userProfile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-12 px-4">
          <div className="container mx-auto max-w-6xl space-y-6">
            <Skeleton className="h-12 w-64" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background/50">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl space-y-8">

          {/* Header */}
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center justify-center">
                    <FileSignature className="h-5 w-5" />
                  </div>
                  Gestão de Contratos
                </h1>
                <p className="text-muted-foreground mt-1">
                  Crie, envie e acompanhe contratos digitais com assinatura eletrônica.
                </p>
              </div>
              <Link href="/dashboard/contratos/novo">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Contrato
                </Button>
              </Link>
            </div>
          </ScrollReveal>

          {/* Stats */}
          <ScrollReveal delay={0.1}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total", value: statsCount.total, color: "text-foreground" },
                { label: "Rascunhos", value: statsCount.draft, color: "text-gray-500" },
                { label: "Aguardando", value: statsCount.sent, color: "text-blue-500" },
                { label: "Assinados", value: statsCount.signed, color: "text-green-500" },
              ].map((stat) => (
                <Card key={stat.label} className="border-primary/10">
                  <CardContent className="pt-4 pb-4">
                    <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollReveal>

          {/* Filters */}
          <ScrollReveal delay={0.2}>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por título, cliente ou e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="">Todos os status</option>
                {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </ScrollReveal>

          {/* Contracts List */}
          <ScrollReveal delay={0.3}>
            {loadingContracts ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto">
                  <FileSignature className="h-8 w-8 text-indigo-500" />
                </div>
                <h3 className="text-xl font-semibold">
                  {contracts.length === 0 ? "Nenhum contrato ainda" : "Nenhum resultado encontrado"}
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  {contracts.length === 0
                    ? "Crie seu primeiro contrato digital e envie para assinatura em minutos."
                    : "Tente ajustar os filtros ou o termo de busca."}
                </p>
                {contracts.length === 0 && (
                  <Link href="/dashboard/contratos/novo">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 mt-2">
                      <Plus className="h-4 w-4" /> Criar Primeiro Contrato
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((contract) => {
                  const statusCfg = STATUS_CONFIG[contract.status] ?? STATUS_CONFIG.draft;
                  const StatusIcon = statusCfg.icon;
                  const signedCount = contract.parties?.filter((p) => p.signedAt).length ?? 0;
                  const totalParties = contract.parties?.length ?? 2;

                  return (
                    <Link key={contract.id} href={`/dashboard/contratos/${contract.id}`}>
                      <div className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:border-indigo-500/40 hover:shadow-md transition-all duration-200 cursor-pointer group">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-sm truncate group-hover:text-indigo-600 transition-colors">
                              {contract.title}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {SOURCE_LABELS[contract.source] ?? contract.source}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {contract.clientName} · {contract.clientEmail}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Criado em {new Date(contract.createdAt).toLocaleDateString("pt-BR")}
                            {contract.contractValue != null && ` · R$ ${contract.contractValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {contract.status !== "draft" && (
                            <div className="hidden sm:flex flex-col items-center text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{signedCount}/{totalParties}</span>
                              <span>assinat.</span>
                            </div>
                          )}
                          <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${statusCfg.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusCfg.label}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </ScrollReveal>
        </div>
      </main>
      <Footer />
    </div>
  );
}
