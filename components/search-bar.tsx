"use client";

import { Calendar as CalendarIcon, MapPin, Search, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import * as React from "react";
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
        trackEvent({
            action: 'search',
            category: 'Professionals',
            label: `City: ${city || 'All'}, Spec: ${specialty}, Date: ${date ? 'Yes' : 'No'}`
        });
    };

    return (
        <div
            className={cn(
                "flex flex-col md:flex-row p-2 bg-card rounded-2xl md:rounded-full shadow-2xl border border-border/40 max-w-4xl mx-auto items-center",
                className
            )}
        >
            {/* City Input */}
            <div className="relative flex-1 w-full md:w-auto overflow-hidden">
                <div className="relative flex items-center h-12 px-6 transition-colors cursor-text group">
                    <MapPin className="h-5 w-5 text-primary mr-4 shrink-0" />
                    <Input
                        placeholder="Em qual cidade?"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="p-0 border-0 shadow-none focus-visible:ring-0 bg-transparent h-full text-base font-medium text-foreground placeholder:text-muted-foreground w-full truncate selection:bg-primary/20"
                    />
                </div>
            </div>

            <div className="hidden md:block w-px h-8 bg-border/60 mx-2" />

            {/* Date Picker */}
            <div className="flex-1 w-full md:w-auto relative overflow-hidden">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"ghost"}
                            className={cn(
                                "w-full justify-start text-left font-normal h-12 hover:bg-transparent px-6 rounded-none md:rounded-lg",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-4 h-5 w-5 text-primary shrink-0" />
                            <span className={cn("text-base truncate font-medium", !date ? "text-muted-foreground" : "text-foreground")}>
                                {date ? format(date, "dd/MM/yyyy") : "Data do Job"}
                            </span>
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

            <div className="hidden md:block w-px h-8 bg-border/60 mx-2" />

            {/* Specialty Select */}
            <div className="flex-1 w-full md:w-auto relative overflow-hidden">
                <Select value={specialty} onValueChange={setSpecialty}>
                    <SelectTrigger className="border-0 shadow-none focus:ring-0 h-12 bg-transparent hover:bg-transparent px-6 rounded-none md:rounded-lg">
                        <div className="flex items-center text-left w-full overflow-hidden">
                            <Briefcase className="mr-4 h-5 w-5 text-primary shrink-0" />
                            <SelectValue
                                placeholder="Especialidade"
                                className="text-base font-medium text-muted-foreground placeholder:text-muted-foreground"
                            />
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
            <div className="p-1 w-full md:w-auto shrink-0 ml-2">
                <Button
                    onClick={handleSearch}
                    size="lg"
                    className="w-full md:w-auto rounded-xl md:rounded-full h-12 w-12 md:w-auto md:px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-lg transition-all hover:scale-105 active:scale-95"
                >
                    <Search className="h-5 w-5 md:mr-2" />
                    <span className="hidden md:inline">Buscar</span>
                </Button>
            </div>
        </div>
    );
}
