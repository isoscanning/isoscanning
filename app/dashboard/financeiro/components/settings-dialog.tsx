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
import { updateFinanceSettings, type FinanceLimits, type FinanceSettings, type TaxRegime } from "@/lib/finances-service";
import { formatBRL } from "@/lib/finances/money";
import { Loader2 } from "lucide-react";
import { errorMessage } from "./labels";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: FinanceSettings;
  limits: FinanceLimits;
  onSaved: (settings: FinanceSettings) => void;
}

const REGIMES: Array<{ value: TaxRegime; label: string; hint: string }> = [
  { value: "mei", label: "MEI", hint: "Teto anual de receita bruta, DAS mensal e declaração em maio." },
  { value: "simples", label: "Simples Nacional", hint: "Imposto estimado pela alíquota que você informar." },
  { value: "other", label: "Outro / não sei", hint: "Só o resumo de receitas e despesas, sem cálculo de imposto." },
];

export function SettingsDialog({ open, onOpenChange, settings, limits, onSaved }: SettingsDialogProps) {
  const { toast } = useToast();
  const [regime, setRegime] = useState<TaxRegime>(settings.taxRegime);
  const [simplesRate, setSimplesRate] = useState(String(settings.simplesRate));
  const [meiOpenedAt, setMeiOpenedAt] = useState(settings.meiOpenedAt ?? "");
  const [dasReminder, setDasReminder] = useState(settings.dasReminder);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setRegime(settings.taxRegime);
      setSimplesRate(String(settings.simplesRate));
      setMeiOpenedAt(settings.meiOpenedAt ?? "");
      setDasReminder(settings.dasReminder);
    }
  }, [open, settings]);

  const save = async () => {
    const rate = parseFloat(simplesRate.replace(",", "."));
    if (regime === "simples" && (Number.isNaN(rate) || rate < 0 || rate > 100)) {
      toast({ variant: "destructive", title: "Alíquota inválida", description: "Use um percentual entre 0 e 100." });
      return;
    }
    setSaving(true);
    try {
      const saved = await updateFinanceSettings({
        taxRegime: regime,
        simplesRate: Number.isNaN(rate) ? settings.simplesRate : rate,
        meiOpenedAt: meiOpenedAt || null,
        dasReminder,
      });
      onSaved(saved);
      onOpenChange(false);
      toast({ title: "Configurações salvas" });
    } catch (error) {
      toast({ variant: "destructive", title: "Não foi possível salvar", description: errorMessage(error, "Tente novamente.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Regime e lembretes fiscais</DialogTitle>
          <DialogDescription>Define como o painel anual calcula teto e imposto. Fica salvo na sua conta.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>Regime tributário</Label>
            <div className="grid gap-2">
              {REGIMES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRegime(r.value)}
                  aria-pressed={regime === r.value}
                  className={`text-left rounded-lg border p-3 transition-colors ${regime === r.value ? "border-emerald-500 bg-emerald-500/5" : "hover:bg-muted/60"}`}
                >
                  <p className="font-medium">{r.label}</p>
                  <p className="text-sm text-muted-foreground">{r.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {regime === "mei" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="meiOpenedAt">Abertura do MEI (opcional)</Label>
                <Input id="meiOpenedAt" type="date" value={meiOpenedAt} onChange={(e) => setMeiOpenedAt(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  No ano de abertura o teto é proporcional: {formatBRL(limits.meiLimit / 12)} por mês de atividade.
                </p>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="font-medium">Lembrar do DAS todo mês</Label>
                  <p className="text-sm text-muted-foreground">Aviso nos 5 dias antes do dia {limits.dasDueDay}.</p>
                </div>
                <Switch checked={dasReminder} onCheckedChange={setDasReminder} />
              </div>
            </>
          )}

          {regime === "simples" && (
            <div className="space-y-2">
              <Label htmlFor="simplesRate">Alíquota efetiva (%)</Label>
              <Input id="simplesRate" inputMode="decimal" value={simplesRate} onChange={(e) => setSimplesRate(e.target.value)} className="w-32" />
              <p className="text-xs text-muted-foreground">
                6% é a primeira faixa do Anexo III (até R$ 180 mil em 12 meses). Acima disso, ou no Anexo V pelo Fator R, a alíquota muda: confirme com seu contador.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
