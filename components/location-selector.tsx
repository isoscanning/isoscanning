"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
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
    selectedCountryId,
    selectedStateId,
    selectedCityId,
    onCountryChange,
    onStateChange,
    onCityChange,
    isDisabled = false,
    className,
    initialCountryName,
    initialStateUf,
    initialCityName,
}: LocationSelectorProps) {
    const [countries, setCountries] = React.useState<Country[]>([])
    const [states, setStates] = React.useState<State[]>([])
    const [cities, setCities] = React.useState<City[]>([])
    const [loadingCountries, setLoadingCountries] = React.useState(false)
    const [loadingStates, setLoadingStates] = React.useState(false)
    const [loadingCities, setLoadingCities] = React.useState(false)
    const [openCountry, setOpenCountry] = React.useState(false)
    const [openState, setOpenState] = React.useState(false)
    const [openCity, setOpenCity] = React.useState(false)

    // Fetch countries if onCountryChange is provided
    React.useEffect(() => {
        if (onCountryChange) {
            setLoadingCountries(true);
            apiClient.get('/locations/countries')
                .then(response => {
                    setCountries(response.data);
                })
                .catch(error => {
                    console.error('Error fetching countries:', error);
                })
                .finally(() => {
                    setLoadingCountries(false);
                });
        }
    }, [onCountryChange]);

    // Fetch states when country changes (or on mount if no country selector)
    React.useEffect(() => {
        const countryIdToUse = selectedCountryId || 1; // Default to Brazil (id=1)
        setLoadingStates(true);
        apiClient.get(`/locations/countries/${countryIdToUse}/states`)
            .then(response => {
                setStates(response.data);
            })
            .catch(error => {
                console.error('Error fetching states:', error);
            })
            .finally(() => {
                setLoadingStates(false);
            });
    }, [selectedCountryId]);

    // Fetch cities when state changes
    React.useEffect(() => {
        if (selectedStateId) {
            setLoadingCities(true);
            apiClient.get(`/locations/states/${selectedStateId}/cities`)
                .then(response => {
                    setCities(response.data);
                })
                .catch(error => {
                    console.error('Error fetching cities:', error);
                })
                .finally(() => {
                    setLoadingCities(false);
                });
        } else {
            setCities([]);
        }
    }, [selectedStateId]);

    // Hydrate country ID from initial name
    React.useEffect(() => {
        if (initialCountryName && countries.length > 0 && !selectedCountryId && onCountryChange) {
            const country = countries.find(c => c.name.toLowerCase() === initialCountryName.toLowerCase());
            if (country) {
                onCountryChange(country.id, country.name);
            }
        }
    }, [initialCountryName, countries, selectedCountryId, onCountryChange]);

    // Hydrate state ID from initial UF
    React.useEffect(() => {
        if (initialStateUf && states.length > 0 && !selectedStateId) {
            const state = states.find(s => s.uf.toLowerCase() === initialStateUf.toLowerCase());
            if (state) {
                onStateChange(state.id, state.name, state.uf);
            }
        }
    }, [initialStateUf, states, selectedStateId, onStateChange]);

    // Hydrate city ID from initial name
    React.useEffect(() => {
        if (initialCityName && cities.length > 0 && selectedStateId && !selectedCityId) {
            const city = cities.find(c => c.name.toLowerCase() === initialCityName.toLowerCase());
            if (city) {
                onCityChange(city.id, city.name, city.ddd);
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
                    <Popover open={openCountry} onOpenChange={setOpenCountry}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openCountry}
                                className="w-full justify-between"
                                disabled={isDisabled || loadingCountries}
                            >
                                {selectedCountryId
                                    ? countries.find((country) => country.id === selectedCountryId)?.name
                                    : loadingCountries ? "Carregando..." : "Selecione o país"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                            <Command>
                                <CommandInput placeholder="Buscar país..." />
                                <CommandList>
                                    <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
                                    <CommandGroup>
                                        {countries.map((country) => (
                                            <CommandItem
                                                key={country.id}
                                                value={country.name}
                                                onSelect={() => {
                                                    onCountryChange(country.id, country.name)
                                                    setOpenCountry(false)
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedCountryId === country.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {country.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            )}

            <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Estado
                </label>
                <Popover open={openState} onOpenChange={setOpenState}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openState}
                            className="w-full justify-between"
                            disabled={isDisabled || loadingStates}
                        >
                            {selectedStateId
                                ? states.find((state) => state.id === selectedStateId)?.name + " (" + states.find((state) => state.id === selectedStateId)?.uf + ")"
                                : loadingStates ? "Carregando..." : !selectedCountryId && onCountryChange ? "Selecione o país" : "Selecione o estado"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                        <Command>
                            <CommandInput placeholder="Buscar estado..." />
                            <CommandList>
                                <CommandEmpty>Nenhum estado encontrado.</CommandEmpty>
                                <CommandGroup>
                                    {states.map((state) => (
                                        <CommandItem
                                            key={state.id}
                                            value={`${state.name} ${state.uf}`}
                                            onSelect={() => {
                                                onStateChange(state.id, state.name, state.uf)
                                                setOpenState(false)
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedStateId === state.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {state.name} ({state.uf})
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Cidade
                </label>
                <Popover open={openCity} onOpenChange={setOpenCity}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCity}
                            className="w-full justify-between"
                            disabled={isDisabled || !selectedStateId || loadingCities}
                        >
                            {selectedCityId
                                ? cities.find((city) => city.id === selectedCityId)?.name
                                : !selectedStateId ? "Selecione o estado primeiro" : loadingCities ? "Carregando..." : "Selecione a cidade"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                        <Command>
                            <CommandInput placeholder="Buscar cidade..." />
                            <CommandList>
                                <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                                <CommandGroup>
                                    {cities.map((city) => (
                                        <CommandItem
                                            key={city.id}
                                            value={city.name}
                                            onSelect={() => {
                                                onCityChange(city.id, city.name, city.ddd)
                                                setOpenCity(false)
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    selectedCityId === city.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {city.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    )
}
