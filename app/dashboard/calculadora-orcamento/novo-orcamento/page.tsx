"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, ArrowRight, Check, ChevronRight,
  FileText, Clock, Utensils, Hotel, Users, Truck,
  PlusCircle, Trash2, Info, Car, Plane, Bus,
  MapPin, Fuel, Calculator, Loader2, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import apiClient from "@/lib/api-service";
import { ScrollReveal } from "@/components/scroll-reveal";

declare global {
  interface Window { google: any; }
}

// ── Types ──────────────────────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  hourlyRate: string;
  coverageHours: string;
}

function newStaffMember(): StaffMember {
  return {
    id: Math.random().toString(36).slice(2),
    name: "",
    hourlyRate: "",
    coverageHours: "8",
  };
}

interface AccomGroup {
  id: string;
  name: string;
  type: "single" | "double" | "triple" | "property";
  dailyRate: string;
  days: string;
  memberIds: string[];
}

interface TeamTransport {
  id: string;
  name: string;
  type: "air" | "ground" | "own_vehicle";
  cost: string;
  origin: string;
  destination: string;
  gasPrice: string;
  kmPerLiter: string;
  axles: string;
  routeType: "fastest" | "shortest";
  distanceKm: string;
  durationMinutes: string;
  fuelCost: string;
  tollCost: string;
  routeCalculated: boolean;
  roundTrip: boolean;
  memberIds: string[];
}

function newTeamTransport(): TeamTransport {
  return {
    id: Math.random().toString(36).slice(2),
    name: "",
    type: "air",
    cost: "",
    origin: "",
    destination: "",
    gasPrice: "",
    kmPerLiter: "",
    axles: "2",
    routeType: "fastest",
    distanceKm: "",
    durationMinutes: "",
    fuelCost: "",
    tollCost: "",
    routeCalculated: false,
    roundTrip: false,
    memberIds: [],
  };
}

interface BudgetSnapshot {
  equipmentCostPerJob: number;
  softwareMonthlyCost: number;
  infrastructureMonthlyCost: number;
}

interface FormState {
  // Step 1 – Evento
  eventName: string;
  eventLocation: string;
  eventDate: string;
  coverageHours: string;

  // Step 2 – Mão de obra
  hourlyRate: string;
  jobsPerMonth: string;

  // Step 4 – Equipe
  staffMembers: StaffMember[];

  // Step 3 – Hospedagem & Alimentação (pessoal)
  hasAccommodation: boolean;
  accommodationDailyRate: string;
  accommodationDays: string;
  hasFood: boolean;
  foodCostPerMeal: string;
  foodMeals: string;

  // Step 3 – Hospedagem da equipe
  hasTeamAccommodation: boolean;
  teamAccommMode: "individual" | "grouped";
  teamAccommEntries: { memberId: string; dailyRate: string; days: string }[];
  teamAccommGroups: AccomGroup[];

  // Step 3 – Alimentação da equipe
  hasTeamFood: boolean;
  teamFoodMode: "same" | "individual";
  teamFoodPerMeal: string;
  teamFoodMeals: string;
  teamFoodEntries: { memberId: string; costPerMeal: string; meals: string }[];

  // Step 5 – Transporte (pessoal)
  transportType: "none" | "air" | "ground" | "own_vehicle";
  transportCost: string;
  transportOrigin: string;
  transportDestination: string;
  transportGasPrice: string;
  transportKmPerLiter: string;
  transportAxles: string;
  transportRouteType: "fastest" | "shortest";
  transportDistanceKm: string;
  transportDurationMinutes: string;
  transportFuelCost: string;
  transportTollCost: string;
  transportRouteCalculated: boolean;
  transportRoundTrip: boolean;
  myTransportPassengers: string[];

  // Step 5 – Transporte da equipe
  hasTeamTransport: boolean;
  teamTransports: TeamTransport[];

  // Step 6 – Custos extras
  extraCosts: { name: string; value: string }[];
}

const INITIAL_FORM: FormState = {
  eventName: "",
  eventLocation: "",
  eventDate: "",
  coverageHours: "8",
  hourlyRate: "",
  jobsPerMonth: "4",
  staffMembers: [],
  hasAccommodation: false,
  accommodationDailyRate: "",
  accommodationDays: "1",
  hasFood: false,
  foodCostPerMeal: "",
  foodMeals: "2",
  hasTeamAccommodation: false,
  teamAccommMode: "individual",
  teamAccommEntries: [],
  teamAccommGroups: [],
  hasTeamFood: false,
  teamFoodMode: "same",
  teamFoodPerMeal: "",
  teamFoodMeals: "2",
  teamFoodEntries: [],
  transportType: "none",
  transportCost: "",
  transportOrigin: "",
  transportDestination: "",
  transportGasPrice: "",
  transportKmPerLiter: "",
  transportAxles: "2",
  transportRouteType: "fastest",
  transportDistanceKm: "",
  transportDurationMinutes: "",
  transportFuelCost: "",
  transportTollCost: "",
  transportRouteCalculated: false,
  transportRoundTrip: false,
  myTransportPassengers: [],
  hasTeamTransport: false,
  teamTransports: [],
  extraCosts: [],
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Parse BRL-formatted strings like "6,50" or "1.200,50" to number
function n(v: string) {
  return Number(v.replace(/\./g, "").replace(",", ".")) || 0;
}

// Format number input as BRL currency while typing
function applyBRLMask(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Map API quote back to FormState (for edit mode) ───────────

function mapQuoteToForm(q: any): FormState {
  const staff = q.additionalStaff ?? {};
  const members: StaffMember[] = (staff.members ?? []).map((m: any) => ({
    id: m.id ?? Math.random().toString(36).slice(2),
    name: m.name ?? "",
    hourlyRate: applyBRLMask(String(Math.round((m.hourlyRate ?? 0) * 100))),
    coverageHours: String(m.coverageHours ?? 8),
  }));
  const teamAccom = staff.teamAccommodation ?? {};
  const teamFood = staff.teamFood ?? {};
  const transport = q.transport ?? { type: "none" };

  return {
    eventName: q.eventName ?? "",
    eventLocation: q.eventLocation ?? "",
    eventDate: q.eventDate ? q.eventDate.split("T")[0] : "",
    coverageHours: String(q.coverageHours ?? 8),
    hourlyRate: applyBRLMask(String(Math.round((q.hourlyRate ?? 0) * 100))),
    jobsPerMonth: String(q.jobsPerMonth ?? 4),
    staffMembers: members,
    hasAccommodation: q.accommodation?.enabled ?? false,
    accommodationDailyRate: applyBRLMask(String(Math.round((q.accommodation?.dailyRate ?? 0) * 100))),
    accommodationDays: String(q.accommodation?.days ?? 1),
    hasFood: q.food?.enabled ?? false,
    foodCostPerMeal: applyBRLMask(String(Math.round((q.food?.costPerMeal ?? 0) * 100))),
    foodMeals: String(q.food?.meals ?? 2),
    hasTeamAccommodation: teamAccom.enabled ?? false,
    teamAccommMode: teamAccom.mode ?? "individual",
    teamAccommEntries: (teamAccom.individual ?? []).map((e: any) => ({
      memberId: e.memberId,
      dailyRate: applyBRLMask(String(Math.round((e.dailyRate ?? 0) * 100))),
      days: String(e.days ?? 1),
    })),
    teamAccommGroups: (teamAccom.groups ?? []).map((g: any) => ({
      id: g.id ?? Math.random().toString(36).slice(2),
      name: g.name ?? "",
      type: g.type ?? "single",
      dailyRate: applyBRLMask(String(Math.round((g.dailyRate ?? 0) * 100))),
      days: String(g.days ?? 1),
      memberIds: g.memberIds ?? [],
    })),
    hasTeamFood: teamFood.enabled ?? false,
    teamFoodMode: teamFood.mode ?? "same",
    teamFoodPerMeal: applyBRLMask(String(Math.round((teamFood.same?.costPerMeal ?? 0) * 100))),
    teamFoodMeals: String(teamFood.same?.meals ?? 2),
    teamFoodEntries: (teamFood.individual ?? []).map((e: any) => ({
      memberId: e.memberId,
      costPerMeal: applyBRLMask(String(Math.round((e.costPerMeal ?? 0) * 100))),
      meals: String(e.meals ?? 2),
    })),
    transportType: transport.type ?? "none",
    transportCost: applyBRLMask(String(Math.round((transport.cost ?? 0) * 100))),
    transportOrigin: transport.originAddress ?? "",
    transportDestination: transport.destinationAddress ?? "",
    transportGasPrice: applyBRLMask(String(Math.round((transport.gasPricePerLiter ?? 0) * 100))),
    transportKmPerLiter: String(transport.kmPerLiter ?? ""),
    transportAxles: String(transport.axles ?? 2),
    transportRouteType: transport.routeType ?? "fastest",
    transportDistanceKm: String(transport.distanceKm ?? ""),
    transportDurationMinutes: String(transport.durationMinutes ?? ""),
    transportFuelCost: applyBRLMask(String(Math.round((transport.fuelCost ?? 0) * 100))),
    transportTollCost: applyBRLMask(String(Math.round((transport.tollCost ?? 0) * 100))),
    transportRouteCalculated: !!(transport.fuelCost || transport.tollCost),
    transportRoundTrip: transport.roundTrip ?? false,
    myTransportPassengers: transport.passengers ?? [],
    hasTeamTransport: (transport.teamTransports ?? []).length > 0,
    teamTransports: (transport.teamTransports ?? []).map((tt: any) => ({
      id: tt.id ?? Math.random().toString(36).slice(2),
      name: tt.name ?? "",
      type: tt.type ?? "air",
      cost: applyBRLMask(String(Math.round((tt.cost ?? 0) * 100))),
      origin: tt.originAddress ?? "",
      destination: tt.destinationAddress ?? "",
      gasPrice: applyBRLMask(String(Math.round((tt.gasPricePerLiter ?? 0) * 100))),
      kmPerLiter: String(tt.kmPerLiter ?? ""),
      axles: String(tt.axles ?? 2),
      routeType: tt.routeType ?? "fastest",
      distanceKm: String(tt.distanceKm ?? ""),
      durationMinutes: String(tt.durationMinutes ?? ""),
      fuelCost: applyBRLMask(String(Math.round((tt.fuelCost ?? 0) * 100))),
      tollCost: applyBRLMask(String(Math.round((tt.tollCost ?? 0) * 100))),
      routeCalculated: !!(tt.fuelCost || tt.tollCost),
      roundTrip: tt.roundTrip ?? false,
      memberIds: tt.memberIds ?? [],
    })),
    extraCosts: (q.extraCosts ?? []).map((c: any) => ({
      name: c.name ?? "",
      value: applyBRLMask(String(Math.round((c.value ?? 0) * 100))),
    })),
  };
}

// ── Address Autocomplete Input ─────────────────────────────────

function AddressInput({
  id, placeholder, value, onChange, googleReady,
}: {
  id: string; placeholder: string; value: string;
  onChange: (v: string) => void; googleReady: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    if (!googleReady || !inputRef.current || !window.google?.maps?.places) return;
    if (autocompleteRef.current) return; // already initialized

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "br" },
      fields: ["formatted_address"],
    });

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();
      if (place?.formatted_address) onChange(place.formatted_address);
    });
  }, [googleReady, onChange]);

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
        autoComplete="off"
      />
    </div>
  );
}

