"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Sun, Link2 } from "lucide-react";
import { addMonths, format, isBefore, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";

import type { AgendaDay, AgendaView, AgendaWindow, AvailabilitySlot } from "@/lib/data-service";
import { parseDateKey, toDateKey, todayKey } from "@/lib/availability";

// Calendário PÚBLICO do perfil. Desenha a agenda efetiva calculada pelo
// backend (`agenda`): semana padrão + datas − bloqueios − calendários
// conectados. `availabilitySlots` continua aceito para chamadores antigos —
// nesse modo cada slot vira um dia "livre" simples.

interface AvailabilityCalendarProps {
    agenda?: AgendaView | null;
    /** @deprecated use `agenda` */
    availabilitySlots?: AvailabilitySlot[];
}

function describeWindow(w: AgendaWindow): string {
    if (w.start === "00:00" && w.end === "24:00") return "Dia inteiro";
    return `${w.start} - ${w.end === "24:00" ? "23:59" : w.end}`;
}

function Legend({ showBusy }: { showBusy: boolean }) {
    return (
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
                Disponível
            </span>
            <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-500/20 border border-amber-500/40" />
                Parcialmente
            </span>
            {showBusy && (
                <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-500/15 border border-rose-500/30" />
                    Ocupado
                </span>
            )}
            <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-muted border border-border" />
                Sem disponibilidade informada
            </span>
            <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-primary/40" />
                Hoje
            </span>
        </div>
    );
}

/** Converte a lista antiga de slots no formato de dias da agenda. */
function daysFromSlots(slots: AvailabilitySlot[]): AgendaDay[] {
    const byDate = new Map<string, AgendaWindow[]>();
    for (const slot of slots) {
        const key = slot.date?.slice(0, 10);
        if (!key || slot.type === "blocked") continue;
        const start = (slot.startTime ?? "00:00").slice(0, 5);
        const rawEnd = (slot.endTime ?? "23:59").slice(0, 5);
        const end = rawEnd === "23:59" ? "24:00" : rawEnd;
        const list = byDate.get(key) ?? [];
        list.push({ start, end });
        byDate.set(key, list);
    }
    return [...byDate.entries()].map(([date, windows]) => ({
        date,
        weekday: parseDateKey(date).getDay(),
        status: "free",
        windows,
        blocked: [],
        origin: "date",
        fromExternal: false,
    }));
}

export function AvailabilityCalendar({ agenda, availabilitySlots = [] }: AvailabilityCalendarProps) {
    const today = React.useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    // Só de hoje em diante: agenda passada não ajuda quem está avaliando o
    // profissional (o backend já aplica isso na agenda; o fallback não).
    const days = React.useMemo(() => {
        const limit = todayKey();
        const source = agenda ? agenda.days : daysFromSlots(availabilitySlots);
        return source.filter((d) => d.date >= limit);
    }, [agenda, availabilitySlots]);

    const byDate = React.useMemo(() => {
        const map = new Map<string, AgendaDay>();
        for (const d of days) map.set(d.date, d);
        return map;
    }, [days]);

    const openDays = React.useMemo(
        () => days.filter((d) => d.status === "free" || d.status === "partial"),
        [days]
    );
    const hasBusy = React.useMemo(() => days.some((d) => d.status === "busy"), [days]);

    // Abre já na primeira data livre (e no mês dela) em vez de em "hoje", que
    // quase sempre cai num dia sem nada marcado.
    const firstOpen = React.useMemo(() => {
        const keys = openDays.map((d) => d.date).sort();
        return keys.length > 0 ? parseDateKey(keys[0]) : null;
    }, [openDays]);

    const [date, setDate] = React.useState<Date | undefined>(undefined);
    const [currentMonth, setCurrentMonth] = React.useState<Date>(() => startOfMonth(new Date()));
    const seeded = React.useRef(false);

    React.useEffect(() => {
        if (seeded.current || !firstOpen) return;
        seeded.current = true;
        setDate(firstOpen);
        setCurrentMonth(startOfMonth(firstOpen));
    }, [firstOpen]);

    const nextMonth = addMonths(currentMonth, 1);
    const isPreviousDisabled = !isBefore(startOfMonth(today), currentMonth);

    const selectedDay = date ? byDate.get(toDateKey(date)) : undefined;

    const renderDayButton = (dimmed: boolean) =>
        // eslint-disable-next-line react/display-name
        ({ day, modifiers, ...props }: any) => {
            const key = toDateKey(day.date);
            const info = byDate.get(key);
            const isPast = key < todayKey();

            return (
                <button
                    {...props}
                    className={cn(
                        "h-9 w-9 p-0 rounded-full transition-colors duration-200 text-sm",
                        // Dia sem marcação fica neutro de propósito: pintar de
                        // vermelho passava a ideia de "agenda lotada", quando na
                        // verdade o profissional só não informou nada para o dia.
                        "text-foreground/70 hover:bg-muted",
                        info?.status === "free" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold hover:bg-emerald-500/25",
                        info?.status === "partial" && "bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold hover:bg-amber-500/25",
                        info?.status === "busy" && "bg-rose-500/10 text-rose-700/60 dark:text-rose-400/60 line-through decoration-1",
                        modifiers.today && !modifiers.selected && "border-2 border-primary/40",
                        modifiers.selected && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md",
                        (isPast || modifiers.disabled) && !modifiers.selected && "text-muted-foreground/30 line-through decoration-1 hover:bg-transparent",
                        modifiers.outside && "text-muted-foreground/20 opacity-40 bg-transparent",
                        dimmed && !info && "text-muted-foreground/40"
                    )}
                />
            );
        };

    return (
        <Card className="w-full bg-card rounded-3xl p-6 md:p-8 shadow-2xl border-border/50">
            <div className="flex items-center justify-between mb-6">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                    disabled={isPreviousDisabled}
                    aria-label="Mês anterior"
                    className="h-9 w-9 rounded-full bg-background hover:bg-muted border-border text-foreground transition-colors disabled:opacity-50"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex gap-8 md:gap-16 text-lg font-bold text-foreground items-center">
                    <div className="capitalize flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-primary/70" />
                        {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                    </div>
                    <div className="hidden md:flex capitalize items-center gap-2 text-muted-foreground/60">
                        {format(nextMonth, "MMMM yyyy", { locale: ptBR })}
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    aria-label="Próximo mês"
                    className="h-9 w-9 rounded-full bg-background hover:bg-muted border-border text-foreground transition-colors"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-8 md:gap-16 justify-center">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    disabled={{ before: today }}
                    hideNavigation
                    locale={ptBR}
                    className="p-0"
                    classNames={{ month_caption: "hidden" }}
                    components={{ DayButton: renderDayButton(false) }}
                />

                <div className="hidden md:block opacity-70 hover:opacity-100 transition-opacity duration-300">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        month={nextMonth}
                        disabled={{ before: today }}
                        hideNavigation
                        locale={ptBR}
                        className="p-0"
                        classNames={{ month_caption: "hidden" }}
                        components={{ DayButton: renderDayButton(true) }}
                    />
                </div>
            </div>

            <div className="mt-6">
                <Legend showBusy={hasBusy} />
            </div>

            <div className="mt-6 border-t border-border/50 pt-6">
                {openDays.length === 0 ? (
                    <div className="text-center text-muted-foreground py-2 flex flex-col items-center gap-2">
                        <CalendarIcon className="h-8 w-8 opacity-20" />
                        <span className="text-sm">
                            {hasBusy
                                ? "Este profissional está com a agenda fechada no período publicado."
                                : "Este profissional ainda não publicou datas disponíveis."}
                        </span>
                        <span className="text-xs text-muted-foreground/70">
                            Isso não quer dizer que não haja como atender — vale entrar em contato.
                        </span>
                    </div>
                ) : !date ? (
                    <div className="text-center text-muted-foreground/60 py-2 flex flex-col items-center gap-2">
                        <CalendarIcon className="h-8 w-8 opacity-20" />
                        <span className="text-sm">Selecione uma data para ver os horários</span>
                    </div>
                ) : (
                    <div className="text-center animate-in fade-in slide-in-from-bottom-2 space-y-4">
                        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
                            {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </p>

                        {!selectedDay ? (
                            <div className="inline-flex items-center gap-3 px-6 py-3 bg-muted/50 text-muted-foreground rounded-2xl font-medium border border-border/50">
                                <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />
                                Sem disponibilidade informada para este dia
                            </div>
                        ) : selectedDay.status === "busy" ? (
                            <div className="inline-flex items-center gap-3 px-6 py-3 bg-rose-500/10 text-rose-700 dark:text-rose-400 rounded-2xl font-medium border border-rose-500/20">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                                Agenda fechada neste dia
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                {selectedDay.windows.map((w, i) =>
                                    describeWindow(w) === "Dia inteiro" ? (
                                        <div
                                            key={i}
                                            className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-2xl font-bold text-lg border border-emerald-500/20"
                                        >
                                            <Sun className="w-5 h-5" />
                                            Dia inteiro disponível
                                        </div>
                                    ) : (
                                        <div
                                            key={i}
                                            className="inline-flex items-center gap-3 px-6 py-3 bg-primary/5 text-primary rounded-2xl font-bold text-lg border border-primary/20 shadow-sm"
                                        >
                                            <Clock className="w-5 h-5" />
                                            {describeWindow(w)}
                                        </div>
                                    )
                                )}
                            </div>
                        )}

                        {selectedDay?.status === "partial" && selectedDay.blocked.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                Indisponível: {selectedDay.blocked.map(describeWindow).join(", ")}
                            </p>
                        )}

                        <p className="text-xs text-muted-foreground/70 flex items-center justify-center gap-1.5">
                            {openDays.length} data{openDays.length === 1 ? "" : "s"} com disponibilidade publicada
                            {agenda?.externalConnected && (
                                <span className="inline-flex items-center gap-1" title="Agenda sincronizada com o calendário do profissional">
                                    · <Link2 className="h-3 w-3" /> agenda sincronizada
                                </span>
                            )}
                        </p>
                    </div>
                )}
            </div>
        </Card>
    );
}
