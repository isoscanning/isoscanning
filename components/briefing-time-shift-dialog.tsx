"use client";

// Time Shift do Briefing Pro: empurra/adianta todos os horários do cronograma
// (ou só de uma seção) em N minutos — o socorro clássico do "o evento atrasou".

import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Timer } from "lucide-react";
import { toast } from "sonner";
import { briefingProService } from "@/lib/briefing-pro-service";

const QUICK_SHIFTS = [-30, -15, -5, 5, 15, 30];

export function BriefingTimeShiftDialog({
  briefingId, sections, onClose, onApplied,
}: {
  briefingId: string;
  sections: Array<{ id: string; title: string }>;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [minutes, setMinutes] = useState<string>("15");
  const [scope, setScope] = useState<string>("all");
  const [applying, setApplying] = useState(false);

  async function apply(delta?: number) {
    const value = delta ?? parseInt(minutes, 10);
    if (!value || Number.isNaN(value)) {
      toast.error("Informe quantos minutos deslocar");
      return;
    }
    if (Math.abs(value) > 720) {
      toast.error("O deslocamento máximo é de 12 horas");
      return;
    }
    setApplying(true);
    try {
      const { updated } = await briefingProService.timeShift(
        briefingId,
        value,
        scope === "all" ? undefined : [scope]
      );
      toast.success(
        updated > 0
          ? `${updated} ${updated === 1 ? "horário ajustado" : "horários ajustados"} em ${value > 0 ? "+" : ""}${value} min`
          : "Nenhum item com horário no escopo selecionado"
      );
      onApplied();
    } catch {
      toast.error("Erro ao ajustar os horários");
      setApplying(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-blue-500" />
            Ajustar horários
          </DialogTitle>
          <DialogDescription>
            O evento atrasou ou adiantou? Desloque todos os horários do cronograma de uma vez.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Aplicar em</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o briefing</SelectItem>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>Só &quot;{s.title}&quot;</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_SHIFTS.map((delta) => (
              <Button
                key={delta}
                variant="outline"
                size="sm"
                disabled={applying}
                onClick={() => apply(delta)}
              >
                {delta > 0 ? `+${delta}` : delta} min
              </Button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-2 flex-1">
              <Label>Outro valor (minutos; negativo adianta)</Label>
              <Input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                min={-720}
                max={720}
              />
            </div>
            <Button onClick={() => apply()} disabled={applying} className="gap-2">
              {applying && <Loader2 className="h-4 w-4 animate-spin" />}
              Aplicar
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={applying}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