// ── Step indicator ─────────────────────────────────────────────

const STEPS = [
  { label: "Evento", icon: FileText },
  { label: "Mão de Obra", icon: Clock },
  { label: "Equipe", icon: Users },
  { label: "Hospedagem & Alimentação", icon: Hotel },
  { label: "Transporte", icon: Truck },
  { label: "Extras", icon: PlusCircle },
  { label: "Resumo", icon: Calculator },
];

function StepIndicator({ current, onNavigate }: { current: number; onNavigate: (i: number) => void }) {
  return (
    <div className="flex items-center w-full overflow-x-auto pb-2 gap-0.5">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all duration-150 ${
                done
                  ? "bg-white border-amber-400 text-amber-700 dark:bg-transparent dark:border-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 cursor-pointer"
                  : active
                  ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/25 cursor-default"
                  : "bg-transparent border-border text-foreground/50 hover:border-foreground/30 hover:text-foreground/70 cursor-pointer"
              }`}
            >
              {done
                ? <Check className="h-3 w-3 shrink-0" />
                : <Icon className="h-3 w-3 shrink-0" />}
              <span className="hidden md:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight className={`h-3 w-3 shrink-0 mx-0.5 ${i < current ? "text-amber-400" : "text-foreground/20"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Toggle component ───────────────────────────────────────────

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
          value ? "border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" : "border-border text-muted-foreground hover:border-amber-300"
        }`}
      >
        Sim
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
          !value ? "border-slate-400 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" : "border-border text-muted-foreground hover:border-slate-300"
        }`}
      >
        Não
      </button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function NovoOrcamentoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>}>
      <NovoOrcamentoInner />
    </Suspense>
  );
}

function NovoOrcamentoInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const { userProfile, loading } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [snapshot, setSnapshot] = useState<BudgetSnapshot>({ equipmentCostPerJob: 0, softwareMonthlyCost: 0, infrastructureMonthlyCost: 0 });
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const [editLoading, setEditLoading] = useState(!!editId);

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  useEffect(() => {
    if (!editId || !userProfile) return;
    setEditLoading(true);
    apiClient.get(`/budget-quotes/${editId}`)
      .then((res) => setForm(mapQuoteToForm(res.data)))
      .catch(() => router.push("/dashboard/calculadora-orcamento"))
      .finally(() => setEditLoading(false));
  }, [editId, userProfile, router]);

  // Load budget calculator snapshot
  useEffect(() => {
    if (!userProfile) return;
    Promise.all([
      apiClient.get("/budget-calculator"),
      apiClient.get("/budget-calculator/softwares"),
      apiClient.get("/budget-calculator/infrastructure"),
    ]).then(([equipRes, swRes, infraRes]) => {
      const equipCostPerJob = (equipRes.data ?? []).reduce((s: number, i: any) => s + (i.costPerJob ?? 0), 0);
      const swCost = (swRes.data ?? []).reduce((s: number, i: any) => s + (i.monthlyCost ?? 0), 0);
      const infraCost = (infraRes.data ?? []).reduce((s: number, i: any) => s + (i.monthlyCost ?? 0), 0);
      setSnapshot({ equipmentCostPerJob: equipCostPerJob, softwareMonthlyCost: swCost, infrastructureMonthlyCost: infraCost });
    }).catch(() => {});
  }, [userProfile]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  // ── Route calculation ──────────────────────────────────────

  async function handleCalculateRoute() {
    if (!form.transportOrigin || !form.transportDestination) {
      setCalcError("Informe os endereços de origem e destino.");
      return;
    }
    if (!form.transportGasPrice || !form.transportKmPerLiter) {
      setCalcError("Informe o valor da gasolina e o consumo do veículo.");
      return;
    }
    setCalcLoading(true);
    setCalcError("");
    try {
      const res = await apiClient.post("/budget-quotes/calculate-route", {
        originAddress: form.transportOrigin,
        destinationAddress: form.transportDestination,
        routeType: form.transportRouteType,
        gasPricePerLiter: n(form.transportGasPrice),
        kmPerLiter: Number(form.transportKmPerLiter) || 0,
        axles: n(form.transportAxles),
      });
      const data = res.data;
      if (!data.apiUsed) {
        setCalcError("API do Google Maps não configurada. Insira a distância e pedágios manualmente.");
        return;
      }
      if (!data.routeFound) {
        const detail = data.errorDetail ? ` (${data.errorDetail})` : "";
        setCalcError(`Rota não encontrada. Verifique os endereços e tente novamente.${detail}`);
        return;
      }
      setForm((f) => ({
        ...f,
        transportDistanceKm: String(data.distanceKm),
        transportDurationMinutes: String(data.durationMinutes),
        transportFuelCost: applyBRLMask(String(Math.round(data.fuelCost * 100))),
        transportTollCost: applyBRLMask(String(Math.round(data.tollCost * 100))),
        transportRouteCalculated: true,
      }));
    } catch {
      setCalcError("Erro ao calcular rota. Verifique os endereços ou insira os valores manualmente.");
    } finally {
      setCalcLoading(false);
    }
  }

  // ── Grand total calculation ────────────────────────────────

  function calcTotal() {
    const labor = n(form.coverageHours) * n(form.hourlyRate);
    const accom = form.hasAccommodation ? n(form.accommodationDailyRate) * n(form.accommodationDays) : 0;
    const food = form.hasFood ? n(form.foodCostPerMeal) * n(form.foodMeals) : 0;

    let staffLabor = 0;
    for (const m of form.staffMembers) {
      staffLabor += n(m.coverageHours) * n(m.hourlyRate);
    }

    let staffAccom = 0;
    if (form.hasTeamAccommodation) {
      if (form.teamAccommMode === "individual") {
        for (const e of form.teamAccommEntries) staffAccom += n(e.dailyRate) * n(e.days);
      } else {
        for (const g of form.teamAccommGroups) {
          staffAccom += g.type === "property" ? n(g.dailyRate) : n(g.dailyRate) * n(g.days);
        }
      }
    }

    let staffFood = 0;
    if (form.hasTeamFood) {
      if (form.teamFoodMode === "same") {
        staffFood = n(form.teamFoodPerMeal) * n(form.teamFoodMeals) * form.staffMembers.length;
      } else {
        for (const e of form.teamFoodEntries) staffFood += n(e.costPerMeal) * n(e.meals);
      }
    }

    let transport = 0;
    if (form.transportType === "air" || form.transportType === "ground") {
      transport = n(form.transportCost);
    } else if (form.transportType === "own_vehicle") {
      transport = n(form.transportFuelCost) + n(form.transportTollCost);
    }
    if (form.transportRoundTrip) transport *= 2;

    let teamTransport = 0;
    for (const tt of form.teamTransports) {
      let cost = 0;
      if (tt.type === "air" || tt.type === "ground") cost = n(tt.cost);
      else if (tt.type === "own_vehicle") cost = n(tt.fuelCost) + n(tt.tollCost);
      if (tt.roundTrip) cost *= 2;
      teamTransport += cost;
    }

    const extras = form.extraCosts.reduce((s, c) => s + n(c.value), 0);
    const jobs = Math.max(1, n(form.jobsPerMonth));
    const swPerJob = snapshot.softwareMonthlyCost / jobs;
    const infraPerJob = snapshot.infrastructureMonthlyCost / jobs;

    return {
      labor, accom, food,
      staffLabor, staffAccom, staffFood,
      transport, teamTransport, extras,
      equipmentCostPerJob: snapshot.equipmentCostPerJob,
      swPerJob, infraPerJob,
      grand: labor + accom + food + staffLabor + staffAccom + staffFood + transport + teamTransport + extras + snapshot.equipmentCostPerJob + swPerJob + infraPerJob,
    };
  }

  const totals = calcTotal();

  // ── Save ───────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        eventName: form.eventName,
        eventLocation: form.eventLocation || undefined,
        eventDate: form.eventDate || undefined,
        coverageHours: n(form.coverageHours),
        hourlyRate: n(form.hourlyRate),
        jobsPerMonth: n(form.jobsPerMonth),
        accommodation: {
          enabled: form.hasAccommodation,
          dailyRate: form.hasAccommodation ? n(form.accommodationDailyRate) : undefined,
          days: form.hasAccommodation ? n(form.accommodationDays) : undefined,
        },
        food: {
          enabled: form.hasFood,
          costPerMeal: form.hasFood ? n(form.foodCostPerMeal) : undefined,
          meals: form.hasFood ? n(form.foodMeals) : undefined,
        },
        additionalStaff: {
          enabled: form.staffMembers.length > 0,
          members: form.staffMembers.map((m) => ({
            id: m.id,
            name: m.name,
            hourlyRate: n(m.hourlyRate),
            coverageHours: n(m.coverageHours),
          })),
          teamAccommodation: {
            enabled: form.hasTeamAccommodation,
            mode: form.teamAccommMode,
            individual: form.hasTeamAccommodation && form.teamAccommMode === "individual"
              ? form.teamAccommEntries.map((e) => ({ memberId: e.memberId, dailyRate: n(e.dailyRate), days: n(e.days) }))
              : undefined,
            groups: form.hasTeamAccommodation && form.teamAccommMode === "grouped"
              ? form.teamAccommGroups.map((g) => ({ id: g.id, name: g.name, type: g.type, dailyRate: n(g.dailyRate), days: n(g.days), memberIds: g.memberIds }))
              : undefined,
          },
          teamFood: {
            enabled: form.hasTeamFood,
            mode: form.teamFoodMode,
            same: form.hasTeamFood && form.teamFoodMode === "same"
              ? { costPerMeal: n(form.teamFoodPerMeal), meals: n(form.teamFoodMeals) }
              : undefined,
            individual: form.hasTeamFood && form.teamFoodMode === "individual"
              ? form.teamFoodEntries.map((e) => ({ memberId: e.memberId, costPerMeal: n(e.costPerMeal), meals: n(e.meals) }))
              : undefined,
          },
        },
        transport: {
          type: form.transportType,
          cost: (form.transportType === "air" || form.transportType === "ground") ? n(form.transportCost) : undefined,
          originAddress: form.transportType === "own_vehicle" ? form.transportOrigin : undefined,
          destinationAddress: form.transportType === "own_vehicle" ? form.transportDestination : undefined,
          distanceKm: form.transportType === "own_vehicle" ? (Number(form.transportDistanceKm) || 0) : undefined,
          durationMinutes: form.transportType === "own_vehicle" ? (Number(form.transportDurationMinutes) || 0) : undefined,
          gasPricePerLiter: form.transportType === "own_vehicle" ? n(form.transportGasPrice) : undefined,
          kmPerLiter: form.transportType === "own_vehicle" ? (Number(form.transportKmPerLiter) || 0) : undefined,
          axles: form.transportType === "own_vehicle" ? n(form.transportAxles) : undefined,
          routeType: form.transportType === "own_vehicle" ? form.transportRouteType : undefined,
          fuelCost: form.transportType === "own_vehicle" ? n(form.transportFuelCost) : undefined,
          tollCost: form.transportType === "own_vehicle" ? n(form.transportTollCost) : undefined,
          roundTrip: form.transportRoundTrip,
          passengers: form.myTransportPassengers,
          teamTransports: form.hasTeamTransport ? form.teamTransports.map((tt) => ({
            id: tt.id,
            name: tt.name,
            type: tt.type,
            cost: (tt.type === "air" || tt.type === "ground") ? n(tt.cost) : undefined,
            originAddress: tt.type === "own_vehicle" ? tt.origin : undefined,
            destinationAddress: tt.type === "own_vehicle" ? tt.destination : undefined,
            distanceKm: tt.type === "own_vehicle" ? (Number(tt.distanceKm) || 0) : undefined,
            fuelCost: tt.type === "own_vehicle" ? n(tt.fuelCost) : undefined,
            tollCost: tt.type === "own_vehicle" ? n(tt.tollCost) : undefined,
            roundTrip: tt.roundTrip,
            memberIds: tt.memberIds,
          })) : [],
        },
        extraCosts: form.extraCosts.filter((c) => c.name && n(c.value) > 0).map((c) => ({ name: c.name, value: n(c.value) })),
        equipmentCostPerJob: snapshot.equipmentCostPerJob,
        softwareMonthlyCost: snapshot.softwareMonthlyCost,
        infrastructureMonthlyCost: snapshot.infrastructureMonthlyCost,
        grandTotal: totals.grand,
      };
      const res = editId
        ? await apiClient.put(`/budget-quotes/${editId}`, payload)
        : await apiClient.post("/budget-quotes", payload);
      router.push(`/dashboard/calculadora-orcamento/orcamentos/${res.data.id}`);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? "Erro ao salvar orçamento.";
      setError(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading || editLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // ── Step rendering ─────────────────────────────────────────

  function renderStep() {
    switch (step) {
      case 0: return <StepEvento form={form} set={set} />;
      case 1: return <StepMaoDeObra form={form} set={set} />;
      case 2: return <StepEquipe form={form} set={set} />;
      case 3: return <StepHospedagemAlimentacao form={form} set={set} />;
      case 4: return <StepTransporte form={form} set={set} calcLoading={calcLoading} calcError={calcError} onCalculate={handleCalculateRoute} googleReady={googleReady} roundTrip={form.transportRoundTrip} onRoundTripChange={(v) => set("transportRoundTrip", v)} />;
      case 5: return <StepExtras form={form} set={set} />;
      case 6: return <StepResumo form={form} snapshot={snapshot} totals={totals} error={error} saving={saving} onSave={handleSave} isEditing={!!editId} />;
      default: return null;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background/50">
      <Header />
      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-3xl space-y-8">
          <ScrollReveal>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/dashboard/calculadora-orcamento" className="hover:text-foreground transition-colors">Calculadora</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium">{editId ? "Editar Orçamento" : "Novo Orçamento"}</span>
            </div>

            {/* Hero */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow shrink-0">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{editId ? "Editar Orçamento" : "Novo Orçamento"}</h1>
                <p className="text-muted-foreground text-sm">{editId ? "Atualize os dados do orçamento." : "Preencha os dados para calcular o custo total do evento."}</p>
              </div>
            </div>

            {/* Step indicator */}
            <StepIndicator current={step} onNavigate={setStep} />

            {/* Step content */}
            <Card className="mt-6 border shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  {(() => { const Icon = STEPS[step].icon; return <Icon className="h-4 w-4 text-amber-500" />; })()}
                  {STEPS[step].label}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {renderStep()}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              {step > 0 ? (
                <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Anterior
                </Button>
              ) : (
                <Link href="/dashboard/calculadora-orcamento">
                  <Button variant="outline" className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Cancelar
                  </Button>
                </Link>
              )}
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)} className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </ScrollReveal>
        </div>
      </main>
      <Footer />
      {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="afterInteractive"
          onLoad={() => setGoogleReady(true)}
        />
      )}
    </div>
  );
}

// ── Step 1: Evento ─────────────────────────────────────────────

