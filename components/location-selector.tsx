
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Select, SelectItem } from "@heroui/react"
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
                    <Select
                        label="País"
                        placeholder={loadingCountries ? "Carregando..." : "Selecione o país"}
                        isDisabled={isDisabled || loadingCountries}
                        selectedKeys={selectedCountryId ? [selectedCountryId.toString()] : []}
                        onSelectionChange={(keys) => {
                            const key = Array.from(keys)[0];
                            if (key) {
                                const countryId = parseInt(key.toString())
                                const country = countries.find(c => c.id === countryId)
                                if (country && onCountryChange) {
                                    onCountryChange(countryId, country.name)
                                }
                            }
                        }}
                        className="w-full"
                        variant="bordered"
                        scrollShadowProps={{
                            isEnabled: false
                        }}
                        listboxProps={{
                            emptyContent: "Nenhum país encontrado",
                        }}
                        popoverProps={{
                            classNames: {
                                content: "max-h-[300px]"
                            }
                        }}
                    >
                        {countries.map((country) => (
                            <SelectItem key={country.id} value={country.id.toString()}>
                                {country.name}
                            </SelectItem>
                        ))}
                    </Select>
                </div>
            )}

            <div className="space-y-2">
                <Select
                    label="Estado"
                    placeholder={loadingStates ? "Carregando..." : !selectedCountryId && onCountryChange ? "Selecione o país" : "Selecione o estado"}
                    isDisabled={isDisabled || loadingStates}
                    selectedKeys={selectedStateId ? [selectedStateId.toString()] : []}
                    onSelectionChange={(keys) => {
                        const key = Array.from(keys)[0];
                        if (key) {
                            const stateId = parseInt(key.toString())
                            const state = states.find(s => s.id === stateId)
                            if (state) {
                                onStateChange(stateId, state.name, state.uf)
                            }
                        }
                    }}
                    className="w-full"
                    variant="bordered"
                    scrollShadowProps={{
                        isEnabled: false
                    }}
                    listboxProps={{
                        emptyContent: "Nenhum estado encontrado",
                    }}
                    popoverProps={{
                        classNames: {
                            content: "max-h-[300px]"
                        }
                    }}
                >
                    {states.map((state) => (
                        <SelectItem key={state.id} value={state.id.toString()}>
                            {state.name} ({state.uf})
                        </SelectItem>
                    ))}
                </Select>
            </div>

            <div className="space-y-2">
                <Select
                    label="Cidade"
                    placeholder={!selectedStateId ? "Selecione o estado primeiro" : loadingCities ? "Carregando..." : "Selecione a cidade"}
                    isDisabled={isDisabled || !selectedStateId || loadingCities}
                    selectedKeys={selectedCityId ? [selectedCityId.toString()] : []}
                    onSelectionChange={(keys) => {
                        const key = Array.from(keys)[0];
                        if (key) {
                            const cityId = parseInt(key.toString())
                            const city = cities.find(c => c.id === cityId)
                            if (city) {
                                onCityChange(cityId, city.name, city.ddd)
                            }
                        }
                    }}
                    className="w-full"
                    variant="bordered"
                    scrollShadowProps={{
                        isEnabled: false
                    }}
                    listboxProps={{
                        emptyContent: "Nenhuma cidade encontrada",
                    }}
                    popoverProps={{
                        classNames: {
                            content: "max-h-[300px]"
                        }
                    }}
                >
                    {cities.map((city) => (
                        <SelectItem key={city.id} value={city.id.toString()}>
                            {city.name}
                        </SelectItem>
                    ))}
                </Select>
            </div>
        </div>
    )
}
