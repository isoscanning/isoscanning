"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, MapPin, Search, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
    onSearch: (filters: {
        city: string;
        date: Date | undefined;
        specialty: string;
    }) => void;
    specialties: string[];
    className?: string;
}

export function SearchBar({
    onSearch,
    specialties,
    className,
}: SearchBarProps) {
    const [city, setCity] = React.useState("");
    const [date, setDate] = React.useState<Date>();
    const [specialty, setSpecialty] = React.useState("Todos");

    const handleSearch = () => {
        onSearch({ city, date, specialty });
    };

    return (
        <div
            className={cn(
                "flex flex-col md:flex-row gap-2 p-2 bg-white rounded-full shadow-lg border border-border/50 max-w-4xl mx-auto items-center",
                className
            )}
        >
            {/* City Input */}
            <div className="relative flex-1 w-full md:w-auto">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Cidade"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="pl-10 border-0 shadow-none focus-visible:ring-0 bg-transparent h-12"
                />
            </div>

            <div className="hidden md:block w-px h-8 bg-border" />

            {/* Date Picker */}
            <div className="flex-1 w-full md:w-auto">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"ghost"}
                            className={cn(
                                "w-full justify-start text-left font-normal h-12 hover:bg-transparent px-4",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "dd/MM/yyyy") : <span>mm/dd/yyyy</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <div className="hidden md:block w-px h-8 bg-border" />

            {/* Specialty Select */}
            <div className="flex-1 w-full md:w-auto">
                <Select value={specialty} onValueChange={setSpecialty}>
                    <SelectTrigger className="border-0 shadow-none focus:ring-0 h-12 bg-transparent">
                        <div className="flex items-center text-muted-foreground">
                            <Briefcase className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Especialidade" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        {specialties.map((item) => (
                            <SelectItem key={item} value={item}>
                                {item}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Search Button */}
            <Button
                onClick={handleSearch}
                className="w-full md:w-auto rounded-full px-8 h-10 md:ml-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
                <Search className="mr-2 h-4 w-4" />
                Buscar Disponíveis
            </Button>
        </div>
    );
}
