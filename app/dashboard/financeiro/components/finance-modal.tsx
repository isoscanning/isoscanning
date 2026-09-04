"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/ui/currency-input";
import { useToast } from "@/components/ui/use-toast";
import {
  createFinancialRecord,
  deleteNfFile,
  updateFinancialRecord,
  uploadNfFile,
  type FinancialCategory,
  type FinancialRecord,
  type FinancialRecordInput,
  type FinancialRecordType,
  type FinancialSource,
  type FinancialStatus,
  type NfStatus,
} from "@/lib/finances-service";
import { addDaysIso, todayLocalIso } from "@/lib/finances/money";
import { ArrowDownLeft, ArrowUpRight, ExternalLink, FileText, Loader2, Paperclip, Trash2 } from "lucide-react";
import {
  CATEGORY_LABELS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  NFSE_NACIONAL_URL,
  errorMessage,
  statusOptions,
} from "./labels";

export interface FinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (record: FinancialRecord, mode: "created" | "updated") => void;
  /** Editar este lançamento. */
  initialData?: FinancialRecord | null;
  /** Novo lançamento copiando este (data de hoje, pendente, sem nota). */
  duplicateOf?: FinancialRecord | null;
  /** Novo lançamento pré-preenchido (ex.: vindo da calculadora de orçamento). */
  prefill?: Partial<FinancialRecordInput> | null;
  clients: string[];
}

interface FormState {
  type: FinancialRecordType;
  title: string;
  amount: number | null;
  date: string;
  dueDate: string;
  clientName: string;
  category: FinancialCategory | "";
  source: FinancialSource;
  status: FinancialStatus;
  requiresNf: boolean;
  nfStatus: NfStatus;
  nfNumber: string;
  nfIssuedAt: string;
  nfDetails: string;
  description: string;
  recurring: boolean;
}

function emptyForm(): FormState {
  return {
    type: "income",
    title: "",
    amount: null,
    date: todayLocalIso(),
    dueDate: "",
    clientName: "",
    category: "",
    source: "external",
    status: "received",
    requiresNf: false,
    nfStatus: "not_applicable",
    nfNumber: "",
    nfIssuedAt: "",
    nfDetails: "",
    description: "",
    recurring: false,
  };
}

function fromRecord(r: FinancialRecord): FormState {
  return {
    type: r.type,
    title: r.title,
    amount: r.amount,
    date: r.date.slice(0, 10),
    dueDate: r.dueDate ?? "",
    clientName: r.clientName ?? "",
    category: r.category ?? "",
    source: r.source,
    status: r.status,
    requiresNf: r.requiresNf,
    nfStatus: r.nfStatus,
    nfNumber: r.nfNumber ?? "",
    nfIssuedAt: r.nfIssuedAt ?? "",
    nfDetails: r.nfDetails ?? "",
    description: r.description ?? "",
    recurring: r.recurrenceActive,
  };
}

