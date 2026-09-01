"use client";

// Recálculo em cascata do cronograma do Briefing Pro: a partir do primeiro
// item com horário, cada item seguinte começa quando o anterior termina
// (duração própria ou a padrão). É o complemento do Time Shift: um desloca,
// este reconstrói a sequência.

import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ListOrdered } from "lucide-react";
import { toast } from "sonner";
import { briefingProService } from "@/lib/briefing-pro-service";

export function BriefingRecalcDialog({
  briefingId, onClose, onApplied,
}: {
  briefingId: string;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [defaultDuration, setDefaultDuration] = useState<string>("15");
  const [applying, setApplying] = useState(false);

  async function apply() {
    const value = parseInt(defaultDuration, 10);
    if (!value || value < 1 || value > 480) {
      toast.error("Duração padrão entre 1 e 480 minutos");
      return;
    }
    setApplying(true);
    try {
      const { updated, finished_at } = await briefingProService.recalculateSchedule(briefingId, {
        default_duration_minutes: value,
      });
      toast.success(
        updated > 0
          ? `${updated} ${updated === 1 ? "horário recalculado" : "horários recalculados"}${finished_at ? ` — termina ~${finished_at}` : ""}`
          : "Cronograma já estava em sequência"
      );
      onApplied();
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Erro ao recalcular — defina o horário do primeiro item");
      setApplying(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-blue-500" />
            Recalcular cronograma
          </DialogTitle>
          <DialogDescription>
            A partir do primeiro item com horário, cada item seguinte começa quando o anterior
            termina — usando a duração de cada item (campo &quot;Duração&quot;) ou a padrão abaixo.
            Intervalos também contam.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Duração padrão para itens sem duração (min)</Label>
          <Input
            type="number"
            min={1}
            max={480}
            value={defaultDuration}
            onChange={(e) => setDefaultDuration(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Dica: defina a duração real nos itens principais (editar item → Duração) e deixe a
            padrão cobrir o resto.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={applying}>Cancelar</Button>
          <Button onClick={apply} disabled={applying}>
            {applying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Recalcular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
