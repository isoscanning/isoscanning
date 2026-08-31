"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Loader2, MapPin, Plus, Sun } from "lucide-react";
import { addMonths, format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgendaDay, AgendaView, CalendarEvent, CalendarEventDraft } from "@/lib/data-service";
import { addDaysToKey, parseDateKey, toDateKey, todayKey } from "@/lib/availability";
import { EventDialog, DEFAULT_EVENT_COLOR } from "./event-dialog";

// Agenda pessoal — grade mensal (como o Google Agenda), compromissos como
// etiquetas coloridas, painel do dia à direita. O fundo de cada dia mostra
// a agenda EFETIVA (livre/parcial/ocupado), para a pessoa ver o efeito dos
// compromissos no próprio perfil sem sair daqui.

const WEEKDAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MAX_CHIPS = 3;

interface PersonalCalendarProps {
  events: CalendarEvent[];
  agenda: AgendaView | null;
  loading: boolean;
  onCreate: (draft: CalendarEventDraft) => Promise<void>;
  onUpdate: (id: string, draft: CalendarEventDraft) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

/** Semanas do mês (domingo → sábado), com os dias de fora para completar a grade. */
function monthGrid(month: Date): string[][] {
  const first = startOfMonth(month);
  const firstKey = toDateKey(first);
  const start = addDaysToKey(firstKey, -first.getDay());
  const weeks: string[][] = [];
  let cursor = start;
  // 6 semanas cobrem qualquer mês; corta a última se for toda do mês seguinte
  for (let w = 0; w < 6; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(cursor);
      cursor = addDaysToKey(cursor, 1);
    }
    weeks.push(week);
  }
  const monthPrefix = firstKey.slice(0, 7);
  return weeks.filter((week, i) => i < 4 || week.some((k) => k.startsWith(monthPrefix)));
}

function describeEventTime(ev: CalendarEvent, dateKey: string): string {
  if (ev.allDay) return "Dia inteiro";
  const first = dateKey === ev.date;
  const last = dateKey === ev.endDate;
  if (first && last) return `${ev.startTime} – ${ev.endTime}`;
  if (first) return `a partir de ${ev.startTime}`;
  if (last) return `até ${ev.endTime}`;
  return "Dia inteiro";
}

const DAY_TINT: Record<AgendaDay["status"], string> = {
  free: "bg-emerald-500/[0.07]",
  partial: "bg-amber-500/[0.08]",
  busy: "bg-rose-500/[0.07]",
  unset: "",
};

