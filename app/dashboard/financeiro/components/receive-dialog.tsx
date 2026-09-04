"use client";

import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { updateFinancialRecord, type FinancialRecord, type FinancialRecordPatch } from "@/lib/finances-service";
import { formatBRL, todayLocalIso } from "@/lib/finances/money";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { NFSE_NACIONAL_URL, errorMessage } from "./labels";

interface ReceiveDialogProps {
  record: FinancialRecord | null;
  onClose: () => void;
  onConfirmed: (record: FinancialRecord) => void;
}

/**
 * Confirmar recebimento (ou pagamento de despesa). Se o lançamento exige nota e
 * ela ainda não foi emitida, pergunta na hora e registra o número — B12.
 */
export function ReceiveDialog({ record, onClose, onConfirmed }: ReceiveDialogProps) {
  const { toast } = useToast();
  const [receivedAt, setReceivedAt] = useState(todayLocalIso());
  const [issueNf, setIssueNf] = useState(false);
  const [nfNumber, setNfNumber] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setReceivedAt(todayLocalIso());
      setIssueNf(false);
      setNfNumber("");
    }
  }, [record]);

  if (!record) return null;
  const isExpense = record.type === "expense";
  const asksNf = !isExpense && record.requiresNf && record.nfStatus === "pending";

  const confirm = async () => {
    setSaving(true);
    try {
      const patch: FinancialRecordPatch = { status: "received", receivedAt: receivedAt || todayLocalIso() };
      if (asksNf && issueNf) {
        patch.nfStatus = "issued";
        patch.nfNumber = nfNumber.trim() || null;
        patch.nfIssuedAt = todayLocalIso();
      }
      const saved = await updateFinancialRecord(record.id, patch);
      onConfirmed(saved);
      onClose();
    } catch (error) {
      toast({ variant: "destructive", title: "Não foi possível confirmar", description: errorMessage(error, "Tente novamente.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!record} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{isExpense ? "Confirmar pagamento" : "Confirmar recebimento"}</DialogTitle>
          <DialogDescription>
            {record.title} · <span className="font-semibold text-foreground">{formatBRL(record.amount)}</span>
            {record.clientName ? ` · ${record.clientName}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="receivedAt">{isExpense ? "Pago em" : "Recebido em"}</Label>
            <Input id="receivedAt" type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
          </div>

          {asksNf && (
            <div className="rounded-xl border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-base font-medium">Emitir a nota agora?</Label>
                  <p className="text-sm text-muted-foreground">Este cliente exige NF. Registre o número para não esquecer.</p>
                </div>
                <Switch checked={issueNf} onCheckedChange={setIssueNf} />
              </div>
              {issueNf && (
                <div className="space-y-2 animate-in fade-in">
                  <Label htmlFor="nfNumber">Número da nota</Label>
                  <Input id="nfNumber" maxLength={60} placeholder="Ex: 2026/000142" value={nfNumber} onChange={(e) => setNfNumber(e.target.value)} />
                  <a href={NFSE_NACIONAL_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir o emissor NFS-e nacional
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={confirm} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            {isExpense ? "Marcar como pago" : "Marcar como recebido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
