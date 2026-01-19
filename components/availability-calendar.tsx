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
                    className="p-0 pointer-events-none" // Disable interaction for now as it's just display
                    modifiers={{
                        available: (date) => availabilitySlots.some(slot =>
                            slot.type === 'available' &&
                            format(new Date(slot.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                        ),
                        blocked: (date) => availabilitySlots.some(slot =>
                            slot.type === 'blocked' &&
                            format(new Date(slot.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                        ),
                    }}
                    modifiersClassNames={{
                        available: "bg-green-100 text-green-700 hover:bg-green-200 font-bold",
                        blocked: "bg-red-100 text-red-700 hover:bg-red-200 font-bold opacity-100",
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
                        className="p-0 pointer-events-none"
                        modifiers={{
                            available: (date) => availabilitySlots.some(slot =>
                                slot.type === 'available' &&
                                format(new Date(slot.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                            ),
                            blocked: (date) => availabilitySlots.some(slot =>
                                slot.type === 'blocked' &&
                                format(new Date(slot.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                            ),
                        }}
                        modifiersClassNames={{
                            available: "bg-green-100 text-green-700 hover:bg-green-200 font-bold",
                            blocked: "bg-red-100 text-red-700 hover:bg-red-200 font-bold opacity-100",
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
                    />
                </div>
            </div>
        </div>
    );
}
