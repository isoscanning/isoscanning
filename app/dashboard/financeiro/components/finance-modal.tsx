"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FinancialRecord, createFinancialRecord, updateFinancialRecord } from "@/lib/finances-service";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface FinanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (record: FinancialRecord) => void;
    initialData?: FinancialRecord | null;
}

export function FinanceModal({ isOpen, onClose, onSave, initialData }: FinanceModalProps) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        amount: "",
        date: new Date().toISOString().split('T')[0],
        source: "external" as "internal" | "external",
        status: "received" as "pending" | "received" | "cancelled",
        requiresNf: false,
        nfStatus: "not_applicable" as "not_applicable" | "pending" | "issued",
        description: "",
        nfDetails: ""
    });

    useEffect(() => {
        if (initialData && isOpen) {
            setFormData({
                title: initialData.title,
                amount: initialData.amount.toString(),
                date: new Date(initialData.date).toISOString().split('T')[0],
                source: initialData.source,
                status: initialData.status,
                requiresNf: initialData.requiresNf,
                nfStatus: initialData.nfStatus,
                description: initialData.description || "",
                nfDetails: initialData.nfDetails || ""
            });
        } else if (isOpen) {
            setFormData({
                title: "",
                amount: "",
                date: new Date().toISOString().split('T')[0],
                source: "external",
                status: "received",
                requiresNf: false,
                nfStatus: "not_applicable",
                description: "",
                nfDetails: ""
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.title || !formData.amount || !formData.date) {
            toast({ variant: "destructive", title: "Erro", description: "Preencha os campos obrigatórios (Título, Valor e Data)." });
            return;
        }

        const amountNum = parseFloat(formData.amount.replace(',', '.'));
        if (isNaN(amountNum)) {
            toast({ variant: "destructive", title: "Erro", description: "Valor financeiro inválido." });
            return;
        }

        const payload = {
            ...formData,
            amount: amountNum,
            date: new Date(formData.date).toISOString()
        };

        // If NF is not required, ensure nfStatus is not_applicable
        if (!payload.requiresNf) {
            payload.nfStatus = "not_applicable";
        }

        setIsSaving(true);
        try {
            let savedRecord;
            if (initialData?.id) {
                savedRecord = await updateFinancialRecord(initialData.id, payload);
                toast({ title: "Sucesso", description: "Lançamento atualizado com sucesso!" });
            } else {
                savedRecord = await createFinancialRecord(payload);
                toast({ title: "Sucesso", description: "Novo lançamento salvo com sucesso!" });
            }
            onSave(savedRecord);
            onClose();
        } catch (error) {
            console.error("Erro ao salvar lançamento:", error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar o lançamento." });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Editar Lançamento" : "Novo Lançamento Financeiro"}</DialogTitle>
                    <DialogDescription>
                        Insira os detalhes do trabalho ou orçamento faturado.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-4">
                    <form id="finance-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Título do Serviço <span className="text-red-500">*</span></Label>
                                <Input 
                                    id="title" 
                                    placeholder="Ex: Ensaio Corporativo, Cobertura Casamento..." 
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                    <Label htmlFor="amount">Valor (R$) <span className="text-red-500">*</span></Label>
                                    <Input 
                                        id="amount" 
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00" 
                                        value={formData.amount}
                                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="date">Data <span className="text-red-500">*</span></Label>
                                    <Input 
                                        id="date" 
                                        type="date" 
                                        value={formData.date}
                                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Origem do Trabalho</Label>
                                <Select 
                                    value={formData.source} 
                                    onValueChange={(val: any) => setFormData({...formData, source: val})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione a origem" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="external">Externo (Por Fora)</SelectItem>
                                        <SelectItem value="internal">ISOSCANNING (Plataforma)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Status de Recebimento</Label>
                                <Select 
                                    value={formData.status} 
                                    onValueChange={(val: any) => setFormData({...formData, status: val})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="received">Recebido / Pago</SelectItem>
                                        <SelectItem value="pending">Pendente (A Receber)</SelectItem>
                                        <SelectItem value="cancelled">Cancelado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição / Obs Gerais (Opcional)</Label>
                            <Textarea 
                                id="description" 
                                placeholder="Algum detalhe do job ou cliente?"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                        </div>

                        <div className="bg-muted/50 p-4 rounded-xl border space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base font-medium">Exige emissão de Nota Fiscal?</Label>
                                    <p className="text-sm text-muted-foreground">O cliente informou CNPJ ou solicitou nota?</p>
                                </div>
                                <Switch 
                                    checked={formData.requiresNf} 
                                    onCheckedChange={(checked) => {
                                        setFormData({
                                            ...formData, 
                                            requiresNf: checked,
                                            nfStatus: checked ? "pending" : "not_applicable"
                                        })
                                    }} 
                                />
                            </div>

                            {formData.requiresNf && (
                                <div className="animate-in fade-in slide-in-from-top-2 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="space-y-2">
                                        <Label>Status da Nota Fiscal</Label>
                                        <Select 
                                            value={formData.nfStatus} 
                                            onValueChange={(val: any) => setFormData({...formData, nfStatus: val})}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Status da NFe" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">Pendente (A Emitir)</SelectItem>
                                                <SelectItem value="issued">Emitida / Enviada</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nfDetails">Detalhes / Dados da NF (CNPJ, etc)</Label>
                                        <Input 
                                            id="nfDetails" 
                                            placeholder="Informações adicionais para faturamento" 
                                            value={formData.nfDetails}
                                            onChange={(e) => setFormData({...formData, nfDetails: e.target.value})}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                <DialogFooter className="border-t pt-4">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                    <Button type="submit" form="finance-form" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {initialData ? 'Atualizar Lançamento' : 'Salvar Lançamento'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
