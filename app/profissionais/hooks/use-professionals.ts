import { useState, useEffect } from "react";
import { fetchProfessionals, fetchSpecialties, type Professional } from "@/lib/data-service";

export function useProfessionals() {
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [availableSpecialties, setAvailableSpecialties] = useState<string[]>(["Todos"]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedSpecialty, setSelectedSpecialty] = useState("Todos");
    const [selectedCity, setSelectedCity] = useState("");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [loadedSpecialties, loadedProfessionals] = await Promise.all([
                fetchSpecialties(),
                fetchProfessionals()
            ]);

            const specialtyNames = loadedSpecialties.map(s => s.name);
            setAvailableSpecialties(["Todos", ...specialtyNames]);
            setProfessionals(loadedProfessionals as any);
        } catch (error) {
            console.error("[useProfessionals] Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (filters: {
        city: string;
        date: Date | undefined;
        specialty: string;
    }) => {
        setSelectedCity(filters.city);
        setSelectedDate(filters.date);
        setSelectedSpecialty(filters.specialty);
    };

    const filteredProfessionals = professionals.filter((prof) => {
        const matchesSpecialty =
            selectedSpecialty === "Todos" || prof.specialty === selectedSpecialty;

        const matchesCity =
            selectedCity === "" ||
            prof.city?.toLowerCase().includes(selectedCity.toLowerCase());

        return matchesSpecialty && matchesCity;
    });

    return {
        professionals,
        availableSpecialties,
        loading,
        selectedSpecialty,
        selectedCity,
        selectedDate,
        filteredProfessionals,
        handleSearch,
        setSelectedCity,
        setSelectedSpecialty,
        setSelectedDate
    };
}
