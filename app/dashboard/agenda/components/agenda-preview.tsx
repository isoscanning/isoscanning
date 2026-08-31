"use client";

import * as React from "react";
import { CalendarDays, Clock, Link2, Loader2, Sun } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import type { AgendaDay, AgendaView, AgendaWindow } from "@/lib/data-service";
import { parseDateKey, toDateKey } from "@/lib/availability";

// Prévia da agenda EFETIVA do profissional — exatamente o que o motor do
// backend calcula e o perfil público mostra (aqui sem a janela de
// publicação, para o dono enxergar tudo).

export function describeWindow(w: AgendaWindow): string {
  if (w.start === "00:00" && w.end === "24:00") return "Dia inteiro";
  return `${w.start} – ${w.end === "24:00" ? "23:59" : w.end}`;
}

const STATUS_LABEL: Record<AgendaDay["status"], string> = {
  free: "Livre",
  partial: "Parcialmente livre",
  busy: "Ocupado",
  unset: "Sem disponibilidade informada",
};

interface AgendaPreviewProps {
  agenda: AgendaView | null;
  loading: boolean;
}

export function AgendaPreview({ agenda, loading }: AgendaPreviewProps) {
  const [month, setMonth] = React.useState<Date>(() => startOfMonth(new Date()));
  const [selected, setSelected] = React.useState<Date | undefined>(undefined);

  const byDate = React.useMemo(() => {
    const map = new Map<string, AgendaDay>();
    for (const day of agenda?.days ?? []) map.set(day.date, day);
    return map;
  }, [agenda]);

  const stats = React.useMemo(() => {
    const days = agenda?.days ?? [];
    return {
      free: days.filter((d) => d.status === "free").length,
      partial: days.filter((d) => d.status === "partial").length,
      busy: days.filter((d) => d.status === "busy").length,
      external: days.filter((d) => d.fromExternal).length,
    };
  }, [agenda]);

  const selectedDay = selected ? byDate.get(toDateKey(selected)) : undefined;

  const DayButton = React.useCallback(
    // eslint-disable-next-line react/display-name
    ({ day, modifiers, ...props }: any) => {
      const info = byDate.get(toDateKey(day.date));
      return (
        <button
          {...props}
          className={cn(
            "relative h-9 w-9 rounded-full p-0 text-sm transition-colors",
            "text-foreground/70 hover:bg-muted",
            info?.status === "free" && "bg-emerald-500/15 font-semibold text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400",
            info?.status === "partial" && "bg-amber-500/15 font-semibold text-amber-700 hover:bg-amber-500/25 dark:text-amber-400",
            info?.status === "busy" && "bg-rose-500/10 text-rose-700/70 line-through decoration-1 dark:text-rose-400/70",
            modifiers.today && !modifiers.selected && "ring-2 ring-primary/40",
            modifiers.selected && "bg-primary text-primary-foreground shadow-md hover:bg-primary/90",
            modifiers.outside && "opacity-30"
          )}
        >
          {props.children}
          {info?.fromExternal && (
            <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden="true" />
          )}
        </button>
      );
    },
    [byDate]
  );

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Como sua agenda aparece</CardTitle>
        <CardDescription className="text-base">
          Semana padrão + datas específicas − bloqueios − calendários conectados. É isto que quem visita
          seu perfil vê.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !agenda ? (
          <div className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Calculando agenda…
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-[minmax(0,320px)_1fr]">
            <div className="space-y-4">
              <div className="rounded-md border bg-background p-3">
                <Calendar
                  mode="single"
                  selected={selected}
                  onSelect={setSelected}
                  month={month}
                  onMonthChange={setMonth}
                  locale={ptBR}
                  components={{ DayButton }}
                  className="p-0"
                />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" /> livre</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" /> parcial</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500/50" /> ocupado</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" /> fechado por calendário conectado</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "dias livres", value: stats.free, tone: "text-emerald-600 dark:text-emerald-400" },
                  { label: "parciais", value: stats.partial, tone: "text-amber-600 dark:text-amber-400" },
                  { label: "ocupados", value: stats.busy, tone: "text-rose-600 dark:text-rose-400" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border p-3 text-center">
                    <div className={cn("text-2xl font-bold", s.tone)}>{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>

              {agenda && !agenda.hasRules && agenda.days.length === 0 && (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  <CalendarDays className="mb-2 h-6 w-6 opacity-40" />
                  Nada publicado ainda. Cadastre sua <strong>semana padrão</strong> — leva um minuto — ou marque
                  datas específicas.
                </div>
              )}

              {agenda?.externalConnected && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Link2 className="h-3.5 w-3.5" />
                  {stats.external} dia{stats.external === 1 ? "" : "s"} com horário fechado por calendário conectado.
                </p>
              )}

              {selected && (
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-medium capitalize">
                    {format(selected, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-muted-foreground">{STATUS_LABEL[selectedDay?.status ?? "unset"]}</p>
                  {selectedDay && selectedDay.windows.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedDay.windows.map((w, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                          {describeWindow(w) === "Dia inteiro" ? <Sun className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                          {describeWindow(w)}
                        </span>
                      ))}
                    </div>
                  )}
                  {selectedDay && selectedDay.blocked.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Fechado:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedDay.blocked.map((w, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-sm text-rose-700 line-through dark:text-rose-400">
                            {describeWindow(w)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedDay?.origin === "date" && (
                    <p className="text-xs text-muted-foreground">Data com horário próprio (substitui a semana padrão).</p>
                  )}
                </div>
              )}
              {!selected && (
                <p className="text-sm text-muted-foreground">Clique em um dia para ver os horários.</p>
              )}
              <p className="text-xs text-muted-foreground">
                Fuso: {agenda?.timezone ?? "—"}. Prévia de {agenda ? format(parseDateKey(agenda.from), "dd/MM") : "—"} a{" "}
                {agenda ? format(parseDateKey(agenda.to), "dd/MM") : "—"}; use as setas para ver outros meses.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