export function FinanceModal({ isOpen, onClose, onSaved, initialData, duplicateOf, prefill, clients }: FinanceModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [nfFileBusy, setNfFileBusy] = useState(false);
  const [hasNfFile, setHasNfFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEdit = !!initialData?.id;

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm(fromRecord(initialData));
      setHasNfFile(initialData.hasNfFile);
      return;
    }
    setHasNfFile(false);
    if (duplicateOf) {
      const copy = fromRecord(duplicateOf);
      setForm({
        ...copy,
        date: todayLocalIso(),
        dueDate: "",
        status: "pending",
        nfStatus: copy.requiresNf ? "pending" : "not_applicable",
        nfNumber: "",
        nfIssuedAt: "",
        recurring: false,
      });
      return;
    }
    const base = emptyForm();
    if (prefill) {
      setForm({
        ...base,
        type: prefill.type ?? base.type,
        title: prefill.title ?? "",
        amount: prefill.amount ?? null,
        clientName: prefill.clientName ?? "",
        status: prefill.status ?? "pending",
        source: prefill.source ?? base.source,
        description: prefill.description ?? "",
        category: (prefill.category as FinancialCategory | undefined) ?? "",
      });
      return;
    }
    setForm(base);
  }, [initialData, duplicateOf, prefill, isOpen]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const categories = form.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const isExpense = form.type === "expense";
  const statuses = useMemo(() => statusOptions(form.type), [form.type]);

  const switchType = (type: FinancialRecordType) => {
    setForm((f) => ({
      ...f,
      type,
      category: "",
      requiresNf: type === "expense" ? false : f.requiresNf,
      nfStatus: type === "expense" ? "not_applicable" : f.nfStatus,
      source: type === "expense" ? "external" : f.source,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({ variant: "destructive", title: "Falta o título", description: "Dê um nome ao lançamento." });
      return;
    }
    if (!form.amount || form.amount <= 0) {
      toast({ variant: "destructive", title: "Valor inválido", description: "Informe um valor maior que zero." });
      return;
    }
    if (!form.date) {
      toast({ variant: "destructive", title: "Falta a data", description: "Informe a data do lançamento." });
      return;
    }

    const payload: FinancialRecordInput = {
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      amount: form.amount,
      date: form.date,
      dueDate: form.dueDate || null,
      clientName: form.clientName.trim() || null,
      category: form.category || null,
      source: form.source,
      status: form.status,
      requiresNf: isExpense ? false : form.requiresNf,
      nfStatus: isExpense || !form.requiresNf ? "not_applicable" : form.nfStatus,
      nfDetails: form.nfDetails.trim() || null,
      nfNumber: form.nfNumber.trim() || null,
      nfIssuedAt: form.nfIssuedAt || null,
      recurring: form.recurring,
    };

    setIsSaving(true);
    try {
      if (isEdit && initialData) {
        const saved = await updateFinancialRecord(initialData.id, payload);
        onSaved(saved, "updated");
      } else {
        const saved = await createFinancialRecord(payload);
        onSaved(saved, "created");
      }
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível salvar",
        description: errorMessage(error, "Tente novamente em instantes."),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNfFile = async (file: File | undefined) => {
    if (!file || !initialData) return;
    setNfFileBusy(true);
    try {
      await uploadNfFile(initialData.id, file);
      setHasNfFile(true);
      toast({ title: "Arquivo da nota anexado" });
    } catch (error) {
      toast({ variant: "destructive", title: "Não foi possível anexar", description: errorMessage(error, "Envie um PDF, JPG ou PNG de até 10 MB.") });
    } finally {
      setNfFileBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveNfFile = async () => {
    if (!initialData) return;
    setNfFileBusy(true);
    try {
      await deleteNfFile(initialData.id);
      setHasNfFile(false);
      toast({ title: "Arquivo removido" });
    } catch (error) {
      toast({ variant: "destructive", title: "Não foi possível remover", description: errorMessage(error, "Tente novamente.") });
    } finally {
      setNfFileBusy(false);
    }
  };

  const title = isEdit ? "Editar lançamento" : duplicateOf ? "Duplicar lançamento" : "Novo lançamento";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isExpense ? "Um gasto do seu negócio." : "Um trabalho, mensalidade ou venda que gera receita."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="finance-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Tipo */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-muted/60">
              <button
                type="button"
                onClick={() => switchType("income")}
                aria-pressed={!isExpense}
                className={`flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${!isExpense ? "bg-background shadow text-emerald-600" : "text-muted-foreground hover:text-foreground"}`}
              >
                <ArrowDownLeft className="h-4 w-4" /> Receita
              </button>
              <button
                type="button"
                onClick={() => switchType("expense")}
                aria-pressed={isExpense}
                className={`flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${isExpense ? "bg-background shadow text-rose-600" : "text-muted-foreground hover:text-foreground"}`}
              >
                <ArrowUpRight className="h-4 w-4" /> Despesa
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">{isExpense ? "Descrição do gasto" : "Título do serviço"} <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  maxLength={120}
                  placeholder={isExpense ? "Ex: Cartão SD 128GB, Gasolina evento…" : "Ex: Ensaio corporativo, Cobertura casamento…"}
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Valor <span className="text-red-500">*</span></Label>
                <CurrencyInput id="amount" value={form.amount} onValueChange={(v) => set("amount", v)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Data <span className="text-red-500">*</span></Label>
                <Input id="date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">{isExpense ? "Fornecedor" : "Cliente"}</Label>
                <Input
                  id="client"
                  list="finance-clients"
                  maxLength={120}
                  placeholder={isExpense ? "Ex: Loja X" : "Ex: Boutique Amélie"}
                  value={form.clientName}
                  onChange={(e) => set("clientName", e.target.value)}
                />
                <datalist id="finance-clients">
                  {clients.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.category || "none"} onValueChange={(v) => set("category", v === "none" ? "" : (v as FinancialCategory))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{isExpense ? "Situação" : "Recebimento"}</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v as FinancialStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isExpense && (
                <div className="space-y-2">
                  <Label>Origem do trabalho</Label>
                  <Select value={form.source} onValueChange={(v) => set("source", v as FinancialSource)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="external">Externo (por fora)</SelectItem>
                      <SelectItem value="internal">Plataforma IsoScanning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.status === "pending" && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="dueDate">Vencimento</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input id="dueDate" type="date" className="w-auto" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
                    {[7, 15, 30].map((d) => (
                      <Button key={d} type="button" variant="outline" size="sm" onClick={() => set("dueDate", addDaysIso(form.date || todayLocalIso(), d))}>
                        +{d} dias
                      </Button>
                    ))}
                    {form.dueDate && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => set("dueDate", "")}>Limpar</Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Passou da data sem confirmar? Aparece como vencido e você recebe um aviso.</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Observações</Label>
              <Textarea
                id="description"
                maxLength={2000}
                placeholder="Detalhes do job, forma de pagamento, combinados…"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={2}
              />
            </div>

            {/* Recorrência */}
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Repetir todo mês</Label>
                <p className="text-sm text-muted-foreground">
                  Mensalidade ou assinatura: o próximo mês entra sozinho como {isExpense ? "a pagar" : "a receber"}.
                </p>
              </div>
              <Switch checked={form.recurring} onCheckedChange={(v) => set("recurring", v)} />
            </div>

            {/* Nota fiscal */}
            {!isExpense && (
              <div className="bg-muted/50 p-4 rounded-xl border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Exige nota fiscal?</Label>
                    <p className="text-sm text-muted-foreground">Cliente com CNPJ ou que pediu nota.</p>
                  </div>
                  <Switch
                    checked={form.requiresNf}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({ ...f, requiresNf: checked, nfStatus: checked ? (f.nfStatus === "issued" ? "issued" : "pending") : "not_applicable" }))
                    }
                  />
                </div>

                {form.requiresNf && (
                  <div className="animate-in fade-in slide-in-from-top-2 pt-4 border-t space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Situação da nota</Label>
                        <Select value={form.nfStatus} onValueChange={(v) => set("nfStatus", v as NfStatus)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">A emitir</SelectItem>
                            <SelectItem value="issued">Emitida</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nfNumber">Número da nota</Label>
                        <Input id="nfNumber" maxLength={60} placeholder="Ex: 2026/000142" value={form.nfNumber} onChange={(e) => set("nfNumber", e.target.value)} />
                      </div>
                      {form.nfStatus === "issued" && (
                        <div className="space-y-2">
                          <Label htmlFor="nfIssuedAt">Emitida em</Label>
                          <Input id="nfIssuedAt" type="date" value={form.nfIssuedAt} onChange={(e) => set("nfIssuedAt", e.target.value)} />
                        </div>
                      )}
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="nfDetails">Dados para faturamento (CNPJ, razão social…)</Label>
                        <Input id="nfDetails" maxLength={500} placeholder="CNPJ 12.345.678/0001-90 — Boutique Amélie LTDA" value={form.nfDetails} onChange={(e) => set("nfDetails", e.target.value)} />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <a href={NFSE_NACIONAL_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-600 hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" /> Emitir no portal NFS-e nacional
                      </a>
                      {isEdit ? (
                        <div className="ml-auto flex items-center gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/pdf,image/jpeg,image/png"
                            className="hidden"
                            onChange={(e) => handleNfFile(e.target.files?.[0])}
                          />
                          {hasNfFile ? (
                            <>
                              <span className="inline-flex items-center gap-1 text-muted-foreground"><FileText className="h-3.5 w-3.5" /> Arquivo anexado</span>
                              <Button type="button" variant="ghost" size="sm" disabled={nfFileBusy} onClick={() => fileInputRef.current?.click()}>Trocar</Button>
                              <Button type="button" variant="ghost" size="sm" className="text-rose-600" disabled={nfFileBusy} onClick={handleRemoveNfFile} aria-label="Remover arquivo da nota"><Trash2 className="h-4 w-4" /></Button>
                            </>
                          ) : (
                            <Button type="button" variant="outline" size="sm" disabled={nfFileBusy} onClick={() => fileInputRef.current?.click()}>
                              {nfFileBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />} Anexar PDF da nota
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="ml-auto text-xs text-muted-foreground">Salve para anexar o PDF da nota.</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button type="submit" form="finance-form" disabled={isSaving} className={isExpense ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Salvar alterações" : "Salvar lançamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
