"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, ChevronRight, FileText, CalendarDays, MapPin, Clock,
  Hotel, Utensils, Users, Car, Plane, Bus, Fuel, Package,
  MonitorSmartphone, Building2, DollarSign, Trash2, AlertCircle, Pencil,
} from "lucide-react";
import Link from "next/link";
import apiClient from "@/lib/api-service";
import { ScrollReveal } from "@/components/scroll-reveal";

// ── Types ──────────────────────────────────────────────────────

interface Quote {
  id: string;
  eventName: string;
  eventLocation?: string;
  eventDate?: string;
  coverageHours: number;
  hourlyRate: number;
  jobsPerMonth: number;
  accommodation: { enabled: boolean; dailyRate?: number; days?: number };
  food: { enabled: boolean; costPerMeal?: number; meals?: number };
  additionalStaff: {
    enabled: boolean;
    hourlyRate?: number;
    copyValues?: boolean;
    accommodation?: { enabled: boolean; dailyRate?: number; days?: number };
    food?: { enabled: boolean; costPerMeal?: number; meals?: number };
  };
  transport: {
    type: "none" | "air" | "ground" | "own_vehicle";
    cost?: number;
    originAddress?: string;
    destinationAddress?: string;
    distanceKm?: number;
    durationMinutes?: number;
    gasPricePerLiter?: number;
    kmPerLiter?: number;
    axles?: number;
    routeType?: string;
    fuelCost?: number;
    tollCost?: number;
  };
  extraCosts: { name: string; value: number }[];
  equipmentCostPerJob: number;
  softwareMonthlyCost: number;
  infrastructureMonthlyCost: number;
  grandTotal: number;
  createdAt: string;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ""}` : `${m}min`;
}

// ── CostRow ────────────────────────────────────────────────────

function CostRow({ label, value, sub = false, colorClass = "" }: { label: string; value: number; sub?: boolean; colorClass?: string }) {
  return (
    <div className={`flex items-center justify-between text-sm py-2 border-b border-border/40 last:border-0 ${sub ? "pl-5" : ""}`}>
      <div className="flex items-center gap-2 min-w-0 pr-2">
        {sub && <div className="w-1 h-1 rounded-full bg-muted-foreground shrink-0" />}
        <span className="text-muted-foreground truncate">{label}</span>
      </div>
      <span className={`font-semibold shrink-0 ${colorClass}`}>{fmt(value)}</span>
    </div>
  );
}

// ── Section ────────────────────────────────────────────────────

function Section({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
  return (
    <Card className={`border shadow-sm border-${color}-200/50 dark:border-${color}-800/30`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400 flex items-center justify-center`}>
            {icon}
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { userProfile, loading } = useAuth();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [fetching, setFetching] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !userProfile) router.push("/login");
  }, [userProfile, loading, router]);

  useEffect(() => {
    if (!userProfile || !params.id) return;
    apiClient.get(`/budget-quotes/${params.id}`)
      .then((res) => setQuote(res.data))
      .catch(() => router.push("/dashboard/calculadora-orcamento"))
      .finally(() => setFetching(false));
  }, [userProfile, params.id, router]);

  async function handleDelete() {
    if (!quote) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/budget-quotes/${quote.id}`);
      router.push("/dashboard/calculadora-orcamento");
    } catch {
      setDeleting(false);
    }
  }

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!quote) return null;

  const jobs = Math.max(1, quote.jobsPerMonth);
  const laborCost = quote.coverageHours * quote.hourlyRate;
  const accomCost = quote.accommodation.enabled ? (quote.accommodation.dailyRate ?? 0) * (quote.accommodation.days ?? 0) : 0;
  const foodCost = quote.food.enabled ? (quote.food.costPerMeal ?? 0) * (quote.food.meals ?? 0) : 0;
  const staffLaborCost = quote.additionalStaff.enabled ? (quote.additionalStaff.hourlyRate ?? 0) * quote.coverageHours : 0;
  const staffAccomCost = quote.additionalStaff.enabled ? (quote.additionalStaff.accommodation?.enabled ? (quote.additionalStaff.accommodation.dailyRate ?? 0) * (quote.additionalStaff.accommodation.days ?? 0) : 0) : 0;
  const staffFoodCost = quote.additionalStaff.enabled ? (quote.additionalStaff.food?.enabled ? (quote.additionalStaff.food.costPerMeal ?? 0) * (quote.additionalStaff.food.meals ?? 0) : 0) : 0;
  const transportCost = quote.transport.type === "own_vehicle"
    ? (quote.transport.fuelCost ?? 0) + (quote.transport.tollCost ?? 0)
    : (quote.transport.cost ?? 0);
  const extraTotal = quote.extraCosts.reduce((s, c) => s + c.value, 0);
  const swPerJob = quote.softwareMonthlyCost / jobs;
  const infraPerJob = quote.infrastructureMonthlyCost / jobs;

  const transportLabel = {
    none: "Sem transporte",
    air: "Transporte aéreo",
    ground: "Transporte terrestre",
    own_vehicle: "Veículo próprio",
  }[quote.transport.type];

  return (
    <div className="min-h-screen flex flex-col bg-background/50">
      <Header />
      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-3xl space-y-8">
          <ScrollReveal>
          <div className="space-y-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/dashboard/calculadora-orcamento" className="hover:text-foreground transition-colors">Calculadora</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground font-medium truncate">{quote.eventName}</span>
            </div>

            {/* Hero */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 p-8 border border-amber-500/10">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow shrink-0">
                    <FileText className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-2xl font-bold">{quote.eventName}</h1>
                    {quote.eventLocation && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />{quote.eventLocation}
                      </div>
                    )}
                    {quote.eventDate && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(quote.eventDate + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />{quote.coverageHours}h de cobertura
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link href={`/dashboard/calculadora-orcamento/novo-orcamento?editId=${quote.id}`}>
                    <Button variant="ghost" size="icon" className="hover:text-amber-500 hover:bg-amber-500/10">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
            </div>

            {/* Grand total highlight */}
            <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white shadow-lg shadow-amber-500/20">
              <p className="text-amber-100 text-sm font-medium mb-1">Custo total estimado do evento</p>
              <p className="text-4xl font-bold">{fmt(quote.grandTotal)}</p>
              <p className="text-amber-200 text-xs mt-2">Valor mínimo a cobrar para cobrir todos os custos operacionais</p>
            </div>

            {/* Cost breakdown sections */}
            <div className="space-y-4">

              {/* Labor */}
              <Section icon={<Clock className="h-4 w-4" />} title="Mão de Obra" color="amber">
                <div className="space-y-0.5">
                  <CostRow label={`${quote.coverageHours}h × ${fmt(quote.hourlyRate)}/h`} value={laborCost} />
                  {staffLaborCost > 0 && (
                    <CostRow label={`2º profissional — ${quote.coverageHours}h × ${fmt(quote.additionalStaff.hourlyRate ?? 0)}/h`} value={staffLaborCost} colorClass="text-violet-600" />
                  )}
                </div>
              </Section>

              {/* Accommodation */}
              {(accomCost > 0 || staffAccomCost > 0) && (
                <Section icon={<Hotel className="h-4 w-4" />} title="Hospedagem" color="blue">
                  <div className="space-y-0.5">
                    {accomCost > 0 && (
                      <CostRow label={`${quote.accommodation.days} diária${(quote.accommodation.days ?? 0) > 1 ? "s" : ""} × ${fmt(quote.accommodation.dailyRate ?? 0)}`} value={accomCost} />
                    )}
                    {staffAccomCost > 0 && (
                      <CostRow label={`2º profissional — hospedagem`} value={staffAccomCost} sub colorClass="text-violet-600" />
                    )}
                  </div>
                </Section>
              )}

              {/* Food */}
              {(foodCost > 0 || staffFoodCost > 0) && (
                <Section icon={<Utensils className="h-4 w-4" />} title="Alimentação" color="green">
                  <div className="space-y-0.5">
                    {foodCost > 0 && (
                      <CostRow label={`${quote.food.meals} refeição${(quote.food.meals ?? 0) > 1 ? "ões" : ""} × ${fmt(quote.food.costPerMeal ?? 0)}`} value={foodCost} />
                    )}
                    {staffFoodCost > 0 && (
                      <CostRow label={`2º profissional — alimentação`} value={staffFoodCost} sub colorClass="text-violet-600" />
                    )}
                  </div>
                </Section>
              )}

              {/* Transport */}
              {transportCost > 0 && (
                <Section icon={
                  quote.transport.type === "air" ? <Plane className="h-4 w-4" />
                  : quote.transport.type === "own_vehicle" ? <Car className="h-4 w-4" />
                  : <Bus className="h-4 w-4" />
                } title={transportLabel} color="orange">
                  {quote.transport.type === "own_vehicle" ? (
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {quote.transport.originAddress && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-orange-500 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-foreground">Saída</p>
                            <p>{quote.transport.originAddress}</p>
                          </div>
                        </div>
                      )}
                      {quote.transport.destinationAddress && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-orange-500 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-foreground">Destino</p>
                            <p>{quote.transport.destinationAddress}</p>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {quote.transport.distanceKm && (
                          <div className="rounded-lg bg-muted/60 p-2.5 text-center">
                            <p className="text-lg font-bold text-foreground">{quote.transport.distanceKm} km</p>
                            <p className="text-xs">distância</p>
                          </div>
                        )}
                        {quote.transport.durationMinutes && (
                          <div className="rounded-lg bg-muted/60 p-2.5 text-center">
                            <p className="text-lg font-bold text-foreground">{formatDuration(quote.transport.durationMinutes)}</p>
                            <p className="text-xs">tempo estimado</p>
                          </div>
                        )}
                        {quote.transport.gasPricePerLiter && (
                          <div className="rounded-lg bg-muted/60 p-2.5 text-center">
                            <p className="text-lg font-bold text-foreground">{fmt(quote.transport.gasPricePerLiter)}/L</p>
                            <p className="text-xs">combustível</p>
                          </div>
                        )}
                        {quote.transport.kmPerLiter && (
                          <div className="rounded-lg bg-muted/60 p-2.5 text-center">
                            <p className="text-lg font-bold text-foreground">{quote.transport.kmPerLiter} km/L</p>
                            <p className="text-xs">consumo</p>
                          </div>
                        )}
                      </div>
                      <div className="pt-1 space-y-0.5">
                        {(quote.transport.fuelCost ?? 0) > 0 && (
                          <CostRow label="Combustível" value={quote.transport.fuelCost ?? 0} />
                        )}
                        {(quote.transport.tollCost ?? 0) > 0 && (
                          <CostRow label={`Pedágios (${quote.transport.axles} eixos)`} value={quote.transport.tollCost ?? 0} />
                        )}
                      </div>
                    </div>
                  ) : (
                    <CostRow label={transportLabel} value={transportCost} />
                  )}
                </Section>
              )}

              {/* Extra costs */}
              {extraTotal > 0 && (
                <Section icon={<DollarSign className="h-4 w-4" />} title="Custos Extras" color="slate">
                  <div className="space-y-0.5">
                    {quote.extraCosts.map((c, i) => <CostRow key={i} label={c.name} value={c.value} />)}
                  </div>
                </Section>
              )}

              {/* Budget calculator costs */}
              {(quote.equipmentCostPerJob > 0 || swPerJob > 0 || infraPerJob > 0) && (
                <Section icon={<Package className="h-4 w-4" />} title="Custos Operacionais (Calculadora)" color="amber">
                  <div className="space-y-0.5">
                    {quote.equipmentCostPerJob > 0 && (
                      <CostRow label="Depreciação de equipamentos (por job)" value={quote.equipmentCostPerJob} colorClass="text-amber-600" />
                    )}
                    {swPerJob > 0 && (
                      <CostRow label={`Softwares — ${fmt(quote.softwareMonthlyCost)}/mês ÷ ${jobs} jobs`} value={swPerJob} colorClass="text-violet-600" />
                    )}
                    {infraPerJob > 0 && (
                      <CostRow label={`Infraestrutura — ${fmt(quote.infrastructureMonthlyCost)}/mês ÷ ${jobs} jobs`} value={infraPerJob} colorClass="text-rose-600" />
                    )}
                  </div>
                </Section>
              )}
            </div>

            {/* Total breakdown summary */}
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b bg-muted/30">
                <p className="font-bold text-sm">Resumo por categoria</p>
              </div>
              <div className="p-5 space-y-2">
                {laborCost + staffLaborCost > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Mão de obra total</span>
                    <span className="font-semibold">{fmt(laborCost + staffLaborCost)}</span>
                  </div>
                )}
                {accomCost + staffAccomCost > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Hotel className="h-3.5 w-3.5" /> Hospedagem total</span>
                    <span className="font-semibold">{fmt(accomCost + staffAccomCost)}</span>
                  </div>
                )}
                {foodCost + staffFoodCost > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Utensils className="h-3.5 w-3.5" /> Alimentação total</span>
                    <span className="font-semibold">{fmt(foodCost + staffFoodCost)}</span>
                  </div>
                )}
                {transportCost > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Car className="h-3.5 w-3.5" /> Transporte total</span>
                    <span className="font-semibold">{fmt(transportCost)}</span>
                  </div>
                )}
                {extraTotal > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><DollarSign className="h-3.5 w-3.5" /> Custos extras</span>
                    <span className="font-semibold">{fmt(extraTotal)}</span>
                  </div>
                )}
                {(quote.equipmentCostPerJob + swPerJob + infraPerJob) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Package className="h-3.5 w-3.5" /> Custos operacionais</span>
                    <span className="font-semibold text-amber-600">{fmt(quote.equipmentCostPerJob + swPerJob + infraPerJob)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-3 mt-3 flex items-center justify-between font-bold">
                  <span>Total geral</span>
                  <span className="text-amber-500 text-lg">{fmt(quote.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex gap-3 pt-2">
              <Link href="/dashboard/calculadora-orcamento" className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
              </Link>
              <Link href={`/dashboard/calculadora-orcamento/novo-orcamento?editId=${quote.id}`}>
                <Button variant="outline" className="gap-2 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600 border-amber-200">
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
              </Link>
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            </div>
          </div>
          </ScrollReveal>
        </div>
      </main>
      <Footer />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o orçamento de <strong>{quote.eventName}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
