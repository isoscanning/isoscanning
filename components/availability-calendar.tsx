"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import { AvailabilitySlot } from "@/lib/data-service";

interface AvailabilityCalendarProps {
    availabilitySlots?: AvailabilitySlot[];
}

export function AvailabilityCalendar({ availabilitySlots = [] }: AvailabilityCalendarProps) {
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date());

    const nextMonth = addMonths(currentMonth, 1);

    const handlePreviousMonth = () => {
        setCurrentMonth(addMonths(currentMonth, -1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(addMonths(currentMonth, 1));
    };

    return (
        <Card className="w-full bg-card rounded-3xl p-8 shadow-2xl border-border/50">
            <div className="flex items-center justify-between mb-8">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePreviousMonth}
                    className="h-9 w-9 rounded-full bg-background hover:bg-muted border-border text-foreground transition-colors"
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
                    onClick={handleNextMonth}
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
                    locale={ptBR}
                    className="p-0"
                    modifiers={{
                        available: (date) => availabilitySlots.some(slot =>
                            slot.date === format(date, 'yyyy-MM-dd')
                        ),
                    }}
                    modifiersClassNames={{
                        available: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500/25",
                    }}
                    classNames={{
                        month: "space-y-4",
                        caption: "hidden", // Hide default caption as we have custom header
                        head_row: "flex w-full justify-between mb-4",
                        head_cell:
                            "text-muted-foreground/60 rounded-md w-9 font-medium text-[0.8rem] uppercase tracking-wider",
                        row: "flex w-full mt-2 justify-between",
                        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                        day: cn(
                            "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-muted/50 rounded-full transition-all text-foreground/80",
                            // Apply red color to days that are NOT available and NOT outside current month
                        ),
                        day_selected:
                            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-sm shadow-primary/25",
                        day_today: "bg-accent/20 text-accent-foreground border border-primary/20",
                        day_outside:
                            "day-outside text-muted-foreground/30 opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                        day_disabled: "text-muted-foreground opacity-50",
                        day_range_middle:
                            "aria-selected:bg-accent aria-selected:text-accent-foreground",
                        day_hidden: "invisible",
                    }}
                    components={{
                        DayButton: ({ day, modifiers, ...props }) => {
                            const isAvailable = availabilitySlots.some(slot =>
                                slot.date === format(day.date, 'yyyy-MM-dd')
                            );
                            const isOutside = modifiers.outside;
                            const isToday = modifiers.today;

                            return (
                                <button
                                    {...props}
                                    className={cn(
                                        "h-9 w-9 p-0 font-normal rounded-full transition-all duration-200",
                                        isAvailable && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-emerald-500/20",
                                        !isAvailable && !isOutside && !isToday && "bg-red-100/50 text-red-600 dark:bg-red-500/20 dark:text-red-200 hover:bg-red-200/50 dark:hover:bg-red-500/30",
                                        isToday && !isAvailable && "border-2 border-primary/30",
                                        modifiers.selected && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md z-10",
                                        isOutside && "text-muted-foreground/20 opacity-30 bg-transparent"
                                    )}
                                />
                            );
                        }
                    }}
                />

                <div className="hidden md:block opacity-60 hover:opacity-100 transition-opacity duration-300">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        month={nextMonth}
                        // Disable navigation on second calendar
                        disableNavigation
                        locale={ptBR}
                        className="p-0 grayscale-[0.5] hover:grayscale-0 transition-all"
                        modifiers={{
                            available: (date) => availabilitySlots.some(slot =>
                                format(new Date(slot.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                            ),
                        }}
                        modifiersClassNames={{
                            available: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500/25",
                        }}
                        classNames={{
                            month: "space-y-4",
                            caption: "hidden",
                            head_row: "flex w-full justify-between mb-4",
                            head_cell:
                                "text-muted-foreground/40 rounded-md w-9 font-medium text-[0.8rem] uppercase tracking-wider",
                            row: "flex w-full mt-2 justify-between",
                            cell: "h-9 w-9 text-center text-sm p-0 relative",
                            day: cn(
                                "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-muted/30 rounded-full transition-all text-muted-foreground"
                            ),
                            day_selected:
                                "bg-primary/50 text-primary-foreground",
                            day_today: "bg-transparent",
                            day_outside: "hidden",
                            day_disabled: "text-muted-foreground/20",
                        }}
                        components={{
                            DayButton: ({ day, modifiers, ...props }) => {
                                const isAvailable = availabilitySlots.some(slot =>
                                    format(new Date(slot.date), 'yyyy-MM-dd') === format(day.date, 'yyyy-MM-dd')
                                );

                                return (
                                    <button
                                        {...props}
                                        className={cn(
                                            "h-9 w-9 p-0 font-normal rounded-full transition-colors",
                                            isAvailable ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold" : "text-muted-foreground/40"
                                        )}
                                    />
                                );
                            }
                        }}
                    />
                </div>
            </div>

            <div className="mt-8 border-t border-border/50 pt-8">
                {date ? (
                    (() => {
                        const selectedSlot = availabilitySlots.find(slot =>
                            slot.date === format(date, 'yyyy-MM-dd')
                        );

                        if (!selectedSlot) {
                            return (
                                <div className="text-center animate-in fade-in slide-in-from-bottom-2">
                                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-muted/50 text-muted-foreground rounded-2xl font-medium border border-border/50">
                                        <div className="w-2.5 h-2.5 rounded-full bg-destructive/50" />
                                        Nenhum horário disponível
                                    </div>
                                </div>
                            );
                        }

                        // Available slot - show details
                        const isAllDay = selectedSlot.startTime === '00:00' && selectedSlot.endTime === '23:59';

                        return (
                            <div className="text-center animate-in fade-in slide-in-from-bottom-2">
                                <p className="text-sm text-muted-foreground mb-4 font-medium uppercase tracking-widest">
                                    {format(date, "dd 'de' MMMM", { locale: ptBR })}
                                </p>
                                {isAllDay ? (
                                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-2xl font-bold text-lg border border-emerald-500/20">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Dia Inteiro Disponível
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-3 px-8 py-4 bg-primary/5 text-primary rounded-2xl font-bold text-xl border border-primary/20 shadow-sm">
                                        <Clock className="w-5 h-5 text-primary" />
                                        {selectedSlot.startTime} - {selectedSlot.endTime}
                                    </div>
                                )}
                            </div>
                        );
                    })()
                ) : (
                    <div className="text-center text-muted-foreground/50 py-4 flex flex-col items-center gap-2">
                        <CalendarIcon className="h-8 w-8 opacity-20" />
                        <span>Selecione uma data para ver detalhes</span>
                    </div>
                )}
            </div>
        </Card>
    );
}
