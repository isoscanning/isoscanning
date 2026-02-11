
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import apiClient from "@/lib/api-service"

interface State {
    id: number
    name: string
    uf: string
}

interface City {
    id: number
    name: string
    state_id: number
    ddd?: number
}

interface Country {
    id: number
    name: string
    code: string
}

interface LocationSelectorProps {
    selectedCountryId?: number | null
    selectedStateId?: number | null
    selectedCityId?: number | null
    // Allow passing current string values to matching IDs if needed, but for now lets stick to IDs for selection
    // But we need to emit names for the parent form
    onCountryChange?: (id: number, name: string) => void
    onStateChange: (id: number, name: string, uf: string) => void
    onCityChange: (id: number, name: string, ddd?: number) => void
    isDisabled?: boolean
    className?: string
    initialCountryName?: string
    initialStateUf?: string
    initialCityName?: string
}

export function LocationSelector({
    selectedStateId,
    selectedCityId,
    onStateChange,
    onCityChange,
    isDisabled = false,
    className,
    initialStateUf,
    initialCityName,
    selectedCountryId,
    onCountryChange,
    initialCountryName
}: LocationSelectorProps) {
    const [countries, setCountries] = React.useState<Country[]>([])
    const [states, setStates] = React.useState<State[]>([])
    const [cities, setCities] = React.useState<City[]>([])
    const [loadingCountries, setLoadingCountries] = React.useState(false)
    const [loadingStates, setLoadingStates] = React.useState(false)
    const [loadingCities, setLoadingCities] = React.useState(false)

    // Fetch countries on mount
    React.useEffect(() => {
        async function fetchCountries() {
            setLoadingCountries(true)
            try {
                const response = await apiClient.get<Country[]>('/locations/countries')
                setCountries(response.data)
            } catch (error) {
                console.error("Failed to fetch countries", error)
            } finally {
                setLoadingCountries(false)
            }
        }
        fetchCountries()
    }, [])

    // Fetch states when country changes
    React.useEffect(() => {
        // If we want to allow states without country (e.g. legacy), we might fetch all if no countryId.
        // But better to clear if country is expected but not selected.
        // For now, let's fetch states if we have country OR if we want to support default (maybe fetch all if no country filtered?)
        // The backend supports filtering.

        async function fetchStates() {
            setLoadingStates(true)
            try {
                const url = selectedCountryId ? `/locations/states?countryId=${selectedCountryId}` : '/locations/states'
                const response = await apiClient.get<State[]>(url)
                setStates(response.data)
            } catch (error) {
                console.error("Failed to fetch states", error)
            } finally {
                setLoadingStates(false)
            }
        }
        fetchStates()
    }, [selectedCountryId])

    // Fetch cities when state changes
    React.useEffect(() => {
        if (!selectedStateId) {
            setCities([])
            return
        }

        async function fetchCities() {
            setLoadingCities(true)
            try {
                const response = await apiClient.get<City[]>(`/locations/cities/${selectedStateId}`)
                setCities(response.data)
            } catch (error) {
                console.error("Failed to fetch cities", error)
                setCities([])
            } finally {
                setLoadingCities(false)
            }
        }
        fetchCities()
    }, [selectedStateId])

    // Effect to sync initial string values to IDs if provided
    React.useEffect(() => {
        if (initialCountryName && countries.length > 0 && !selectedCountryId && onCountryChange) {
            const match = countries.find(c => c.name === initialCountryName || c.code === initialCountryName); // Handle code or name?
            if (match) {
                onCountryChange(match.id, match.name);
            } else {
                // Try Brazil default if nothing matches? Code 'BR' matches Brazil?
                // Let's rely on exact name for now
            }
        }
    }, [initialCountryName, countries, selectedCountryId, onCountryChange]);

    React.useEffect(() => {
        if (initialStateUf && states.length > 0 && !selectedStateId) {
            const match = states.find(s => s.uf === initialStateUf);
            if (match) {
                onStateChange(match.id, match.name, match.uf);
            }
        }
    }, [initialStateUf, states, selectedStateId, onStateChange]);

    React.useEffect(() => {
        // If we have a selected state and loaded cities, try to match initial city name
        if (initialCityName && cities.length > 0 && !selectedCityId && selectedStateId) {
            const match = cities.find(c => c.name === initialCityName);
            if (match) {
                onCityChange(match.id, match.name);
            }
        }
    }, [initialCityName, cities, selectedStateId, selectedCityId, onCityChange]);

    return (
        <div className={cn("grid gap-4", className)}>
            {onCountryChange && (
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        País
                    </label>
                    <Select
                        disabled={isDisabled || loadingCountries}
                        value={selectedCountryId?.toString() || ""}
                        onValueChange={(value) => {
                            const countryId = parseInt(value)
                            const country = countries.find(c => c.id === countryId)
                            if (country && onCountryChange) {
                                onCountryChange(countryId, country.name)
                                // Reset state and city? Parent should handle or we rely on useEffects
                            }
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={loadingCountries ? "Carregando..." : "Selecione o país"} />
                        </SelectTrigger>
                        <SelectContent>
                            {countries.map((country) => (
                                <SelectItem key={country.id} value={country.id.toString()}>
                                    {country.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Estado
                </label>
                <Select
                    disabled={isDisabled || loadingStates}
                    value={selectedStateId?.toString() || ""}
                    onValueChange={(value) => {
                        const stateId = parseInt(value)
                        const state = states.find(s => s.id === stateId)
                        if (state) {
                            onStateChange(stateId, state.name, state.uf)
                            // Reset city when state changes
                            // onCityChange(0) // or null, but props say number. Let's assume 0 is invalid/empty.
                            // The parent component should handle resetting the city when the state changes
                        }
                    }}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder={loadingStates ? "Carregando..." : !selectedCountryId && onCountryChange ? "Selecione o país" : "Selecione o estado"} />
                    </SelectTrigger>
                    <SelectContent>
                        {states.map((state) => (
                            <SelectItem key={state.id} value={state.id.toString()}>
                                {state.name} ({state.uf})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Cidade
                </label>
                <Select
                    disabled={isDisabled || !selectedStateId || loadingCities}
                    value={selectedCityId?.toString() || ""}
                    onValueChange={(value) => {
                        const cityId = parseInt(value)
                        const city = cities.find(c => c.id === cityId)
                        if (city) {
                            onCityChange(cityId, city.name, city.ddd)
                        }
                    }}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder={!selectedStateId ? "Selecione o estado primeiro" : loadingCities ? "Carregando..." : "Selecione a cidade"} />
                    </SelectTrigger>
                    <SelectContent>
                        {cities.map((city) => (
                            <SelectItem key={city.id} value={city.id.toString()}>
                                {city.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