export function PersonalCalendar({ events, agenda, loading, onCreate, onUpdate, onDelete }: PersonalCalendarProps) {
  const today = todayKey();
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<string>(today);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const weeks = useMemo(() => monthGrid(month), [month]);
  const monthPrefix = toDateKey(month).slice(0, 7);

  // Compromisso de vários dias aparece em cada dia que toca
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      let cursor = ev.date;
      let guard = 0;
      while (cursor <= ev.endDate && guard++ < 40) {
        const list = map.get(cursor) ?? [];
        list.push(ev);
        map.set(cursor, list);
        cursor = addDaysToKey(cursor, 1);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => Number(b.allDay) - Number(a.allDay) || (a.startTime ?? "").localeCompare(b.startTime ?? ""));
    }
    return map;
  }, [events]);

  const agendaByDate = useMemo(() => {
    const map = new Map<string, AgendaDay>();
    for (const d of agenda?.days ?? []) map.set(d.date, d);
    return map;
  }, [agenda]);

  const openNew = useCallback((date: string) => {
    setSelected(date);
    setEditing(null);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((ev: CalendarEvent) => {
    setEditing(ev);
    setDialogOpen(true);
  }, []);

  const handleSubmit = async (draft: CalendarEventDraft) => {
    if (editing) await onUpdate(editing.id, draft);
    else await onCreate(draft);
  };

  const selectedEvents = eventsByDate.get(selected) ?? [];
  const selectedAgenda = agendaByDate.get(selected);
  const monthEventCount = events.filter((e) => e.date.startsWith(monthPrefix) || e.endDate.startsWith(monthPrefix)).length;

  return (
    <Card className="border-2 shadow-sm">
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Minha agenda</CardTitle>
            <CardDescription className="text-base">
              Seus compromissos, só para você. No perfil público eles aparecem apenas como horário indisponível.
            </CardDescription>
          </div>
          <Button type="button" onClick={() => openNew(selected >= today ? selected : today)}>
            <Plus className="mr-2 h-4 w-4" /> Novo compromisso
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* ── Grade mensal ── */}
          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button type="button" variant="outline" size="icon" aria-label="Mês anterior" onClick={() => setMonth(addMonths(month, -1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" aria-label="Próximo mês" onClick={() => setMonth(addMonths(month, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setMonth(startOfMonth(new Date())); setSelected(today); }}>
                  Hoje
                </Button>
              </div>
              <div className="flex items-center gap-3">
                {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                <h3 className="text-lg font-semibold capitalize">{format(month, "MMMM yyyy", { locale: ptBR })}</h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[560px] rounded-lg border">
                <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {WEEKDAY_LABELS.map((d) => (
                    <div key={d} className="py-2">{d}</div>
                  ))}
                </div>
                {weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 border-b last:border-b-0">
                    {week.map((dateKey) => {
                      const inMonth = dateKey.startsWith(monthPrefix);
                      const dayEvents = eventsByDate.get(dateKey) ?? [];
                      const info = agendaByDate.get(dateKey);
                      const isSelected = dateKey === selected;
                      const isToday = dateKey === today;
                      return (
                        <div
                          key={dateKey}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelected(dateKey)}
                          onDoubleClick={() => openNew(dateKey)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") openNew(dateKey);
                            if (e.key === " ") { e.preventDefault(); setSelected(dateKey); }
                          }}
                          className={cn(
                            "group relative min-h-[92px] border-r p-1.5 text-left transition-colors last:border-r-0",
                            info ? DAY_TINT[info.status] : "",
                            !inMonth && "opacity-40",
                            isSelected ? "ring-2 ring-inset ring-primary" : "hover:bg-accent/40",
                            dateKey < today && "bg-muted/20"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                                isToday && "bg-primary text-primary-foreground"
                              )}
                            >
                              {Number(dateKey.slice(8, 10))}
                            </span>
                            <button
                              type="button"
                              aria-label="Novo compromisso neste dia"
                              onClick={(e) => { e.stopPropagation(); openNew(dateKey); }}
                              className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="mt-1 space-y-0.5">
                            {dayEvents.slice(0, MAX_CHIPS).map((ev) => (
                              <button
                                key={ev.id}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                                title={`${ev.title} — ${describeEventTime(ev, dateKey)}`}
                                className={cn(
                                  "block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium leading-4 text-white",
                                  !ev.blocksAgenda && "opacity-70 ring-1 ring-inset ring-white/40"
                                )}
                                style={{ backgroundColor: ev.color ?? DEFAULT_EVENT_COLOR }}
                              >
                                {!ev.allDay && dateKey === ev.date && <span className="opacity-80">{ev.startTime} </span>}
                                {ev.title}
                              </button>
                            ))}
                            {dayEvents.length > MAX_CHIPS && (
                              <span className="block px-1 text-[11px] text-muted-foreground">+{dayEvents.length - MAX_CHIPS}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/40" /> livre no perfil</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500/40" /> parcialmente</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-500/40" /> fechado</span>
              <span className="ml-auto">{monthEventCount} compromisso{monthEventCount === 1 ? "" : "s"} no mês · duplo clique no dia cria</span>
            </div>
          </div>

          {/* ── Painel do dia ── */}
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold capitalize">
                  {format(parseDateKey(selected), "EEEE", { locale: ptBR })}
                </p>
                <p className="text-2xl font-bold leading-tight">{format(parseDateKey(selected), "dd 'de' MMMM", { locale: ptBR })}</p>
              </div>
              <Button type="button" size="icon" variant="outline" aria-label="Novo compromisso" onClick={() => openNew(selected)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {selectedAgenda && (
              <p className="text-xs text-muted-foreground">
                No perfil:{" "}
                {selectedAgenda.status === "free" && "livre"}
                {selectedAgenda.status === "partial" && `parcialmente livre (${selectedAgenda.windows.map((w) => `${w.start}–${w.end === "24:00" ? "23:59" : w.end}`).join(", ")})`}
                {selectedAgenda.status === "busy" && "fechado"}
              </p>
            )}
            {!selectedAgenda && (
              <p className="text-xs text-muted-foreground">No perfil: sem disponibilidade informada.</p>
            )}

            {selectedEvents.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum compromisso neste dia.</p>
            ) : (
              <ul className="space-y-2">
                {selectedEvents.map((ev) => (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => openEdit(ev)}
                      className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50"
                    >
                      <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: ev.color ?? DEFAULT_EVENT_COLOR }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{ev.title}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {ev.allDay ? <Sun className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {describeEventTime(ev, selected)}
                          {ev.endDate > ev.date && ` · até ${format(parseDateKey(ev.endDate), "dd/MM")}`}
                        </span>
                        {ev.location && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" /> <span className="truncate">{ev.location}</span>
                          </span>
                        )}
                        {!ev.blocksAgenda && (
                          <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">lembrete</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <EventDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          event={editing}
          defaultDate={selected}
          onSubmit={handleSubmit}
          onDelete={onDelete}
        />
      </CardContent>
    </Card>
  );
}
