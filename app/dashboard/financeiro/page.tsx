"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, DollarSign, WalletCards, AlertCircle, Calendar, Pencil, Trash2 } from "lucide-react";
import { fetchFinancialRecords, fetchFinancialSummary, fetchAnnualSummary, deleteFinancialRecord, FinancialRecord, FinancialSummary, AnnualSummary } from "@/lib/finances-service";
import { useToast } from "@/components/ui/use-toast";
import { ScrollReveal } from "@/components/scroll-reveal";
import { FinanceModal } from "./components/finance-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FinancesDashboardPage() {
    const router = useRouter();
    const { userProfile, loading } = useAuth();
    const { toast } = useToast();
    
    const [records, setRecords] = useState<FinancialRecord[]>([]);
    const [summary, setSummary] = useState<FinancialSummary | null>(null);
    const [annualSummary, setAnnualSummary] = useState<AnnualSummary | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [taxRegime, setTaxRegime] = useState<'MEI' | 'SIMPLES'>('MEI');
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null);
    
    // Default to current month/year
    const currentDate = new Date();
    const [month, setMonth] = useState(currentDate.getMonth() + 1);
    const [year, setYear] = useState(currentDate.getFullYear());

    const loadData = useCallback(async () => {
        if (!userProfile) return;
        setIsLoadingData(true);
        try {
            const [summaryData, annualData, recordsData] = await Promise.all([
                fetchFinancialSummary(month, year),
                fetchAnnualSummary(year),
                fetchFinancialRecords({ month, year })
            ]);
            setSummary(summaryData);
            setAnnualSummary(annualData);
            setRecords(recordsData);
        } catch (error) {
            console.error("Erro ao carregar dados financeiros:", error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os dados." });
        } finally {
            setIsLoadingData(false);
        }
    }, [userProfile, month, year, toast]);

    useEffect(() => {
        if (!loading && !userProfile) {
            router.push("/login");
        } else if (userProfile) {
            loadData();
        }
    }, [userProfile, loading, router, loadData]);

    const handlePrint = () => {
        window.print();
    };

    const handleOpenNewModal = () => {
        setSelectedRecord(null);
        setIsModalOpen(true);
    };

    const handleEditRecord = (record: FinancialRecord) => {
        setSelectedRecord(record);
        setIsModalOpen(true);
    };

    const handleSaveRecord = (savedRecord: FinancialRecord) => {
        // Reload data to ensure summary updates correctly
        loadData();
    };

    const handleDeleteRecord = async (id: string) => {
        if (!window.confirm("Certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.")) {
            return;
        }
        try {
            await deleteFinancialRecord(id);
            toast({
                title: "Lançamento excluído",
                description: "O registro foi apagado com sucesso.",
            });
            loadData();
        } catch (error) {
            console.error("Erro ao excluir lançamento:", error);
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Não foi possível excluir o lançamento.",
            });
        }
    };

    if (loading || isLoadingData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!userProfile) return null;

    return (
        <div className="min-h-screen flex flex-col bg-background/50">
            <Header />

            <main className="flex-1 py-12 px-4 print:py-0 print:px-0">
                <div className="container mx-auto max-w-6xl space-y-8 print:max-w-full">
                    {/* Header Controls */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-500">
                                Gestão Financeira
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Acompanhe seu fluxo de caixa e obrigações fiscais.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handlePrint} className="border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-500">
                                <FileText className="mr-2 h-4 w-4" /> Relatório PDF
                            </Button>
                            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleOpenNewModal}>
                                <Plus className="mr-2 h-4 w-4" /> Novo Lançamento
                            </Button>
                        </div>
                    </div>

                    {/* Annual Summary Highlights */}
                    {annualSummary && (
                        <div className="space-y-4 print:hidden">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-sm font-medium text-muted-foreground">Regime Tributário:</span>
                                <div className="flex bg-muted/50 p-1 rounded-full border border-muted">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setTaxRegime('MEI')}
                                        className={`rounded-full h-8 px-5 text-sm font-medium transition-all ${taxRegime === 'MEI' ? 'bg-emerald-600 text-white shadow-md hover:bg-emerald-700' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        MEI
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setTaxRegime('SIMPLES')}
                                        className={`rounded-full h-8 px-5 text-sm font-medium transition-all ${taxRegime === 'SIMPLES' ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        Simples Nacional
                                    </Button>
                                </div>
                            </div>
                            
                            {taxRegime === 'MEI' ? (
                                <ScrollReveal delay={0.05}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-500/20 rounded-2xl p-6 shadow-lg shadow-emerald-500/5">
                                        <div>
                                            <p className="text-sm font-medium text-emerald-400 mb-1">Faturamento Total Bruto ({year})</p>
                                            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(annualSummary.totalAnnualInvoiced)}
                                            </h2>
                                            <p className="text-xs text-muted-foreground mt-2">Soma absoluta de todos os valores registrados no ano.</p>
                                        </div>
                                        <div className="border-t md:border-t-0 md:border-l border-emerald-500/20 pt-4 md:pt-0 md:pl-6">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-sm font-medium text-teal-400 mb-1">Saldo Restante Teto MEI</p>
                                                    <h2 className="text-3xl font-bold text-white">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(annualSummary.meiLimitRemaining)}
                                                    </h2>
                                                </div>
                                                <div className="text-right flex flex-col items-end">
                                                    <p className="text-xs text-muted-foreground mb-1">Limite Anual</p>
                                                    <span className="bg-emerald-500/10 text-emerald-500 text-xs px-2 py-1 rounded-full font-medium border border-emerald-500/20">
                                                        R$ 81.000,00
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-black/40 rounded-full h-2.5 mt-5 overflow-hidden border border-white/5">
                                                <div 
                                                    className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-1000 ease-out relative" 
                                                    style={{ width: `${Math.min(100, (annualSummary.meiNfIssuedAmount / 81000) * 100)}%` }}
                                                >
                                                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse"></div>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center mt-2">
                                                <p className="text-xs font-medium text-emerald-500/80">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(annualSummary.meiNfIssuedAmount)} contabilizado
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {((annualSummary.meiNfIssuedAmount / 81000) * 100).toFixed(1)}% atingido
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </ScrollReveal>
                            ) : (
                                <ScrollReveal delay={0.05}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gradient-to-br from-indigo-900/20 to-blue-900/20 border border-indigo-500/30 rounded-2xl p-6 shadow-lg shadow-indigo-500/5">
                                        <div>
                                            <p className="text-sm font-medium text-indigo-400 mb-1">Notas Emitidas (Simples Nacional - {year})</p>
                                            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(annualSummary.meiNfIssuedAmount)}
                                            </h2>
                                            <p className="text-xs text-indigo-200/60 mt-2">Valor contabilizado como receita para tributação (NFs emitidas).</p>
                                            <div className="mt-4 pt-4 border-t border-indigo-500/20">
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Faturamento Bruto Total do Ano</p>
                                                <p className="text-sm font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(annualSummary.totalAnnualInvoiced)}</p>
                                            </div>
                                        </div>
                                        <div className="border-t md:border-t-0 md:border-l border-indigo-500/20 pt-4 md:pt-0 md:pl-6">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-sm font-medium text-blue-400 mb-1">Saldo Restante Teto Simples</p>
                                                    <h2 className="text-3xl font-bold text-white">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(4800000 - annualSummary.meiNfIssuedAmount)}
                                                    </h2>
                                                </div>
                                                <div className="text-right flex flex-col items-end">
                                                    <p className="text-xs text-indigo-200/60 mb-1">Teto Anual Global</p>
                                                    <span className="bg-indigo-500/10 text-indigo-400 text-xs px-2 py-1 rounded-full font-medium border border-indigo-500/20">
                                                        R$ 4.800.000,00
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-black/40 rounded-full h-2.5 mt-5 overflow-hidden border border-white/5">
                                                <div 
                                                    className="bg-gradient-to-r from-blue-500 to-indigo-400 h-full rounded-full transition-all duration-1000 ease-out relative" 
                                                    style={{ width: `${Math.min(100, (annualSummary.meiNfIssuedAmount / 4800000) * 100)}%` }}
                                                >
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center mt-3">
                                                <div className="flex flex-col">
                                                    <p className="text-[11px] font-medium text-indigo-400 uppercase tracking-widest mb-0.5">
                                                        Imposto Estimado (Anexo III - 6%)
                                                    </p>
                                                    <p className="text-lg font-bold text-rose-400 flex items-center gap-1">
                                                        <DollarSign className="w-4 h-4" />
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(annualSummary.meiNfIssuedAmount * 0.06)}
                                                    </p>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-4">
                                                    {((annualSummary.meiNfIssuedAmount / 4800000) * 100).toFixed(2)}% atingido
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </ScrollReveal>
                            )}
                        </div>
                    )}

                    {/* KPI Cards */}
                    {summary && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <ScrollReveal delay={0.1}>
                                <Card className="border-emerald-500/10 hover:border-emerald-500/30 transition-all bg-card/80 backdrop-blur">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium">Receita no Mês</CardTitle>
                                        <DollarSign className="h-4 w-4 text-emerald-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.monthlyRevenue)}
                                        </div>
                                    </CardContent>
                                </Card>
                            </ScrollReveal>

                            <ScrollReveal delay={0.2}>
                                <Card className="border-amber-500/10 hover:border-amber-500/30 transition-all bg-card/80 backdrop-blur">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium">A Receber</CardTitle>
                                        <WalletCards className="h-4 w-4 text-amber-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.pendingToReceive)}
                                        </div>
                                    </CardContent>
                                </Card>
                            </ScrollReveal>
                            
                            <ScrollReveal delay={0.3}>
                                <Card className="border-blue-500/10 hover:border-blue-500/30 transition-all bg-card/80 backdrop-blur">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
                                        <WalletCards className="h-4 w-4 text-blue-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.totalInvoiced)}
                                        </div>
                                    </CardContent>
                                </Card>
                            </ScrollReveal>

                            <ScrollReveal delay={0.4}>
                                <Card className="border-rose-500/10 hover:border-rose-500/30 transition-all bg-card/80 backdrop-blur">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-sm font-medium">NFs Pendentes</CardTitle>
                                        <AlertCircle className="h-4 w-4 text-rose-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                                            {summary.pendingNfCount}
                                        </div>
                                    </CardContent>
                                </Card>
                            </ScrollReveal>
                        </div>
                    )}

                    {/* Empty State / List */}
                    <Card className="print:shadow-none print:border-none">
                        <CardHeader className="print:px-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 mb-4">
                            <div>
                                <CardTitle>Lançamentos</CardTitle>
                                <CardDescription>
                                    Listagem completa de faturamentos e notas fiscais para o período.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2 print:hidden z-10 relative">
                                <Select value={month.toString()} onValueChange={(val) => setMonth(parseInt(val))}>
                                    <SelectTrigger className="w-[140px] bg-background">
                                        <SelectValue placeholder="Mês" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Janeiro</SelectItem>
                                        <SelectItem value="2">Fevereiro</SelectItem>
                                        <SelectItem value="3">Março</SelectItem>
                                        <SelectItem value="4">Abril</SelectItem>
                                        <SelectItem value="5">Maio</SelectItem>
                                        <SelectItem value="6">Junho</SelectItem>
                                        <SelectItem value="7">Julho</SelectItem>
                                        <SelectItem value="8">Agosto</SelectItem>
                                        <SelectItem value="9">Setembro</SelectItem>
                                        <SelectItem value="10">Outubro</SelectItem>
                                        <SelectItem value="11">Novembro</SelectItem>
                                        <SelectItem value="12">Dezembro</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={year.toString()} onValueChange={(val) => setYear(parseInt(val))}>
                                    <SelectTrigger className="w-[100px] bg-background">
                                        <SelectValue placeholder="Ano" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={(currentDate.getFullYear() - 1).toString()}>{currentDate.getFullYear() - 1}</SelectItem>
                                        <SelectItem value={currentDate.getFullYear().toString()}>{currentDate.getFullYear()}</SelectItem>
                                        <SelectItem value={(currentDate.getFullYear() + 1).toString()}>{currentDate.getFullYear() + 1}</SelectItem>
                                        <SelectItem value={(currentDate.getFullYear() + 2).toString()}>{currentDate.getFullYear() + 2}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="print:px-0">
                            {records.length === 0 ? (
                                <div className="text-center py-16 border-dashed border-2 rounded-lg border-emerald-500/20">
                                    <div className="bg-emerald-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <DollarSign className="h-10 w-10 text-emerald-500" />
                                    </div>
                                    <p className="text-lg font-medium">Nenhum lançamento encontrado</p>
                                    <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                                        Você não possui registros financeiros para este mês.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-lg">
                                            <tr>
                                                <th className="px-4 py-3">Data</th>
                                                <th className="px-4 py-3">Descrição</th>
                                                <th className="px-4 py-3">Origem</th>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-4 py-3">NFe</th>
                                                <th className="px-4 py-3 text-right">Valor</th>
                                                <th className="px-2 py-3 text-right print:hidden">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {records.map((r) => (
                                                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                                            {r.date ? r.date.split('T')[0].split('-').reverse().join('/') : ''}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium">
                                                        {r.title}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-1 bg-secondary rounded-full text-xs">
                                                            {r.source === 'internal' ? 'ISOSCANNING' : 'Externo'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                                            r.status === 'received' ? 'bg-emerald-500/10 text-emerald-600' : 
                                                            r.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600'
                                                        }`}>
                                                            {r.status === 'received' ? 'Recebido' : r.status === 'pending' ? 'Pendente' : 'Cancelado'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {!r.requiresNf ? (
                                                            <span className="text-muted-foreground text-xs">Não exige</span>
                                                        ) : (
                                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                                r.nfStatus === 'issued' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                                                            }`}>
                                                                {r.nfStatus === 'issued' ? 'Emitida' : 'Pendente'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.amount)}
                                                    </td>
                                                    <td className="px-2 py-3 text-right print:hidden flex items-center justify-end gap-1">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => handleEditRecord(r)}
                                                            title="Editar"
                                                            className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => handleDeleteRecord(r.id)}
                                                            title="Excluir"
                                                            className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="font-bold text-base bg-muted/30">
                                            <tr>
                                                <td colSpan={5} className="px-4 py-3 text-right">Total:</td>
                                                <td className="px-4 py-3 text-right text-emerald-600">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                        records.reduce((acc, curr) => acc + curr.amount, 0)
                                                    )}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </main>

            <Footer />

            <FinanceModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveRecord}
                initialData={selectedRecord}
            />
        </div>
    );
}