function StepEvento({ form, set }: { form: FormState; set: any }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="eventName">Nome do evento *</Label>
        <Input id="eventName" placeholder="ex: Casamento Silva e Oliveira" value={form.eventName}
          onChange={(e) => set("eventName", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="eventLocation">Local do evento</Label>
        <Input id="eventLocation" placeholder="ex: São Paulo, SP" value={form.eventLocation}
          onChange={(e) => set("eventLocation", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="eventDate">Data do evento</Label>
        <Input id="eventDate" type="date" value={form.eventDate}
          onChange={(e) => set("eventDate", e.target.value)} />
      </div>
    </div>
  );
}

// ── Step 2: Mão de Obra ─────────────────────────────────────────

function StepMaoDeObra({ form, set }: { form: FormState; set: any }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="coverageHours">Minhas horas de cobertura *</Label>
        <Input id="coverageHours" type="number" min="0.5" step="0.5" placeholder="8" value={form.coverageHours}
          onChange={(e) => set("coverageHours", e.target.value)} />
        <p className="text-xs text-muted-foreground">Quantas horas você ficará no evento.</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label htmlFor="hourlyRate">Valor da sua hora de trabalho (R$) *</Label>
          <div className="group relative">
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            <div className="absolute left-6 top-0 z-10 hidden group-hover:block w-64 p-2.5 bg-popover border rounded-lg shadow-lg text-xs text-muted-foreground">
              Informe <strong>apenas</strong> o custo da sua hora de trabalho profissional, sem considerar nenhum gasto com equipamentos. Os custos de equipamentos, softwares e infraestrutura já são calculados separadamente pela Calculadora de Orçamento.
            </div>
          </div>
        </div>
        <Input id="hourlyRate" inputMode="numeric" placeholder="0,00" value={form.hourlyRate}
          onChange={(e) => set("hourlyRate", applyBRLMask(e.target.value))} />
        <p className="text-xs text-muted-foreground">Apenas o custo da sua hora — equipamentos são calculados separadamente.</p>
      </div>

      {n(form.hourlyRate) > 0 && n(form.coverageHours) > 0 && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{form.coverageHours}h × {n(form.hourlyRate).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          <span className="font-bold text-amber-500">{fmt(n(form.coverageHours) * n(form.hourlyRate))}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="jobsPerMonth">Quantos trabalhos você realiza por mês (em média)?</Label>
        <Input id="jobsPerMonth" type="number" min="1" step="1" placeholder="4" value={form.jobsPerMonth}
          onChange={(e) => set("jobsPerMonth", e.target.value)} />
        <p className="text-xs text-muted-foreground">Usado para dividir os custos mensais de software e infraestrutura por job.</p>
      </div>
    </div>
  );
}

// ── AccomGroupCard ─────────────────────────────────────────────

const ACCOM_TYPE_LABELS: Record<AccomGroup["type"], string> = {
  single: "Quarto individual",
  double: "Quarto duplo",
  triple: "Quarto triplo",
  property: "Imóvel completo",
};

function AccomGroupCard({ group, staffMembers, allGroups, onChange, onRemove, onToggleMember }: {
  group: AccomGroup;
  staffMembers: StaffMember[];
  allGroups: AccomGroup[];
  onChange: (patch: Partial<AccomGroup>) => void;
  onRemove: () => void;
  onToggleMember: (memberId: string) => void;
}) {
  const assignedElsewhere = new Set(
    allGroups.filter((g) => g.id !== group.id).flatMap((g) => g.memberIds)
  );
  const isProperty = group.type === "property";
  const total = isProperty ? n(group.dailyRate) : n(group.dailyRate) * n(group.days);

  return (
    <div className="rounded-xl border border-violet-200 dark:border-violet-800 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-violet-50 dark:bg-violet-900/20">
        <Input
          placeholder="Nome da acomodação (ex: Quarto 1, Casa Airbnb)"
          value={group.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="h-8 text-sm border-violet-200 dark:border-violet-700 bg-white dark:bg-background flex-1"
        />
        <button type="button" onClick={onRemove} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Type */}
        <div className="grid grid-cols-2 gap-2">
          {(["single", "double", "triple", "property"] as const).map((t) => (
            <button key={t} type="button" onClick={() => onChange({ type: t })}
              className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                group.type === t
                  ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400"
                  : "border-border text-muted-foreground hover:border-violet-300"
              }`}>
              {ACCOM_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Rate + days */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{isProperty ? "Valor total (R$)" : "Valor da diária (R$)"}</Label>
            <Input inputMode="numeric" placeholder="0,00"
              value={group.dailyRate} onChange={(e) => onChange({ dailyRate: applyBRLMask(e.target.value) })} />
          </div>
          {!isProperty && (
            <div className="space-y-1">
              <Label className="text-xs">Qtd. de diárias</Label>
              <Input type="number" min="1" step="1" placeholder="1"
                value={group.days} onChange={(e) => onChange({ days: e.target.value })} />
            </div>
          )}
        </div>

        {/* Member assignment */}
        {staffMembers.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Membros nesta acomodação</Label>
            <div className="space-y-1.5">
              {staffMembers.map((m) => {
                const isHere = group.memberIds.includes(m.id);
                const blocked = !isHere && assignedElsewhere.has(m.id);
                return (
                  <button key={m.id} type="button" disabled={blocked} onClick={() => onToggleMember(m.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all text-left ${
                      isHere
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300"
                        : blocked
                          ? "border-border bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                          : "border-border hover:border-violet-300"
                    }`}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isHere ? "bg-violet-500 border-violet-500" : "border-muted-foreground"
                    }`}>
                      {isHere && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span>{m.name || "Profissional sem nome"}</span>
                    {blocked && <span className="ml-auto text-xs text-muted-foreground">Já alocado</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {n(group.dailyRate) > 0 && (
          <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 px-3 py-2 flex justify-between text-sm">
            <span className="text-muted-foreground">
              {isProperty
                ? `Imóvel (${group.memberIds.length} membro(s))`
                : `${fmt(n(group.dailyRate))} × ${group.days} diária(s)`}
            </span>
            <span className="font-bold text-violet-600">{fmt(total)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 3: Hospedagem & Alimentação ───────────────────────────

function StepHospedagemAlimentacao({ form, set }: { form: FormState; set: any }) {
  const hasTeam = form.staffMembers.length > 0;

  function getAccommEntry(memberId: string) {
    return form.teamAccommEntries.find((e) => e.memberId === memberId) ?? { memberId, dailyRate: "", days: "1" };
  }
  function setAccommEntry(memberId: string, patch: Partial<{ dailyRate: string; days: string }>) {
    const exists = form.teamAccommEntries.find((e) => e.memberId === memberId);
    if (exists) {
      set("teamAccommEntries", form.teamAccommEntries.map((e) => e.memberId === memberId ? { ...e, ...patch } : e));
    } else {
      set("teamAccommEntries", [...form.teamAccommEntries, { memberId, dailyRate: "", days: "1", ...patch }]);
    }
  }

  function getFoodEntry(memberId: string) {
    return form.teamFoodEntries.find((e) => e.memberId === memberId) ?? { memberId, costPerMeal: "", meals: "2" };
  }
  function setFoodEntry(memberId: string, patch: Partial<{ costPerMeal: string; meals: string }>) {
    const exists = form.teamFoodEntries.find((e) => e.memberId === memberId);
    if (exists) {
      set("teamFoodEntries", form.teamFoodEntries.map((e) => e.memberId === memberId ? { ...e, ...patch } : e));
    } else {
      set("teamFoodEntries", [...form.teamFoodEntries, { memberId, costPerMeal: "", meals: "2", ...patch }]);
    }
  }

  function addAccomGroup() {
    set("teamAccommGroups", [...form.teamAccommGroups, {
      id: Math.random().toString(36).slice(2),
      name: "",
      type: "double" as const,
      dailyRate: "",
      days: "1",
      memberIds: [],
    }]);
  }
  function updateAccomGroup(id: string, patch: Partial<AccomGroup>) {
    set("teamAccommGroups", form.teamAccommGroups.map((g) => g.id === id ? { ...g, ...patch } : g));
  }
  function removeAccomGroup(id: string) {
    set("teamAccommGroups", form.teamAccommGroups.filter((g) => g.id !== id));
  }
  function toggleMemberInGroup(groupId: string, memberId: string) {
    const group = form.teamAccommGroups.find((g) => g.id === groupId);
    if (!group) return;
    const memberIds = group.memberIds.includes(memberId)
      ? group.memberIds.filter((id) => id !== memberId)
      : [...group.memberIds, memberId];
    updateAccomGroup(groupId, { memberIds });
  }

  return (
    <div className="space-y-8">

      {/* ── Minha hospedagem ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Hotel className="h-4 w-4" />
          </div>
          <div>
            <p className="text-base font-semibold">Minha hospedagem</p>
            <p className="text-xs text-muted-foreground">Acomodação pessoal</p>
          </div>
        </div>
        <Toggle value={form.hasAccommodation} onChange={(v) => set("hasAccommodation", v)} />
        {form.hasAccommodation && (
          <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
            <div className="space-y-1.5">
              <Label htmlFor="accDailyRate">Valor da diária (R$)</Label>
              <Input id="accDailyRate" inputMode="numeric" placeholder="0,00"
                value={form.accommodationDailyRate} onChange={(e) => set("accommodationDailyRate", applyBRLMask(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accDays">Quantidade de diárias</Label>
              <Input id="accDays" type="number" min="1" step="1" placeholder="1"
                value={form.accommodationDays} onChange={(e) => set("accommodationDays", e.target.value)} />
            </div>
            {n(form.accommodationDailyRate) > 0 && (
              <div className="col-span-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2 flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total hospedagem</span>
                <span className="font-bold text-blue-600">{fmt(n(form.accommodationDailyRate) * n(form.accommodationDays))}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Hospedagem da equipe ── */}
      {hasTeam && (
        <>
          <div className="border-t border-border" />
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-base font-semibold">Hospedagem da equipe</p>
                <p className="text-xs text-muted-foreground">{form.staffMembers.length} profissional(is)</p>
              </div>
            </div>
            <Toggle value={form.hasTeamAccommodation} onChange={(v) => set("hasTeamAccommodation", v)} />

            {form.hasTeamAccommodation && (
              <div className="space-y-4">
                {/* Mode selector */}
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: "individual", label: "Individual", desc: "Cada um na sua acomodação" },
                    { value: "grouped", label: "Agrupar", desc: "Quartos ou imóvel compartilhado" },
                  ] as const).map((mode) => (
                    <button key={mode.value} type="button" onClick={() => set("teamAccommMode", mode.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        form.teamAccommMode === mode.value
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                          : "border-border hover:border-violet-300"
                      }`}>
                      <p className="text-sm font-medium">{mode.label}</p>
                      <p className="text-xs text-muted-foreground">{mode.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Individual */}
                {form.teamAccommMode === "individual" && (
                  <div className="space-y-3">
                    {form.staffMembers.map((m) => {
                      const entry = getAccommEntry(m.id);
                      return (
                        <div key={m.id} className="rounded-xl border border-violet-200 dark:border-violet-800 p-4 space-y-3">
                          <p className="text-sm font-semibold">{m.name || "Profissional sem nome"}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Valor da diária (R$)</Label>
                              <Input inputMode="numeric" placeholder="0,00"
                                value={entry.dailyRate} onChange={(e) => setAccommEntry(m.id, { dailyRate: applyBRLMask(e.target.value) })} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Qtd. de diárias</Label>
                              <Input type="number" min="1" step="1" placeholder="1"
                                value={entry.days} onChange={(e) => setAccommEntry(m.id, { days: e.target.value })} />
                            </div>
                          </div>
                          {n(entry.dailyRate) > 0 && (
                            <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 px-3 py-2 flex justify-between text-sm">
                              <span className="text-muted-foreground">Total</span>
                              <span className="font-bold text-violet-600">{fmt(n(entry.dailyRate) * n(entry.days))}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Grouped */}
                {form.teamAccommMode === "grouped" && (
                  <div className="space-y-3">
                    {form.teamAccommGroups.map((group) => (
                      <AccomGroupCard
                        key={group.id}
                        group={group}
                        staffMembers={form.staffMembers}
                        allGroups={form.teamAccommGroups}
                        onChange={(patch) => updateAccomGroup(group.id, patch)}
                        onRemove={() => removeAccomGroup(group.id)}
                        onToggleMember={(memberId) => toggleMemberInGroup(group.id, memberId)}
                      />
                    ))}
                    <button type="button" onClick={addAccomGroup}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-violet-200 dark:border-violet-800 text-sm font-medium text-violet-600 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all">
                      <PlusCircle className="h-4 w-4" /> Adicionar acomodação
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}

      <div className="border-t border-border" />

      {/* ── Minha alimentação ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
            <Utensils className="h-4 w-4" />
          </div>
          <div>
            <p className="text-base font-semibold">Minha alimentação</p>
            <p className="text-xs text-muted-foreground">Alimentação pessoal</p>
          </div>
        </div>
        <Toggle value={form.hasFood} onChange={(v) => set("hasFood", v)} />
        {form.hasFood && (
          <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-green-200 dark:border-green-800">
            <div className="space-y-1.5">
              <Label htmlFor="foodCost">Valor por refeição (R$)</Label>
              <Input id="foodCost" inputMode="numeric" placeholder="0,00"
                value={form.foodCostPerMeal} onChange={(e) => set("foodCostPerMeal", applyBRLMask(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="foodMeals">Quantidade de refeições</Label>
              <Input id="foodMeals" type="number" min="1" step="1" placeholder="2"
                value={form.foodMeals} onChange={(e) => set("foodMeals", e.target.value)} />
            </div>
            {n(form.foodCostPerMeal) > 0 && (
              <div className="col-span-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2 flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total alimentação</span>
                <span className="font-bold text-green-600">{fmt(n(form.foodCostPerMeal) * n(form.foodMeals))}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Alimentação da equipe ── */}
      {hasTeam && (
        <>
          <div className="border-t border-border" />
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Utensils className="h-4 w-4" />
              </div>
              <div>
                <p className="text-base font-semibold">Alimentação da equipe</p>
                <p className="text-xs text-muted-foreground">{form.staffMembers.length} profissional(is)</p>
              </div>
            </div>
            <Toggle value={form.hasTeamFood} onChange={(v) => set("hasTeamFood", v)} />

            {form.hasTeamFood && (
              <div className="space-y-4">
                {/* Mode selector */}
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: "same", label: "Igual para todos" },
                    { value: "individual", label: "Individual" },
                  ] as const).map((mode) => (
                    <button key={mode.value} type="button" onClick={() => set("teamFoodMode", mode.value)}
                      className={`py-2 rounded-xl border text-sm font-medium transition-all ${
                        form.teamFoodMode === mode.value
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                          : "border-border text-muted-foreground hover:border-amber-300"
                      }`}>
                      {mode.label}
                    </button>
                  ))}
                </div>

                {/* Same for all */}
                {form.teamFoodMode === "same" && (
                  <div className="space-y-3 pl-4 border-l-2 border-amber-200 dark:border-amber-800">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Valor por refeição (R$)</Label>
                        <Input inputMode="numeric" placeholder="0,00"
                          value={form.teamFoodPerMeal} onChange={(e) => set("teamFoodPerMeal", applyBRLMask(e.target.value))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Qtd. de refeições</Label>
                        <Input type="number" min="1" step="1" placeholder="2"
                          value={form.teamFoodMeals} onChange={(e) => set("teamFoodMeals", e.target.value)} />
                      </div>
                    </div>
                    {n(form.teamFoodPerMeal) > 0 && (
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 flex justify-between text-sm">
                        <span className="text-muted-foreground">{form.staffMembers.length} membro(s) × {form.teamFoodMeals} refeição(ões)</span>
                        <span className="font-bold text-amber-600">{fmt(n(form.teamFoodPerMeal) * n(form.teamFoodMeals) * form.staffMembers.length)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Individual */}
                {form.teamFoodMode === "individual" && (
                  <div className="space-y-3">
                    {form.staffMembers.map((m) => {
                      const entry = getFoodEntry(m.id);
                      return (
                        <div key={m.id} className="rounded-xl border border-amber-200 dark:border-amber-800 p-4 space-y-3">
                          <p className="text-sm font-semibold">{m.name || "Profissional sem nome"}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Valor por refeição (R$)</Label>
                              <Input inputMode="numeric" placeholder="0,00"
                                value={entry.costPerMeal} onChange={(e) => setFoodEntry(m.id, { costPerMeal: applyBRLMask(e.target.value) })} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Qtd. de refeições</Label>
                              <Input type="number" min="1" step="1" placeholder="2"
                                value={entry.meals} onChange={(e) => setFoodEntry(m.id, { meals: e.target.value })} />
                            </div>
                          </div>
                          {n(entry.costPerMeal) > 0 && (
                            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 flex justify-between text-sm">
                              <span className="text-muted-foreground">Total</span>
                              <span className="font-bold text-amber-600">{fmt(n(entry.costPerMeal) * n(entry.meals))}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// ── Step 4: Equipe ─────────────────────────────────────────────

function StepEquipe({ form, set }: { form: FormState; set: any }) {
  function updateMember(id: string, patch: Partial<StaffMember>) {
    set("staffMembers", form.staffMembers.map((m) => m.id === id ? { ...m, ...patch } : m));
  }
  function removeMember(id: string) {
    set("staffMembers", form.staffMembers.filter((m) => m.id !== id));
  }
  function addMember() {
    set("staffMembers", [...form.staffMembers, newStaffMember()]);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center">
          <Users className="h-4 w-4" />
        </div>
        <div>
          <p className="text-base font-semibold">Equipe adicional</p>
          <p className="text-xs text-muted-foreground">Adicione profissionais que participarão do evento.</p>
        </div>
      </div>

      {form.staffMembers.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-violet-200 dark:border-violet-800 p-6 text-center space-y-3">
          <Users className="h-8 w-8 text-violet-300 mx-auto" />
          <p className="text-sm text-muted-foreground">Nenhum profissional adicional.</p>
          <button type="button" onClick={addMember}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors">
            <PlusCircle className="h-4 w-4" /> Adicionar profissional
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {form.staffMembers.map((m, idx) => (
            <div key={m.id} className="rounded-xl border border-violet-200 dark:border-violet-800 overflow-hidden">
              {/* Card header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-violet-50 dark:bg-violet-900/20">
                <div className="w-6 h-6 rounded-full bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300 flex items-center justify-center text-xs font-bold shrink-0">
                  {idx + 1}
                </div>
                <Input
                  placeholder="Nome / função (ex: Assistente, Editor)"
                  value={m.name}
                  onChange={(e) => updateMember(m.id, { name: e.target.value })}
                  className="h-8 text-sm border-violet-200 dark:border-violet-700 bg-white dark:bg-background"
                />
                <button type="button" onClick={() => removeMember(m.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Card body */}
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Valor da hora (R$)</Label>
                    <Input inputMode="numeric" placeholder="0,00"
                      value={m.hourlyRate}
                      onChange={(e) => updateMember(m.id, { hourlyRate: applyBRLMask(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Horas de cobertura</Label>
                    <Input type="number" min="0.5" step="0.5" placeholder="8"
                      value={m.coverageHours}
                      onChange={(e) => updateMember(m.id, { coverageHours: e.target.value })} />
                  </div>
                </div>

                {n(m.hourlyRate) > 0 && n(m.coverageHours) > 0 && (
                  <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 px-3 py-2 flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Mão de obra</span>
                    <span className="font-bold text-violet-600">{fmt(n(m.hourlyRate) * n(m.coverageHours))}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          <button type="button" onClick={addMember}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-violet-200 dark:border-violet-800 text-sm font-medium text-violet-600 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all">
            <PlusCircle className="h-4 w-4" /> Adicionar profissional
          </button>
        </div>
      )}
    </div>
  );
}

// ── TeamTransportCard ──────────────────────────────────────────

function TeamTransportCard({ transport, staffMembers, allTransports, onChange, onRemove, googleReady }: {
  transport: TeamTransport;
  staffMembers: StaffMember[];
  allTransports: TeamTransport[];
  onChange: (patch: Partial<TeamTransport>) => void;
  onRemove: () => void;
  googleReady: boolean;
}) {
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState("");

  const handleOriginChange = useCallback((v: string) => onChange({ origin: v }), [onChange]);
  const handleDestChange = useCallback((v: string) => onChange({ destination: v }), [onChange]);

  async function handleCalculateRoute() {
    if (!transport.origin || !transport.destination) { setCalcError("Informe os endereços de origem e destino."); return; }
    if (!transport.gasPrice || !transport.kmPerLiter) { setCalcError("Informe o valor da gasolina e o consumo."); return; }
    setCalcLoading(true); setCalcError("");
    try {
      const res = await apiClient.post("/budget-quotes/calculate-route", {
        originAddress: transport.origin,
        destinationAddress: transport.destination,
        routeType: transport.routeType,
        gasPricePerLiter: n(transport.gasPrice),
        kmPerLiter: Number(transport.kmPerLiter) || 0,
        axles: n(transport.axles),
      });
      const data = res.data;
      if (!data.apiUsed) { setCalcError("API do Google Maps não configurada. Insira manualmente."); return; }
      if (!data.routeFound) { setCalcError("Rota não encontrada. Verifique os endereços."); return; }
      onChange({
        distanceKm: String(data.distanceKm),
        durationMinutes: String(data.durationMinutes),
        fuelCost: applyBRLMask(String(Math.round(data.fuelCost * 100))),
        tollCost: applyBRLMask(String(Math.round(data.tollCost * 100))),
        routeCalculated: true,
      });
    } catch { setCalcError("Erro ao calcular rota. Insira os valores manualmente."); }
    finally { setCalcLoading(false); }
  }

  const assignedElsewhere = new Set(
    allTransports.filter((t) => t.id !== transport.id).flatMap((t) => t.memberIds)
  );
  const totalCost = transport.type === "own_vehicle"
    ? (n(transport.fuelCost) + n(transport.tollCost)) * (transport.roundTrip ? 2 : 1)
    : n(transport.cost);

  const ttypes = [
    { value: "air", icon: <Plane className="h-4 w-4" />, label: "Aéreo" },
    { value: "ground", icon: <Bus className="h-4 w-4" />, label: "Terrestre" },
    { value: "own_vehicle", icon: <Car className="h-4 w-4" />, label: "Veículo próprio" },
  ] as const;

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20">
        <Input
          placeholder="Nome (ex: Van da equipe, Passagem Bea)"
          value={transport.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="h-8 text-sm border-amber-200 dark:border-amber-700 bg-white dark:bg-background flex-1"
        />
        <button type="button" onClick={onRemove} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Type selector */}
        <div className="grid grid-cols-3 gap-2">
          {ttypes.map((t) => (
            <button key={t.value} type="button" onClick={() => onChange({ type: t.value })}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                transport.type === t.value
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                  : "border-border text-muted-foreground hover:border-amber-300"
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Air / Ground: cost */}
        {(transport.type === "air" || transport.type === "ground") && (
          <div className="space-y-1.5 pl-3 border-l-2 border-amber-200 dark:border-amber-800">
            <Label className="text-xs">{transport.type === "air" ? "Valor da passagem (R$)" : "Valor do transporte (R$)"}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium pointer-events-none">R$</span>
              <Input inputMode="numeric" placeholder="0,00" value={transport.cost}
                onChange={(e) => onChange({ cost: applyBRLMask(e.target.value) })} className="pl-9" />
            </div>
            {n(transport.cost) > 0 && <p className="text-xs font-medium text-amber-600">{fmt(n(transport.cost))}</p>}
          </div>
        )}

        {/* Own vehicle */}
        {transport.type === "own_vehicle" && (
          <div className="space-y-4 pl-3 border-l-2 border-amber-200 dark:border-amber-800">
            <div className="space-y-1">
              <Label className="text-xs">Endereço de partida</Label>
              <AddressInput id={`tt-orig-${transport.id}`} placeholder="ex: Rua das Flores, 123, SP"
                value={transport.origin} onChange={handleOriginChange} googleReady={googleReady} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Endereço de chegada</Label>
              <AddressInput id={`tt-dest-${transport.id}`} placeholder="ex: Rua da Saudade, 456, SP"
                value={transport.destination} onChange={handleDestChange} googleReady={googleReady} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><Fuel className="h-3 w-3" /> Gasolina (R$/L)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">R$</span>
                  <Input inputMode="numeric" placeholder="0,00" value={transport.gasPrice}
                    onChange={(e) => onChange({ gasPrice: applyBRLMask(e.target.value) })} className="pl-9 h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">KM por litro</Label>
                <Input type="number" min="1" step="0.1" placeholder="ex: 12" value={transport.kmPerLiter}
                  onChange={(e) => onChange({ kmPerLiter: e.target.value })} className="h-9 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Eixos do veículo</Label>
                <select value={transport.axles} onChange={(e) => onChange({ axles: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
                  <option value="2">2 eixos (carro)</option>
                  <option value="3">3 eixos (van)</option>
                  <option value="4">4 eixos</option>
                  <option value="5">5 eixos</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Preferência de rota</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["fastest", "shortest"] as const).map((rt) => (
                    <button key={rt} type="button" onClick={() => onChange({ routeType: rt })}
                      className={`py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        transport.routeType === rt ? "border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-900/20" : "border-border text-muted-foreground hover:border-amber-300"
                      }`}>
                      {rt === "fastest" ? "Rápida" : "Curta"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <div onClick={() => onChange({ roundTrip: !transport.roundTrip })}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                  transport.roundTrip ? "bg-amber-500 border-amber-500" : "border-border bg-background group-hover:border-amber-400"
                }`}>
                {transport.roundTrip && <Check className="h-2.5 w-2.5 text-white" />}
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Calcular volta <span className="opacity-70">(×2)</span></span>
            </label>
            <Button type="button" onClick={handleCalculateRoute} disabled={calcLoading}
              className={`w-full gap-2 text-white h-9 text-sm ${transport.routeCalculated ? "bg-amber-600 hover:bg-amber-700" : "bg-amber-500 hover:bg-amber-600"}`}>
              {calcLoading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculando...</>
                : transport.routeCalculated
                ? <><MapPin className="h-3.5 w-3.5" /> Recalcular Rota</>
                : <><MapPin className="h-3.5 w-3.5" /> Calcular Rota</>}
            </Button>
            {calcError && (
              <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-2.5">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /><p>{calcError}</p>
              </div>
            )}
            <div className="space-y-2.5 pt-1">
              <p className="text-xs text-muted-foreground font-medium">Ou insira manualmente:</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Distância (km)</Label>
                  <Input type="number" min="0" step="0.1" placeholder="ex: 120" value={transport.distanceKm}
                    onChange={(e) => {
                      const km = e.target.value;
                      const fuel = n(transport.gasPrice) > 0 && Number(transport.kmPerLiter) > 0
                        ? (parseFloat(km) / Number(transport.kmPerLiter)) * n(transport.gasPrice) : 0;
                      onChange({ distanceKm: km, ...(fuel > 0 ? { fuelCost: applyBRLMask(String(Math.round(fuel * 100))) } : {}) });
                    }} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pedágios (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">R$</span>
                    <Input inputMode="numeric" placeholder="0,00" value={transport.tollCost}
                      onChange={(e) => onChange({ tollCost: applyBRLMask(e.target.value) })} className="pl-9 h-9 text-sm" />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Combustível (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">R$</span>
                  <Input inputMode="numeric" placeholder="0,00" value={transport.fuelCost}
                    onChange={(e) => onChange({ fuelCost: applyBRLMask(e.target.value) })} className="pl-9 h-9 text-sm" />
                </div>
              </div>
            </div>
            {(n(transport.fuelCost) + n(transport.tollCost)) > 0 && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Combustível{transport.roundTrip ? " (ida)" : ""}</span><span>{fmt(n(transport.fuelCost))}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Pedágios{transport.roundTrip ? " (ida)" : ""}</span><span>{fmt(n(transport.tollCost))}</span>
                </div>
                {transport.roundTrip && (
                  <div className="flex justify-between text-xs text-amber-600 font-medium pt-0.5">
                    <span>Subtotal ida e volta (×2)</span><span>{fmt((n(transport.fuelCost) + n(transport.tollCost)) * 2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-1 border-t border-amber-200 dark:border-amber-800">
                  <span>Total</span><span className="text-amber-600">{fmt(totalCost)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Member assignment */}
        {staffMembers.length > 0 && (
          <div className="space-y-2 pt-1">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Membros neste transporte
            </Label>
            <div className="space-y-1.5">
              {staffMembers.map((m) => {
                const isHere = transport.memberIds.includes(m.id);
                const elsewhere = !isHere && assignedElsewhere.has(m.id);
                return (
                  <button key={m.id} type="button"
                    onClick={() => onChange({ memberIds: isHere ? transport.memberIds.filter((id) => id !== m.id) : [...transport.memberIds, m.id] })}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                      isHere ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300" : "border-border hover:border-amber-300"
                    }`}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isHere ? "bg-amber-500 border-amber-500" : "border-muted-foreground"}`}>
                      {isHere && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span>{m.name || "Profissional sem nome"}</span>
                    {elsewhere && <span className="ml-auto text-xs text-muted-foreground">Já em outro transporte</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 5: Transporte ─────────────────────────────────────────

function StepTransporte({ form, set, calcLoading, calcError, onCalculate, googleReady, roundTrip, onRoundTripChange }: {
  form: FormState; set: any; calcLoading: boolean; calcError: string;
  onCalculate: () => void; googleReady: boolean;
  roundTrip: boolean; onRoundTripChange: (v: boolean) => void;
}) {
  const hasTeam = form.staffMembers.length > 0;

  const types = [
    { value: "none", icon: <MapPin className="h-5 w-5" />, label: "Sem transporte" },
    { value: "air", icon: <Plane className="h-5 w-5" />, label: "Aéreo" },
    { value: "ground", icon: <Bus className="h-5 w-5" />, label: "Terrestre (ônibus/Uber)" },
    { value: "own_vehicle", icon: <Car className="h-5 w-5" />, label: "Veículo próprio" },
  ] as const;

  const handleOriginChange = useCallback((v: string) => set("transportOrigin", v), [set]);
  const handleDestChange = useCallback((v: string) => set("transportDestination", v), [set]);

  function addTeamTransport() { set("teamTransports", [...form.teamTransports, newTeamTransport()]); }
  function updateTeamTransport(id: string, patch: Partial<TeamTransport>) {
    set("teamTransports", form.teamTransports.map((t) => t.id === id ? { ...t, ...patch } : t));
  }
  function removeTeamTransport(id: string) {
    set("teamTransports", form.teamTransports.filter((t) => t.id !== id));
  }

  function toggleMyPassenger(memberId: string) {
    const current = form.myTransportPassengers;
    set("myTransportPassengers", current.includes(memberId)
      ? current.filter((id) => id !== memberId)
      : [...current, memberId]);
  }

  return (
    <div className="space-y-8">

      {/* ── Meu transporte ── */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Truck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-base font-semibold">Meu transporte</p>
            <p className="text-xs text-muted-foreground">Deslocamento pessoal até o evento</p>
          </div>
        </div>

        {/* Type selector */}
        <div className="grid grid-cols-2 gap-3">
          {types.map((t) => (
            <button key={t.value} type="button" onClick={() => set("transportType", t.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-medium transition-all ${
                form.transportType === t.value
                  ? "border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                  : "border-border text-muted-foreground hover:border-amber-300"
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Air or ground */}
        {(form.transportType === "air" || form.transportType === "ground") && (
          <div className="space-y-1.5 pl-4 border-l-2 border-amber-200 dark:border-amber-800">
            <Label htmlFor="transportCost">{form.transportType === "air" ? "Valor da passagem aérea (R$)" : "Valor do transporte (R$)"}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium pointer-events-none">R$</span>
              <Input id="transportCost" inputMode="numeric" placeholder="0,00" value={form.transportCost}
                onChange={(e) => set("transportCost", applyBRLMask(e.target.value))} className="pl-9" />
            </div>
            {n(form.transportCost) > 0 && <p className="text-xs font-medium text-amber-600">{fmt(n(form.transportCost))}</p>}
          </div>
        )}

        {/* Own vehicle */}
        {form.transportType === "own_vehicle" && (
          <div className="space-y-5 pl-4 border-l-2 border-amber-200 dark:border-amber-800">
            <div className="space-y-1.5">
              <Label htmlFor="origin">Endereço de partida</Label>
              <AddressInput id="origin" placeholder="ex: Rua das Flores, 123, São Paulo, SP"
                value={form.transportOrigin} onChange={handleOriginChange} googleReady={googleReady} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dest">Endereço de chegada</Label>
              <AddressInput id="dest" placeholder="ex: Rua da Saudade, 456, Campinas, SP"
                value={form.transportDestination} onChange={handleDestChange} googleReady={googleReady} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="gasPrice"><div className="flex items-center gap-1.5"><Fuel className="h-3.5 w-3.5" /> Gasolina (R$/litro)</div></Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium pointer-events-none">R$</span>
                  <Input id="gasPrice" inputMode="numeric" placeholder="0,00" value={form.transportGasPrice}
                    onChange={(e) => set("transportGasPrice", applyBRLMask(e.target.value))} className="pl-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kmPerL">KM por litro do veículo</Label>
                <Input id="kmPerL" type="number" min="1" step="0.1" placeholder="ex: 12"
                  value={form.transportKmPerLiter} onChange={(e) => set("transportKmPerLiter", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="axles">Número de eixos</Label>
                <select id="axles" value={form.transportAxles} onChange={(e) => set("transportAxles", e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="2">2 eixos (carro passeio)</option>
                  <option value="3">3 eixos (van / pick-up)</option>
                  <option value="4">4 eixos</option>
                  <option value="5">5 eixos</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Preferência de rota</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["fastest", "shortest"] as const).map((rt) => (
                    <button key={rt} type="button" onClick={() => set("transportRouteType", rt)}
                      className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                        form.transportRouteType === rt ? "border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-900/20" : "border-border text-muted-foreground hover:border-amber-300"
                      }`}>
                      {rt === "fastest" ? "Mais rápida" : "Mais curta"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
              <div onClick={() => onRoundTripChange(!roundTrip)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${roundTrip ? "bg-amber-500 border-amber-500" : "border-border bg-background group-hover:border-amber-400"}`}>
                {roundTrip && <Check className="h-3 w-3 text-white" />}
              </div>
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                Calcular volta <span className="text-xs">(dobra o custo de transporte)</span>
              </span>
            </label>
            <Button type="button" onClick={onCalculate} disabled={calcLoading}
              className={`w-full gap-2 text-white ${form.transportRouteCalculated ? "bg-amber-600 hover:bg-amber-700" : "bg-amber-500 hover:bg-amber-600"}`}>
              {calcLoading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Calculando...</>
                : form.transportRouteCalculated
                ? <><MapPin className="h-4 w-4" /> Recalcular Rota</>
                : <><MapPin className="h-4 w-4" /> Calcular Rota</>}
            </Button>
            {calcError && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><p>{calcError}</p>
              </div>
            )}
            <div className="space-y-3 pt-1">
              <p className="text-xs text-muted-foreground font-medium">Ou insira manualmente:</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="distKm" className="text-xs">Distância (km)</Label>
                  <Input id="distKm" type="number" min="0" step="0.1" placeholder="ex: 120"
                    value={form.transportDistanceKm} onChange={(e) => {
                      const km = e.target.value;
                      const fuel = n(form.transportGasPrice) > 0 && Number(form.transportKmPerLiter) > 0
                        ? (parseFloat(km) / Number(form.transportKmPerLiter)) * n(form.transportGasPrice) : 0;
                      set("transportDistanceKm", km);
                      if (fuel > 0) set("transportFuelCost", applyBRLMask(String(Math.round(fuel * 100))));
                    }} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tollCost" className="text-xs">Custo de pedágios (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium pointer-events-none">R$</span>
                    <Input id="tollCost" inputMode="numeric" placeholder="0,00" value={form.transportTollCost}
                      onChange={(e) => set("transportTollCost", applyBRLMask(e.target.value))} className="pl-9" />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fuelCost" className="text-xs">Custo de combustível (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium pointer-events-none">R$</span>
                  <Input id="fuelCost" inputMode="numeric" placeholder="0,00" value={form.transportFuelCost}
                    onChange={(e) => set("transportFuelCost", applyBRLMask(e.target.value))} className="pl-9" />
                </div>
              </div>
            </div>
            {(n(form.transportFuelCost) + n(form.transportTollCost)) > 0 && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 space-y-1">
                {n(form.transportDistanceKm) > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Distância{roundTrip ? " (ida)" : ""}</span><span>{form.transportDistanceKm} km</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Combustível{roundTrip ? " (ida)" : ""}</span><span>{fmt(n(form.transportFuelCost))}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Pedágios{roundTrip ? " (ida)" : ""}</span><span>{fmt(n(form.transportTollCost))}</span>
                </div>
                {roundTrip && (
                  <div className="flex justify-between text-xs text-amber-600 font-medium pt-0.5">
                    <span>Subtotal ida e volta (×2)</span><span>{fmt((n(form.transportFuelCost) + n(form.transportTollCost)) * 2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold pt-1 border-t border-amber-200 dark:border-amber-800">
                  <span>Total transporte</span>
                  <span className="text-amber-600">{fmt((n(form.transportFuelCost) + n(form.transportTollCost)) * (roundTrip ? 2 : 1))}</span>
                </div>
              </div>
            )}

            {/* Passengers in my vehicle */}
            {hasTeam && (
              <div className="space-y-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Passageiros no meu veículo
                </Label>
                <p className="text-xs text-muted-foreground">Membros da equipe que vão no mesmo carro</p>
                <div className="space-y-1.5">
                  {form.staffMembers.map((m) => {
                    const isPassenger = form.myTransportPassengers.includes(m.id);
                    return (
                      <button key={m.id} type="button" onClick={() => toggleMyPassenger(m.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                          isPassenger ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300" : "border-border hover:border-amber-300"
                        }`}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isPassenger ? "bg-amber-500 border-amber-500" : "border-muted-foreground"}`}>
                          {isPassenger && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                        <span>{m.name || "Profissional sem nome"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Transporte da equipe ── */}
      {hasTeam && (
        <>
          <div className="border-t border-border" />
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-base font-semibold">Transporte da equipe</p>
                <p className="text-xs text-muted-foreground">Adicione um ou mais transportes para a equipe</p>
              </div>
            </div>
            <Toggle value={form.hasTeamTransport} onChange={(v) => set("hasTeamTransport", v)} />

            {form.hasTeamTransport && (
              <div className="space-y-3">
                {form.teamTransports.map((tt) => (
                  <TeamTransportCard
                    key={tt.id}
                    transport={tt}
                    staffMembers={form.staffMembers}
                    allTransports={form.teamTransports}
                    onChange={(patch) => updateTeamTransport(tt.id, patch)}
                    onRemove={() => removeTeamTransport(tt.id)}
                    googleReady={googleReady}
                  />
                ))}
                <button type="button" onClick={addTeamTransport}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-amber-200 dark:border-amber-800 text-sm font-medium text-amber-600 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all">
                  <PlusCircle className="h-4 w-4" /> Adicionar transporte
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

// ── Step 6: Extras ─────────────────────────────────────────────

function StepExtras({ form, set }: { form: FormState; set: any }) {
  function addItem() {
    set("extraCosts", [...form.extraCosts, { name: "", value: "" }]);
  }
  function removeItem(i: number) {
    set("extraCosts", form.extraCosts.filter((_, idx) => idx !== i));
  }
  function updateItem(i: number, field: "name" | "value", val: string) {
    const updated = form.extraCosts.map((c, idx) => idx === i ? { ...c, [field]: val } : c);
    set("extraCosts", updated);
  }
  const total = form.extraCosts.reduce((s, c) => s + n(c.value), 0);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Adicione qualquer custo extra relacionado ao evento (taxas, materiais, deslocamento especial, etc.).</p>
      {form.extraCosts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-border rounded-xl gap-2 text-muted-foreground">
          <PlusCircle className="h-6 w-6" />
          <p className="text-sm">Nenhum custo extra adicionado</p>
        </div>
      )}
      {form.extraCosts.map((c, i) => (
        <div key={i} className="flex gap-3 items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Input placeholder="ex: Taxa de captação de áudio" value={c.name} onChange={(e) => updateItem(i, "name", e.target.value)} />
          </div>
          <div className="w-36 space-y-1.5">
            <Label className="text-xs">Valor (R$)</Label>
            <Input inputMode="numeric" placeholder="0,00" value={c.value} onChange={(e) => updateItem(i, "value", applyBRLMask(e.target.value))} />
          </div>
          <Button variant="ghost" size="icon" className="hover:text-destructive shrink-0" onClick={() => removeItem(i)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addItem} className="w-full gap-2 border-dashed">
        <PlusCircle className="h-4 w-4" /> Adicionar custo extra
      </Button>
      {total > 0 && (
        <div className="rounded-lg bg-muted/50 border px-3 py-2 flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Total de custos extras</span>
          <span className="font-bold">{fmt(total)}</span>
        </div>
      )}
    </div>
  );
}

// ── Step 7: Resumo ─────────────────────────────────────────────

interface QuoteTotals {
  labor: number; accom: number; food: number;
  staffLabor: number; staffAccom: number; staffFood: number;
  transport: number; teamTransport: number; extras: number;
  equipmentCostPerJob: number; swPerJob: number; infraPerJob: number;
  grand: number;
}

function StepResumo({ form, snapshot, totals, error, saving, onSave, isEditing }: {
  form: FormState;
  snapshot: BudgetSnapshot;
  totals: QuoteTotals;
  error: string; saving: boolean; onSave: () => void; isEditing?: boolean;
}) {
  const jobs = Math.max(1, n(form.jobsPerMonth));
  const transportTotal = form.transportType === "own_vehicle"
    ? n(form.transportFuelCost) + n(form.transportTollCost)
    : n(form.transportCost);

  type Row = { label: string; value: number; sub?: boolean; color?: string };
  const rows: Row[] = [
    { label: `Mão de obra (${form.coverageHours}h × ${fmt(n(form.hourlyRate))})`, value: totals.labor },
    ...(totals.accom > 0 ? [{ label: `Hospedagem (${form.accommodationDays} diária${n(form.accommodationDays) > 1 ? "s" : ""} × ${fmt(n(form.accommodationDailyRate))})`, value: totals.accom }] : []),
    ...(totals.food > 0 ? [{ label: `Alimentação (${form.foodMeals} refeição${n(form.foodMeals) > 1 ? "ões" : ""} × ${fmt(n(form.foodCostPerMeal))})`, value: totals.food }] : []),
    ...form.staffMembers.flatMap((m, idx) => {
      const label = m.name || `Profissional ${idx + 1}`;
      const labor = n(m.coverageHours) * n(m.hourlyRate);
      return labor > 0 ? [{ label: `Mão de obra — ${label} (${m.coverageHours}h)`, value: labor, color: "text-violet-600" }] : [];
    }),
    ...(totals.staffAccom > 0 ? [{ label: "Hospedagem da equipe", value: totals.staffAccom, sub: true }] : []),
    ...(totals.staffFood > 0 ? [{ label: "Alimentação da equipe", value: totals.staffFood, sub: true }] : []),
    ...(totals.teamTransport > 0 ? [{ label: "Transporte da equipe", value: totals.teamTransport }] : []),
    ...(transportTotal > 0 ? [{
      label: form.transportType === "air" ? "Transporte aéreo"
        : form.transportType === "ground" ? "Transporte terrestre"
        : `Transporte (${form.transportDistanceKm} km — combustível + pedágio)`,
      value: transportTotal,
    }] : []),
    ...(totals.extras > 0 ? [{ label: "Custos extras", value: totals.extras }] : []),
    ...(snapshot.equipmentCostPerJob > 0 ? [{ label: "Depreciação de equipamentos (por job)", value: snapshot.equipmentCostPerJob, color: "text-amber-600" }] : []),
    ...(totals.swPerJob > 0 ? [{ label: `Softwares por job (${fmt(snapshot.softwareMonthlyCost)}/mês ÷ ${jobs} jobs)`, value: totals.swPerJob, color: "text-violet-600" }] : []),
    ...(totals.infraPerJob > 0 ? [{ label: `Infraestrutura por job (${fmt(snapshot.infrastructureMonthlyCost)}/mês ÷ ${jobs} jobs)`, value: totals.infraPerJob, color: "text-rose-600" }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Event header */}
      <div className="rounded-xl bg-amber-50/70 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30 p-4 space-y-1">
        <p className="font-bold text-base">{form.eventName || "Evento sem nome"}</p>
        {form.eventLocation && <p className="text-sm text-muted-foreground">{form.eventLocation}</p>}
        {form.eventDate && (
          <p className="text-sm text-muted-foreground">
            {new Date(form.eventDate + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}
        <p className="text-sm text-muted-foreground">{form.coverageHours} horas de cobertura</p>
      </div>

      {/* Cost breakdown */}
      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div key={i} className={`flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-0 ${row.sub ? "pl-4" : ""}`}>
            <span className="text-muted-foreground truncate pr-2">{row.label}</span>
            <span className={`font-semibold shrink-0 ${row.color ?? ""}`}>{fmt(row.value)}</span>
          </div>
        ))}
      </div>

      {/* Grand total */}
      <div className="rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-yellow-500/10 border border-amber-500/20 p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Custo total estimado</p>
          <p className="text-xs text-muted-foreground mt-0.5">Valor mínimo que deve ser cobrado para cobrir todos os custos</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-amber-500">{fmt(totals.grand)}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <Button onClick={onSave} disabled={saving} className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white text-base py-6">
        {saving ? <><Loader2 className="h-5 w-5 animate-spin" /> Salvando...</> : <><Check className="h-5 w-5" /> {isEditing ? "Atualizar Orçamento" : "Salvar Orçamento"}</>}
      </Button>
    </div>
  );
}
