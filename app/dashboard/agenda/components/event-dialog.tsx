"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import type { CalendarEvent, CalendarEventDraft } from "@/lib/data-service";

// Formulário de compromisso (criar/editar). Estado local; devolve o draft
// pronto para a API no submit.

export const EVENT_COLORS = [
  { value: "#6366f1", label: "Índigo" },
  { value: "#0ea5e9", label: "Azul" },
  { value: "#10b981", label: "Verde" },
  { value: "#f59e0b", label: "Âmbar" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#a855f7", label: "Roxo" },
  { value: "#64748b", label: "Cinza" },
];

export const DEFAULT_EVENT_COLOR = EVENT_COLORS[0].value;

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Compromisso existente (edição) ou null (novo). */
  event: CalendarEvent | null;
  /** Data pré-selecionada ao criar. */
  defaultDate: string;
  onSubmit: (draft: CalendarEventDraft) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

interface FormState {
  title: string;
  date: string;
  endDate: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  blocksAgenda: boolean;
  color: string;
}

function initialState(event: CalendarEvent | null, defaultDate: string): FormState {
  if (event) {
    return {
      title: event.title,
      date: event.date,
      endDate: event.endDate,
      allDay: event.allDay,
      startTime: event.startTime ?? "09:00",
      endTime: event.endTime ?? "10:00",
      location: event.location ?? "",
      description: event.description ?? "",
      blocksAgenda: event.blocksAgenda,
      color: event.color ?? DEFAULT_EVENT_COLOR,
    };
  }
  return {
    title: "",
    date: defaultDate,
    endDate: defaultDate,
    allDay: false,
    startTime: "09:00",
    endTime: "10:00",
    location: "",
    description: "",
    blocksAgenda: true,
    color: DEFAULT_EVENT_COLOR,
  };
}

export function EventDialog({ open, onOpenChange, event, defaultDate, onSubmit, onDelete }: EventDialogProps) {
  const [form, setForm] = useState<FormState>(() => initialState(event, defaultDate));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Reabrir com outro compromisso/data zera o formulário
  useEffect(() => {
    if (open) {
      setForm(initialState(event, defaultDate));
      setError("");
    }
  }, [open, event, defaultDate]);

  const patch = (p: Partial<FormState>) => setForm((prev) => ({ ...prev, ...p }));

  const multiDay = form.endDate > form.date;
  const invalidTime = !form.allDay && !multiDay && form.endTime <= form.startTime;
  const invalidRange = form.endDate < form.date;
  const canSave = form.title.trim().length > 0 && !invalidTime && !invalidRange && !saving;

  const submit = async () => {
    if (!canSave) return;
    try {
      setSaving(true);
      setError("");
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        date: form.date,
        endDate: form.endDate < form.date ? form.date : form.endDate,
        allDay: form.allDay,
        startTime: form.allDay ? null : form.startTime,
        endTime: form.allDay ? null : form.endTime,
        blocksAgenda: form.blocksAgenda,
        color: form.color,
      });
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!event || !onDelete) return;
    try {
      setDeleting(true);
      await onDelete(event.id);
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || "Não foi possível excluir.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
          <DialogDescription>
            Só você vê o conteúdo. No seu perfil, o horário aparece apenas como indisponível.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">Título</Label>
            <Input
              id="ev-title"
              autoFocus
              placeholder="Ex.: Ensaio na praia, Reunião com cliente, Dentista…"
              value={form.title}
              maxLength={200}
              onChange={(e) => patch({ title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="ev-allday" className="cursor-pointer">Dia inteiro</Label>
            <Switch id="ev-allday" checked={form.allDay} onCheckedChange={(v) => patch({ allDay: v })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-date">Início</Label>
              <Input
                id="ev-date"
                type="date"
                value={form.date}
                onChange={(e) => {
                  const date = e.target.value;
                  patch({ date, endDate: form.endDate < date ? date : form.endDate });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-end-date">Fim</Label>
              <Input
                id="ev-end-date"
                type="date"
                value={form.endDate}
                min={form.date}
                onChange={(e) => patch({ endDate: e.target.value })}
                className={invalidRange ? "border-destructive" : ""}
              />
            </div>
          </div>

          {!form.allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ev-start">Das</Label>
                <Input
                  id="ev-start"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => patch({ startTime: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-end">Até</Label>
                <Input
                  id="ev-end"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => patch({ endTime: e.target.value })}
                  className={invalidTime ? "border-destructive" : ""}
                />
                {invalidTime && <p className="text-xs text-destructive">precisa ser depois do início</p>}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ev-location">Local <span className="text-muted-foreground">(opcional)</span></Label>
            <Input
              id="ev-location"
              value={form.location}
              maxLength={255}
              onChange={(e) => patch({ location: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ev-notes">Notas <span className="text-muted-foreground">(opcional)</span></Label>
            <Textarea
              id="ev-notes"
              rows={3}
              value={form.description}
              maxLength={2000}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  aria-label={c.label}
                  aria-pressed={form.color === c.value}
                  onClick={() => patch({ color: c.value })}
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c.value,
                    borderColor: form.color === c.value ? "hsl(var(--foreground))" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="ev-blocks" className="cursor-pointer">Bloqueia minha agenda</Label>
              <p className="text-xs text-muted-foreground">
                Desligado, vira um lembrete: aparece aqui, mas o horário continua livre no seu perfil.
              </p>
            </div>
            <Switch id="ev-blocks" checked={form.blocksAgenda} onCheckedChange={(v) => patch({ blocksAgenda: v })} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {event && onDelete ? (
            <Button type="button" variant="ghost" className="text-destructive" onClick={remove} disabled={deleting || saving}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Excluir
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={submit} disabled={!canSave}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {event ? "Salvar" : "Criar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
