"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

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
        <div className="w-full bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePreviousMonth}
                    className="h-8 w-8 rounded-full hover:bg-gray-100"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex gap-8 md:gap-16 text-lg font-bold text-gray-900">
                    <div className="capitalize">
                        {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                    </div>
                    <div className="hidden md:block capitalize">
                        {format(nextMonth, "MMMM yyyy", { locale: ptBR })}
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNextMonth}
                    className="h-8 w-8 rounded-full hover:bg-gray-100"
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
                            format(new Date(slot.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                        ),
                    }}
                    modifiersClassNames={{
                        available: "bg-green-100 text-green-700 hover:bg-green-200 font-bold",
                    }}
                    classNames={{
                        month: "space-y-4",
                        caption: "hidden", // Hide default caption as we have custom header
                        head_row: "flex w-full justify-between mb-2",
                        head_cell:
                            "text-gray-300 rounded-md w-9 font-normal text-[0.8rem] uppercase",
                        row: "flex w-full mt-2 justify-between",
                        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                        day: cn(
                            "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 rounded-full",
                            // Apply red color to days that are NOT available and NOT outside current month
                        ),
                        day_selected:
                            "bg-blue-600 text-primary-foreground hover:bg-blue-600 hover:text-primary-foreground focus:bg-blue-600 focus:text-primary-foreground",
                        day_today: "bg-accent text-accent-foreground",
                        day_outside:
                            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                        day_disabled: "text-muted-foreground opacity-50",
                        day_range_middle:
                            "aria-selected:bg-accent aria-selected:text-accent-foreground",
                        day_hidden: "invisible",
                    }}
                    components={{
                        DayButton: ({ day, modifiers, ...props }) => {
                            const isAvailable = availabilitySlots.some(slot =>
                                format(new Date(slot.date), 'yyyy-MM-dd') === format(day.date, 'yyyy-MM-dd')
                            );
                            const isOutside = modifiers.outside;
                            const isToday = modifiers.today;

                            return (
                                <button
                                    {...props}
                                    className={cn(
                                        "h-9 w-9 p-0 font-normal rounded-full transition-colors",
                                        isAvailable && "bg-green-100 text-green-700 hover:bg-green-200 font-bold",
                                        !isAvailable && !isOutside && !isToday && "bg-red-100 text-red-700 hover:bg-red-200",
                                        isToday && !isAvailable && "border-2 border-blue-600",
                                        modifiers.selected && "bg-blue-600 text-white hover:bg-blue-700",
                                        isOutside && "text-muted-foreground opacity-50"
                                    )}
                                />
                            );
                        }
                    }}
                />

                <div className="hidden md:block">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        month={nextMonth}
                        // Disable navigation on second calendar
                        disableNavigation
                        locale={ptBR}
                        className="p-0"
                        modifiers={{
                            available: (date) => availabilitySlots.some(slot =>
                                format(new Date(slot.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                            ),
                        }}
                        modifiersClassNames={{
                            available: "bg-green-100 text-green-700 hover:bg-green-200 font-bold",
                        }}
                        classNames={{
                            month: "space-y-4",
                            caption: "hidden",
                            head_row: "flex w-full justify-between mb-2",
                            head_cell:
                                "text-gray-300 rounded-md w-9 font-normal text-[0.8rem] uppercase",
                            row: "flex w-full mt-2 justify-between",
                            cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                            day: cn(
                                "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 rounded-full"
                            ),
                            day_selected:
                                "bg-blue-600 text-primary-foreground hover:bg-blue-600 hover:text-primary-foreground focus:bg-blue-600 focus:text-primary-foreground",
                            day_today: "bg-accent text-accent-foreground",
                            day_outside:
                                "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                            day_disabled: "text-muted-foreground opacity-50",
                            day_range_middle:
                                "aria-selected:bg-accent aria-selected:text-accent-foreground",
                            day_hidden: "invisible",
                        }}
                        components={{
                            DayButton: ({ day, modifiers, ...props }) => {
                                const isAvailable = availabilitySlots.some(slot =>
                                    format(new Date(slot.date), 'yyyy-MM-dd') === format(day.date, 'yyyy-MM-dd')
                                );
                                const isOutside = modifiers.outside;
                                const isToday = modifiers.today;

                                return (
                                    <button
                                        {...props}
                                        className={cn(
                                            "h-9 w-9 p-0 font-normal rounded-full transition-colors",
                                            isAvailable && "bg-green-100 text-green-700 hover:bg-green-200 font-bold",
                                            !isAvailable && !isOutside && !isToday && "bg-red-100 text-red-700 hover:bg-red-200",
                                            isToday && !isAvailable && "border-2 border-blue-600",
                                            modifiers.selected && "bg-blue-600 text-white hover:bg-blue-700",
                                            isOutside && "text-muted-foreground opacity-50"
                                        )}
                                    />
                                );
                            }
                        }}
                    />
                </div>
            </div>

            <div className="mt-8 border-t border-gray-100 pt-8">
                {date ? (
                    (() => {
                        const selectedSlot = availabilitySlots.find(slot =>
                            format(new Date(slot.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                        );

                        if (!selectedSlot) {
                            return (
                                <div className="text-center">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full font-medium">
                                        <div className="w-2 h-2 rounded-full bg-red-600" />
                                        Indisponível neste dia
                                    </div>
                                </div>
                            );
                        }

                        // Available slot - show details
                        const isAllDay = selectedSlot.startTime === '00:00' && selectedSlot.endTime === '23:59';

                        return (
                            <div className="text-center">
                                <p className="text-sm text-gray-500 mb-2 font-medium uppercase tracking-wider">
                                    Disponibilidade para {format(date, "dd 'de' MMMM", { locale: ptBR })}
                                </p>
                                {isAllDay ? (
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full font-bold text-lg">
                                        <div className="w-3 h-3 rounded-full bg-green-600" />
                                        Dia Inteiro
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-50 text-green-700 rounded-xl font-bold text-xl border border-green-100">
                                        <div className="w-3 h-3 rounded-full bg-green-600" />
                                        {selectedSlot.startTime} - {selectedSlot.endTime}
                                    </div>
                                )}
                            </div>
                        );
                    })()
                ) : (
                    <div className="text-center text-gray-400">
                        Selecione uma data para ver detalhes
                    </div>
                )}
            </div>
        </div>
    );
}
