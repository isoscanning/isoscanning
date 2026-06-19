"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus, X, ChevronDown, ChevronUp, MapPin, Globe,
  CalendarDays, Tag, Search, Loader2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  HolidayType, HolidayItem, GlobalEvent, SelectedHoliday,
  STATE_HOLIDAYS, CITY_HOLIDAYS, GLOBAL_EVENTS,
  getHolidaysForMonth, getEventsForMonth, buildFullDate,
} from "@/lib/holidays-data";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiEvent {
  name: string;
  category: "esporte" | "politica" | "cultura" | "comercial";
  date: string;
  emoji: string;
  description: string;
}

interface SearchDate {
  name: string;
  date: string;
  description: string;
  category: string;
  emoji?: string;
}

// ─── Config maps ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<HolidayType | "evento", string> = {
  nacional: "Nacional", estadual: "Estadual", municipal: "Municipal",
  comercial: "Comercial", evento: "Evento", custom: "Personalizado",
};

const TYPE_COLORS: Record<HolidayType | "evento", string> = {
  nacional:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  estadual:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  municipal: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  comercial: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  evento:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  custom:    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const EVENT_CATEGORY: Record<GlobalEvent["category"], { label: string; color: string }> = {
  esporte:   { label: "Esporte",    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  politica:  { label: "Política",   color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  cultura:   { label: "Cultura",    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  comercial: { label: "Comercial",  color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
};

const SEARCH_CATEGORY: Record<string, { label: string; color: string; emoji: string }> = {
  familia:      { label: "Família",       color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",             emoji: "👨‍👩‍👧‍👦" },
  religiao:     { label: "Religião",      color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",     emoji: "🙏" },
  saude:        { label: "Saúde",         color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",         emoji: "❤️" },
  cultura:      { label: "Cultura",       color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",     emoji: "🎭" },
  esporte:      { label: "Esporte",       color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",     emoji: "🏆" },
  negocio:      { label: "Negócios",      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",             emoji: "💼" },
  educacao:     { label: "Educação",      color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",             emoji: "📚" },
  meio_ambiente:{ label: "Meio Ambiente", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", emoji: "🌱" },
  outros:       { label: "Outros",        color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",                emoji: "📅" },
};

const SEARCH_SUGGESTIONS = [
  "datas religiosas", "família", "meio ambiente", "saúde e bem-estar",
  "gastronomia", "música e arte", "esporte e fitness", "negócios e empreendedorismo",
  "educação", "diversidade e inclusão",
];

type Tab = "nacionais" | "estaduais" | "eventos" | "personalizado";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
}

function fmtShortDate(d: string) {
  // MM-DD → DD/MM
  const parts = d.split("-");
  if (parts.length === 2) return `${parts[1]}/${parts[0]}`;
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return d;
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
      checked ? "border-blue-500 bg-blue-500" : "border-muted-foreground/40"
    }`}>
      {checked && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
    </div>
  );
}

function SkeletonEvent() {
  return (
    <div className="w-full flex items-start gap-3 p-3 rounded-lg border border-border animate-pulse">
      <div className="w-4 h-4 rounded bg-muted mt-0.5 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-muted rounded w-2/3" />
        <div className="h-2.5 bg-muted rounded w-full" />
        <div className="h-2 bg-muted rounded w-1/3" />
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  month: number;
  year: number;
  value: SelectedHoliday[];
  onChange: (h: SelectedHoliday[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HolidayPicker({ month, year, value, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("nacionais");

  // Estaduais state
  const [selectedState, setSelectedState] = useState("");
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [municipalities, setMunicipalities] = useState<{ id: number; nome: string }[]>([]);
  const [municipalitiesLoading, setMunicipalitiesLoading] = useState(false);
  const [municipalitySearch, setMunicipalitySearch] = useState("");
  const [cityAiHolidays, setCityAiHolidays] = useState<Record<string, Array<{ name: string; date: string; description?: string }>>>({});
  const [cityHolidaysLoading, setCityHolidaysLoading] = useState<string[]>([]);

  // Personalizado state
  const [customName, setCustomName] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);

  // Eventos AI state
  const [aiEvents, setAiEvents] = useState<AiEvent[]>([]);
  const [aiEventsLoading, setAiEventsLoading] = useState(false);
  const aiCacheKey = useRef("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchDate[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Fetch all municipalities from IBGE when state changes
  useEffect(() => {
    if (!selectedState) { setMunicipalities([]); setSelectedCities([]); return; }
    setMunicipalitiesLoading(true);
    setSelectedCities([]);
    setMunicipalitySearch("");
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios?orderBy=nome`)
      .then((r) => r.json())
      .then((data: { id: number; nome: string }[]) => setMunicipalities(data))
      .catch(() => setMunicipalities([]))
      .finally(() => setMunicipalitiesLoading(false));
  }, [selectedState]);

  // Load AI events when eventos tab opens (cached per month/year)
  useEffect(() => {
    if (activeTab !== "eventos") return;
    const key = `${month}-${year}`;
    if (aiCacheKey.current === key) return;
    aiCacheKey.current = key;
    setAiEventsLoading(true);
    setAiEvents([]);

    fetch("/api/social-media/events-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, year }),
    })
      .then((r) => r.json())
      .then((d) => setAiEvents(d.events ?? []))
      .catch(() => setAiEvents([]))
      .finally(() => setAiEventsLoading(false));
  }, [activeTab, month, year]);

  // AI search with debounce
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/social-media/holidays-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery }),
        });
        const data = await res.json();
        const allDates: SearchDate[] = data.dates ?? [];
        setSearchResults(allDates.filter((d) => {
          const full = d.date.length === 10 ? d.date : `${year}-${d.date}`;
          return full >= todayStr;
        }));
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 600);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [searchQuery]);

  // Derived data
  const monthHolidays = getHolidaysForMonth(month, year);
  const monthEvents = getEventsForMonth(month, year);
  const stateOptions = Object.entries(STATE_HOLIDAYS).sort((a, b) => a[1].label.localeCompare(b[1].label));
  const stateHolidays: HolidayItem[] = selectedState ? STATE_HOLIDAYS[selectedState]?.holidays ?? [] : [];
  const filteredMunicipalities = municipalitySearch.trim()
    ? municipalities.filter((m) => m.nome.toLowerCase().includes(municipalitySearch.toLowerCase()))
    : municipalities;
  const displayBaseEvents = monthEvents.length > 0 ? monthEvents : GLOBAL_EVENTS;

  const filteredMonthHolidays = monthHolidays.filter((h) => buildFullDate(h.date, year) >= todayStr);
  const filteredStateHolidays = stateHolidays.filter((h) => buildFullDate(h.date, year) >= todayStr);
  const filteredDisplayBaseEvents = displayBaseEvents.filter((ev) => (ev.endDate ?? ev.startDate) >= todayStr);

  // Normalize string for matching city names (remove accents)
  function norm(s: string) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  }

  // Look up CITY_HOLIDAYS data for a city name + current state
  function lookupCityHolidays(cityName: string): HolidayItem[] {
    for (const [, data] of Object.entries(CITY_HOLIDAYS)) {
      if (data.state === selectedState && norm(data.label) === norm(cityName)) {
        return data.holidays;
      }
    }
    return [];
  }

  // All holidays from selected cities that have data
  const allCityHolidays: { holiday: HolidayItem; city: string }[] = selectedCities.flatMap((cityName) =>
    lookupCityHolidays(cityName).map((h) => ({ holiday: h, city: cityName }))
  );

  function toggleCity(cityName: string) {
    const isAdding = !selectedCities.includes(cityName);
    setSelectedCities((prev) =>
      isAdding ? [...prev, cityName] : prev.filter((c) => c !== cityName)
    );

    if (isAdding && cityAiHolidays[cityName] === undefined && !cityHolidaysLoading.includes(cityName)) {
      setCityHolidaysLoading((prev) => [...prev, cityName]);
      fetch("/api/social-media/city-holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityName, state: selectedState, year }),
      })
        .then((r) => r.json())
        .then((d) => setCityAiHolidays((prev) => ({ ...prev, [cityName]: d.holidays ?? [] })))
        .catch(() => setCityAiHolidays((prev) => ({ ...prev, [cityName]: [] })))
        .finally(() => setCityHolidaysLoading((prev) => prev.filter((c) => c !== cityName)));
    }
  }

  // ── Selection helpers ──
  function isSelected(key: string) { return value.some((h) => h.key === key); }

  function toggleHoliday(item: HolidayItem, location?: string) {
    if (isSelected(item.key)) {
      onChange(value.filter((h) => h.key !== item.key));
    } else {
      onChange([...value, { key: item.key, date: buildFullDate(item.date, year), name: item.name, type: item.type, location }]);
    }
  }

  function toggleEvent(ev: GlobalEvent) {
    if (isSelected(ev.key)) {
      onChange(value.filter((h) => h.key !== ev.key));
    } else {
      onChange([...value, { key: ev.key, date: ev.startDate, name: ev.name, type: "evento" }]);
    }
  }

  function toggleAiEvent(ev: AiEvent, idx: number) {
    const key = `ai-ev-${idx}-${ev.name.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`;
    if (isSelected(key)) {
      onChange(value.filter((h) => h.key !== key));
    } else {
      onChange([...value, { key, date: ev.date, name: ev.name, type: "evento" }]);
    }
  }

  function addSearchResult(result: SearchDate) {
    const key = `search-${result.date}-${result.name.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`;
    if (isSelected(key)) return;
    onChange([...value, { key, date: buildFullDate(result.date, year), name: result.name, type: "comercial" }]);
  }

  function addCustom() {
    if (!customName.trim() || !customDate) return;
    onChange([...value, { key: `custom-${customDate}-${Date.now()}`, date: customDate, name: customName.trim(), type: "custom" }]);
    setCustomName("");
    setCustomDate("");
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "nacionais",    label: "Nacionais",             icon: <CalendarDays className="h-3.5 w-3.5" /> },
    { key: "estaduais",    label: "Estaduais / Municipais", icon: <MapPin className="h-3.5 w-3.5" /> },
    { key: "eventos",      label: "Eventos",               icon: <Globe className="h-3.5 w-3.5" /> },
    { key: "personalizado",label: "Personalizado",          icon: <Tag className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-3">
      {/* ── Toggle header ── */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
          isOpen || value.length > 0
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-border hover:border-blue-300"
        }`}
      >
        <div className="flex items-center gap-3">
          <CalendarDays className={`h-4 w-4 shrink-0 ${
            isOpen || value.length > 0 ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
          }`} />
          <div>
            <p className={`text-sm font-medium ${
              isOpen || value.length > 0 ? "text-blue-700 dark:text-blue-300" : "text-foreground"
            }`}>
              Feriados e Datas Especiais
            </p>
            <p className="text-xs text-muted-foreground">
              {value.length === 0
                ? "Nacionais, estaduais, municipais e eventos globais"
                : `${value.length} data${value.length > 1 ? "s" : ""} selecionada${value.length > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        {isOpen
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {/* ── Selected chips ── */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {value.map((h) => (
            <span key={h.key} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${TYPE_COLORS[h.type]}`}>
              <span>{fmtDate(h.date)} · {h.name}</span>
              {h.location && <span className="opacity-70">({h.location})</span>}
              <button type="button" onClick={() => onChange(value.filter((x) => x.key !== h.key))} className="ml-0.5 hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Expanded panel ── */}
      {isOpen && (
        <div className="rounded-xl border border-border overflow-hidden bg-card">

          {/* Tab bar — scrollbar hidden */}
          <div
            className="flex border-b border-border overflow-x-auto bg-muted/30 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-background"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {/* Content — scrollbar hidden */}
          <div
            className="p-4 max-h-80 overflow-y-auto space-y-2 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >

            {/* ── Nacionais ── */}
            {activeTab === "nacionais" && (
              filteredMonthHolidays.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum feriado ou data comemorativa neste mês.
                </p>
              ) : (
                filteredMonthHolidays.map((h) => {
                  const sel = isSelected(h.key);
                  return (
                    <button
                      key={h.key} type="button" onClick={() => toggleHoliday(h)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                        sel ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-border hover:border-blue-300"
                      }`}
                    >
                      <CheckBox checked={sel} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{h.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {fmtDate(buildFullDate(h.date, year))}
                          {" · "}
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${TYPE_COLORS[h.type]}`}>
                            {TYPE_LABELS[h.type]}
                          </span>
                        </p>
                      </div>
                    </button>
                  );
                })
              )
            )}

            {/* ── Estaduais / Municipais ── */}
            {activeTab === "estaduais" && (
              <div className="space-y-3">

                {/* State selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Estado</Label>
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione o estado..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stateOptions.map(([abbr, data]) => (
                        <SelectItem key={abbr} value={abbr}>{data.label} ({abbr})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Municipality multi-select */}
                {selectedState && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">
                        Municípios
                        {selectedCities.length > 0 && (
                          <span className="ml-2 text-blue-600 dark:text-blue-400 font-semibold">
                            {selectedCities.length} selecionado{selectedCities.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </Label>
                      {selectedCities.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedCities([])}
                          className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Limpar seleção
                        </button>
                      )}
                    </div>

                    {/* Search input */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                      <Input
                        className="pl-7 h-8 text-xs"
                        placeholder="Filtrar município..."
                        value={municipalitySearch}
                        onChange={(e) => setMunicipalitySearch(e.target.value)}
                      />
                    </div>

                    {/* Scrollable list */}
                    <div
                      className="border border-border rounded-lg overflow-y-auto [&::-webkit-scrollbar]:hidden"
                      style={{ maxHeight: 180, scrollbarWidth: "none" }}
                    >
                      {municipalitiesLoading ? (
                        <div className="flex items-center justify-center gap-2 py-5 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Carregando municípios...
                        </div>
                      ) : filteredMunicipalities.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-5">
                          {municipalitySearch ? `Nenhum resultado para "${municipalitySearch}"` : "Nenhum município encontrado."}
                        </p>
                      ) : (
                        filteredMunicipalities.map((mun) => {
                          const checked = selectedCities.includes(mun.nome);
                          return (
                            <button
                              key={mun.id}
                              type="button"
                              onClick={() => toggleCity(mun.nome)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors border-b border-border/40 last:border-0 text-left ${
                                checked
                                  ? "bg-blue-50 dark:bg-blue-900/15"
                                  : "hover:bg-muted/50"
                              }`}
                            >
                              <CheckBox checked={checked} />
                              <span className={checked ? "text-blue-700 dark:text-blue-300 font-medium" : ""}>
                                {mun.nome}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Selected cities chips */}
                    {selectedCities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {selectedCities.map((city) => (
                          <span key={city} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 font-medium">
                            {city}
                            <button type="button" onClick={() => toggleCity(city)} className="hover:opacity-70">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Holidays list */}
                {!selectedState ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Selecione um estado para ver os feriados regionais.
                  </p>
                ) : (filteredStateHolidays.length === 0 && allCityHolidays.length === 0 && selectedCities.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum feriado cadastrado para a seleção. Use a aba Personalizado para adicionar.
                  </p>
                ) : (
                  <div className="space-y-2 pt-1">
                    {/* State holidays */}
                    {filteredStateHolidays.length > 0 && (
                      <>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Feriados estaduais — {STATE_HOLIDAYS[selectedState]?.label}
                        </p>
                        {filteredStateHolidays.map((h) => {
                          const sel = isSelected(h.key);
                          return (
                            <button
                              key={h.key} type="button"
                              onClick={() => toggleHoliday(h, STATE_HOLIDAYS[selectedState]?.label)}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                                sel ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-border hover:border-blue-300"
                              }`}
                            >
                              <CheckBox checked={sel} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-tight">{h.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {fmtDate(buildFullDate(h.date, year))}
                                  {" · "}
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${TYPE_COLORS[h.type]}`}>
                                    {TYPE_LABELS[h.type]}
                                  </span>
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </>
                    )}

                    {/* Per-city: static + AI holidays */}
                    {selectedCities.map((cityName) => {
                      const staticHols = allCityHolidays.filter(
                        (x) => x.city === cityName && buildFullDate(x.holiday.date, year) >= todayStr
                      );
                      const aiHols = (cityAiHolidays[cityName] ?? []).filter((h) => {
                        const full = h.date.length === 10 ? h.date : buildFullDate(h.date, year);
                        return full >= todayStr;
                      });
                      const isLoading = cityHolidaysLoading.includes(cityName);
                      const hasAny = staticHols.length > 0 || aiHols.length > 0;

                      return (
                        <div key={cityName} className="space-y-1.5 pt-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {cityName}
                            </p>
                            {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                          </div>

                          {/* Static holidays from CITY_HOLIDAYS */}
                          {staticHols.map(({ holiday: h }) => {
                            const key = `city-${norm(cityName).replace(/\s/g, "-")}-${h.key}`;
                            const sel = value.some((x) => x.key === key);
                            return (
                              <button
                                key={key} type="button"
                                onClick={() => sel
                                  ? onChange(value.filter((x) => x.key !== key))
                                  : onChange([...value, { key, date: buildFullDate(h.date, year), name: h.name, type: h.type, location: cityName }])
                                }
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                                  sel ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20" : "border-border hover:border-teal-300"
                                }`}
                              >
                                <CheckBox checked={sel} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium leading-tight">{h.name}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {fmtDate(buildFullDate(h.date, year))}
                                    {" · "}
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${TYPE_COLORS[h.type]}`}>
                                      {TYPE_LABELS[h.type]}
                                    </span>
                                  </p>
                                </div>
                              </button>
                            );
                          })}

                          {/* AI-fetched holidays */}
                          {!isLoading && aiHols.map((h, idx) => {
                            const key = `ai-city-${norm(cityName).replace(/\s/g, "-")}-${idx}`;
                            const sel = value.some((x) => x.key === key);
                            return (
                              <button
                                key={key} type="button"
                                onClick={() => sel
                                  ? onChange(value.filter((x) => x.key !== key))
                                  : onChange([...value, { key, date: buildFullDate(h.date, year), name: h.name, type: "municipal", location: cityName }])
                                }
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                                  sel ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20" : "border-border hover:border-teal-300"
                                }`}
                              >
                                <CheckBox checked={sel} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium leading-tight">{h.name}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {fmtShortDate(h.date)}
                                    {h.description && ` · ${h.description}`}
                                    {" · "}
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-purple-600 dark:text-purple-400">IA</span>
                                  </p>
                                </div>
                              </button>
                            );
                          })}

                          {/* Skeleton while loading */}
                          {isLoading && (
                            <div className="space-y-1.5">
                              {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border animate-pulse">
                                  <div className="w-4 h-4 rounded bg-muted shrink-0" />
                                  <div className="flex-1 space-y-1.5">
                                    <div className="h-3 bg-muted rounded w-2/3" />
                                    <div className="h-2.5 bg-muted rounded w-1/3" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {!isLoading && !hasAny && (
                            <p className="text-[11px] text-muted-foreground px-1 pb-1">
                              Nenhum feriado encontrado para {cityName}.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Eventos ── */}
            {activeTab === "eventos" && (
              <div className="space-y-2">
                {/* Hardcoded catalog */}
                {filteredDisplayBaseEvents.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1">
                      {monthEvents.length > 0 ? "Eventos do período" : "Catálogo de eventos"}
                    </p>
                    {filteredDisplayBaseEvents.map((ev) => {
                      const sel = isSelected(ev.key);
                      const cat = EVENT_CATEGORY[ev.category];
                      return (
                        <button
                          key={ev.key} type="button" onClick={() => toggleEvent(ev)}
                          className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${
                            sel ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-border hover:border-blue-300"
                          }`}
                        >
                          <div className="mt-0.5"><CheckBox checked={sel} /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-base leading-none">{ev.emoji}</span>
                              <p className="text-sm font-medium leading-tight">{ev.name}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{ev.description}</p>
                            <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                              {fmtDate(ev.startDate)}{ev.endDate && ev.endDate !== ev.startDate ? ` – ${fmtDate(ev.endDate)}` : ""}
                              {" · "}
                              <span className={`px-1.5 py-0.5 rounded font-semibold ${cat.color}`}>{cat.label}</span>
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}

                {/* AI-generated suggestions */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 pb-2">
                    <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Sugestões da IA para este período
                    </p>
                    {aiEventsLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />}
                  </div>

                  {aiEventsLoading && (
                    <div className="space-y-2">
                      <SkeletonEvent />
                      <SkeletonEvent />
                      <SkeletonEvent />
                    </div>
                  )}

                  {!aiEventsLoading && aiEvents.filter((ev) => {
                    const full = ev.date.length === 10 ? ev.date : buildFullDate(ev.date, year);
                    return full >= todayStr;
                  }).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      Nenhuma sugestão gerada para este período.
                    </p>
                  )}

                  {!aiEventsLoading && aiEvents.filter((ev) => {
                    const full = ev.date.length === 10 ? ev.date : buildFullDate(ev.date, year);
                    return full >= todayStr;
                  }).map((ev, idx) => {
                    const key = `ai-ev-${idx}-${ev.name.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`;
                    const sel = isSelected(key);
                    const cat = EVENT_CATEGORY[ev.category] ?? { label: ev.category, color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" };
                    return (
                      <button
                        key={key} type="button" onClick={() => toggleAiEvent(ev, idx)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${
                          sel ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" : "border-border hover:border-purple-300"
                        }`}
                      >
                        <div className="mt-0.5">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                            sel ? "border-purple-500 bg-purple-500" : "border-muted-foreground/40"
                          }`}>
                            {sel && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">{ev.emoji || "📅"}</span>
                            <p className="text-sm font-medium leading-tight">{ev.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{ev.description}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                            {ev.date.length >= 10 ? fmtDate(ev.date) : ev.date}
                            {" · "}
                            <span className={`px-1.5 py-0.5 rounded font-semibold ${cat.color}`}>{cat.label}</span>
                            {" · "}
                            <span className="text-purple-500 font-medium">IA</span>
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Personalizado ── */}
            {activeTab === "personalizado" && (
              <div className="space-y-4">
                {/* Search field */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      className="pl-9 pr-9 h-9 text-sm"
                      placeholder="Ex: datas religiosas, família, meio ambiente..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    )}
                    {searchQuery && !searchLoading && (
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Suggestion chips */}
                  {searchQuery.length === 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {SEARCH_SUGGESTIONS.map((s) => (
                        <button
                          key={s} type="button"
                          onClick={() => setSearchQuery(s)}
                          className="text-[11px] px-2.5 py-1 rounded-full border border-border hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-muted-foreground hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI search results */}
                {searchQuery.length >= 3 && (
                  <div className="space-y-2">
                    {searchLoading && (
                      <div className="space-y-2">
                        <SkeletonEvent />
                        <SkeletonEvent />
                        <SkeletonEvent />
                      </div>
                    )}

                    {!searchLoading && searchResults.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        Nenhum resultado para "{searchQuery}". Tente outro termo.
                      </p>
                    )}

                    {!searchLoading && searchResults.length > 0 && (
                      <>
                        <div className="flex items-center gap-1.5 pb-1">
                          <Sparkles className="h-3 w-3 text-purple-500" />
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">{searchResults.length} datas</span> encontradas para "{searchQuery}"
                          </p>
                        </div>
                        {searchResults.map((result, idx) => {
                          const cat = SEARCH_CATEGORY[result.category] ?? SEARCH_CATEGORY.outros;
                          const key = `search-${result.date}-${result.name.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`;
                          const alreadyAdded = isSelected(key);
                          return (
                            <div
                              key={idx}
                              className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                                alreadyAdded
                                  ? "border-green-500/50 bg-green-50 dark:bg-green-900/10"
                                  : "border-border bg-card"
                              }`}
                            >
                              <span className="text-xl leading-none mt-0.5 shrink-0">
                                {result.emoji || cat.emoji}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-tight">{result.name}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                                      {result.description}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <span className="text-xs font-semibold text-muted-foreground/80 font-mono">
                                      {fmtShortDate(result.date)}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${cat.color}`}>
                                      {cat.label}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => addSearchResult(result)}
                                      disabled={alreadyAdded}
                                      className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                                        alreadyAdded
                                          ? "bg-green-500 text-white cursor-default"
                                          : "bg-blue-600 hover:bg-blue-700 text-white"
                                      }`}
                                    >
                                      {alreadyAdded
                                        ? <span className="text-[10px] font-bold">✓</span>
                                        : <Plus className="h-3 w-3" />}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}

                {/* Divider + manual form */}
                <div className="border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => setShowManualForm((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className={`h-3.5 w-3.5 transition-transform ${showManualForm ? "rotate-45" : ""}`} />
                    Não encontrou? Adicionar data manualmente
                  </button>

                  {showManualForm && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Data</Label>
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={customDate}
                            onChange={(e) => setCustomDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Nome do feriado / evento</Label>
                          <Input
                            className="h-8 text-xs"
                            placeholder="Ex: Fundação da Cidade"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addCustom()}
                          />
                        </div>
                      </div>
                      <Button
                        type="button" size="sm" onClick={addCustom}
                        disabled={!customName.trim() || !customDate}
                        className="w-full gap-2"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar
                      </Button>
                    </div>
                  )}
                </div>

                {/* Custom entries list */}
                {value.filter((h) => h.type === "custom").length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground">Adicionados manualmente:</p>
                    {value.filter((h) => h.type === "custom").map((h) => (
                      <div key={h.key} className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/30 text-xs">
                        <span className="font-medium">{fmtDate(h.date)} · {h.name}</span>
                        <button type="button" onClick={() => onChange(value.filter((x) => x.key !== h.key))} className="ml-2 text-muted-foreground hover:text-destructive">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

