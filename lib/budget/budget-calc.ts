/**
 * Calculadora de Orçamento — tipos, cálculo (ESPELHO do backend) e helpers.
 *
 * O backend é a fonte de verdade
 * (`isoscanning-backend/src/modules/budget-quote/domain/budget-quote.calculator.ts`):
 * ele recalcula custo e preço ao salvar e devolve `breakdown`, `finalPrice`,
 * `profit` e `clientLineItems`. O espelho abaixo existe só para a prévia ao
 * vivo do formulário. Alterou uma regra lá? Altere aqui.
 */

// ─── Tipos da API ───────────────────────────────────────────────────────────

export type BudgetQuoteStatus = "draft" | "sent" | "approved" | "rejected";

export interface CostBreakdown {
  labor: number;
  accommodation: number;
  food: number;
  staffLabor: number;
  staffAccommodation: number;
  staffFood: number;
  transport: number;
  teamTransport: number;
  extras: number;
  equipment: number;
  software: number;
  infrastructure: number;
  total: number;
}

export type ClientLineKey = "labor" | "team" | "accommodation" | "food" | "transport" | "extras" | "operational";

export interface ClientLineItem {
  key: ClientLineKey;
  label: string;
  amount: number;
}

export interface LinkedContract {
  id: string;
  status: string;
}

export interface StaffMemberData {
  id?: string;
  name?: string;
  hourlyRate?: number;
  coverageHours?: number;
}

export interface BudgetQuoteData {
  id: string;
  eventName: string;
  eventLocation?: string | null;
  eventDate?: string | null;
  eventEndDate?: string | null;
  coverageHours: number;
  hourlyRate: number;
  jobsPerMonth: number;
  accommodation: { enabled: boolean; dailyRate?: number; days?: number };
  food: { enabled: boolean; costPerMeal?: number; meals?: number };
  additionalStaff: {
    enabled: boolean;
    hourlyRate?: number;
    members?: StaffMemberData[];
    teamAccommodation?: any;
    teamFood?: any;
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
    roundTrip?: boolean;
    passengers?: string[];
    teamTransports?: any[];
  };
  extraCosts: { name: string; value: number }[];
  equipmentCostPerJob: number;
  softwareMonthlyCost: number;
  infrastructureMonthlyCost: number;
  totalCost: number;
  /** Compatibilidade: igual a totalCost. */
  grandTotal: number;
  marginPercent: number;
  discount: number;
  finalPrice: number;
  profit: number;
  breakdown: CostBreakdown;
  clientLineItems: ClientLineItem[];
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientDocument?: string | null;
  scopeNotes?: string | null;
  paymentTerms?: string | null;
  showBreakdown: boolean;
  validUntil?: string | null;
  status: BudgetQuoteStatus;
  shareToken?: string | null;
  sentAt?: string | null;
  viewedAt?: string | null;
  viewCount: number;
  respondedAt?: string | null;
  responseName?: string | null;
  responseMessage?: string | null;
  contractId?: string | null;
  contract?: LinkedContract | null;
  isExpired: boolean;
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Status para a UI ───────────────────────────────────────────────────────

/** Estado "de tela": deriva expirada/visualizada/contratada do que a API devolve. */
export type QuoteDisplayStatus = "draft" | "sent" | "viewed" | "expired" | "approved" | "rejected" | "contracted";

const ACTIVE_CONTRACT = new Set(["draft", "sent", "partially_signed", "fully_signed"]);

export function quoteDisplayStatus(q: Pick<BudgetQuoteData, "status" | "isExpired" | "viewCount" | "contract">): QuoteDisplayStatus {
  if (q.contract && ACTIVE_CONTRACT.has(q.contract.status)) return "contracted";
  if (q.status === "approved") return "approved";
  if (q.status === "rejected") return "rejected";
  if (q.status === "sent") {
    if (q.isExpired) return "expired";
    return q.viewCount > 0 ? "viewed" : "sent";
  }
  return "draft";
}

export const DISPLAY_STATUS_LABELS: Record<QuoteDisplayStatus, string> = {
  draft: "Rascunho",
  sent: "Enviada ao cliente",
  viewed: "Visualizada pelo cliente",
  expired: "Validade vencida",
  approved: "Aprovada pelo cliente",
  rejected: "Recusada pelo cliente",
  contracted: "Em contrato",
};

export const DISPLAY_STATUS_STYLES: Record<QuoteDisplayStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  sent: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900/50",
  viewed: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-900/50",
  expired: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-900/50",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-900/50",
  rejected: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900/50",
  contracted: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-900/50",
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: "Contrato em rascunho",
  sent: "Contrato enviado para assinatura",
  partially_signed: "Contrato parcialmente assinado",
  fully_signed: "Contrato assinado",
  rejected: "Contrato recusado",
  cancelled: "Contrato cancelado",
  expired: "Contrato expirado",
  terminated: "Contrato encerrado (distrato)",
};

/** Contrato que ainda "segura" a proposta (impede excluir/retirar). */
export function hasActiveContract(q: Pick<BudgetQuoteData, "contract">): boolean {
  return !!q.contract && ACTIVE_CONTRACT.has(q.contract.status);
}

// ─── Formatação ─────────────────────────────────────────────────────────────

export function fmtBRL(v: number): string {
  return (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "1.200,50" → 1200.5 (aceita também "1200.50"). */
export function parseBRL(v: string | number | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (!v) return 0;
  const s = String(v).trim();
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

/** Máscara de moeda enquanto digita: "123456" → "1.234,56". */
export function applyBRLMask(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** number → string mascarada ("1.234,56"); 0/undefined → "". */
export function toBRLMask(value: number | null | undefined): string {
  if (!value || !Number.isFinite(value) || value <= 0) return "";
  return applyBRLMask(String(Math.round(value * 100)));
}

/** "2026-09-10" → "10/09/2026" sem deslocamento de fuso. */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

/** "2026-09-10" → "quinta-feira, 10 de setembro de 2026". */
export function formatDateLong(value: string | null | undefined): string {
  if (!value) return "";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

// ─── Cálculo (espelho) ──────────────────────────────────────────────────────

export interface CalculatorInput {
  coverageHours: number;
  hourlyRate: number;
  jobsPerMonth: number;
  accommodation?: { enabled?: boolean; dailyRate?: number | null; days?: number | null } | null;
  food?: { enabled?: boolean; costPerMeal?: number | null; meals?: number | null } | null;
  additionalStaff?: {
    enabled?: boolean;
    members?: StaffMemberData[];
    teamAccommodation?: {
      enabled?: boolean;
      mode?: "individual" | "grouped";
      individual?: Array<{ memberId?: string; dailyRate?: number | null; days?: number | null }>;
      groups?: Array<{ type?: string; dailyRate?: number | null; days?: number | null }>;
    } | null;
    teamFood?: {
      enabled?: boolean;
      mode?: "same" | "individual";
      same?: { costPerMeal?: number | null; meals?: number | null } | null;
      individual?: Array<{ memberId?: string; costPerMeal?: number | null; meals?: number | null }>;
    } | null;
    hourlyRate?: number | null;
    accommodation?: { enabled?: boolean; dailyRate?: number | null; days?: number | null } | null;
    food?: { enabled?: boolean; costPerMeal?: number | null; meals?: number | null } | null;
  } | null;
  transport?: TransportLegInput & { teamTransports?: TransportLegInput[] | null } | null;
  extraCosts?: Array<{ name?: string; value?: number | null }> | null;
  equipmentCostPerJob: number;
  softwareMonthlyCost: number;
  infrastructureMonthlyCost: number;
}

export interface TransportLegInput {
  type?: "none" | "air" | "ground" | "own_vehicle";
  cost?: number | null;
  fuelCost?: number | null;
  tollCost?: number | null;
  roundTrip?: boolean;
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const round2 = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;

/** Custo de um trecho de transporte: passagem é valor cheio; veículo próprio dobra na volta. */
export function legCost(leg: TransportLegInput | null | undefined): number {
  if (!leg) return 0;
  switch (leg.type) {
    case "air":
    case "ground":
      return num(leg.cost);
    case "own_vehicle": {
      const oneWay = num(leg.fuelCost) + num(leg.tollCost);
      return leg.roundTrip ? oneWay * 2 : oneWay;
    }
    default:
      return 0;
  }
}

export function computeCostBreakdown(input: CalculatorInput): CostBreakdown {
  const coverageHours = num(input.coverageHours);
  const labor = coverageHours * num(input.hourlyRate);

  const accommodation = input.accommodation?.enabled
    ? num(input.accommodation.dailyRate) * num(input.accommodation.days)
    : 0;
  const food = input.food?.enabled ? num(input.food.costPerMeal) * num(input.food.meals) : 0;

  const staff = input.additionalStaff ?? {};
  const members = Array.isArray(staff.members) ? staff.members : [];
  const memberIds = new Set(members.map((m) => m.id).filter(Boolean) as string[]);
  const hasMembers = members.length > 0;

  let staffLabor = 0;
  let staffAccommodation = 0;
  let staffFood = 0;

  if (hasMembers) {
    for (const m of members) staffLabor += num(m.coverageHours) * num(m.hourlyRate);

    const accom = staff.teamAccommodation;
    if (accom?.enabled) {
      if (accom.mode === "grouped") {
        for (const g of accom.groups ?? []) {
          staffAccommodation += g.type === "property" ? num(g.dailyRate) : num(g.dailyRate) * num(g.days);
        }
      } else {
        for (const e of accom.individual ?? []) {
          if (e.memberId && memberIds.size > 0 && !memberIds.has(e.memberId)) continue;
          staffAccommodation += num(e.dailyRate) * num(e.days);
        }
      }
    }

    const tf = staff.teamFood;
    if (tf?.enabled) {
      if (tf.mode === "individual") {
        for (const e of tf.individual ?? []) {
          if (e.memberId && memberIds.size > 0 && !memberIds.has(e.memberId)) continue;
          staffFood += num(e.costPerMeal) * num(e.meals);
        }
      } else {
        staffFood += num(tf.same?.costPerMeal) * num(tf.same?.meals) * members.length;
      }
    }
  } else if (staff.enabled) {
    staffLabor = num(staff.hourlyRate) * coverageHours;
    staffAccommodation = staff.accommodation?.enabled
      ? num(staff.accommodation.dailyRate) * num(staff.accommodation.days)
      : 0;
    staffFood = staff.food?.enabled ? num(staff.food.costPerMeal) * num(staff.food.meals) : 0;
  }

  const transport = legCost(input.transport);
  let teamTransport = 0;
  for (const leg of input.transport?.teamTransports ?? []) teamTransport += legCost(leg);

  const extras = (input.extraCosts ?? []).reduce((sum, c) => sum + num(c?.value), 0);

  const jobs = Math.max(1, num(input.jobsPerMonth));
  const equipment = num(input.equipmentCostPerJob);
  const software = num(input.softwareMonthlyCost) / jobs;
  const infrastructure = num(input.infrastructureMonthlyCost) / jobs;

  const parts = {
    labor: round2(labor),
    accommodation: round2(accommodation),
    food: round2(food),
    staffLabor: round2(staffLabor),
    staffAccommodation: round2(staffAccommodation),
    staffFood: round2(staffFood),
    transport: round2(transport),
    teamTransport: round2(teamTransport),
    extras: round2(extras),
    equipment: round2(equipment),
    software: round2(software),
    infrastructure: round2(infrastructure),
  };
  const total = round2(Object.values(parts).reduce((s, v) => s + v, 0));
  return { ...parts, total };
}

export function computeFinalPrice(totalCost: number, marginPercent: number, discount: number): number {
  const base = num(totalCost) * (1 + num(marginPercent) / 100);
  return round2(Math.max(0, base - num(discount)));
}

export function computeProfit(totalCost: number, finalPrice: number): number {
  return round2(num(finalPrice) - num(totalCost));
}

export const CLIENT_LINE_LABELS: Record<ClientLineKey, string> = {
  labor: "Honorários profissionais",
  team: "Equipe adicional",
  accommodation: "Hospedagem",
  food: "Alimentação",
  transport: "Transporte e deslocamento",
  extras: "Custos adicionais",
  operational: "Equipamentos, softwares e estrutura",
};

export function computeClientLineItems(breakdown: CostBreakdown, finalPrice: number): ClientLineItem[] {
  const allGroups: Array<{ key: ClientLineItem["key"]; cost: number }> = [
    { key: "labor", cost: breakdown.labor },
    { key: "team", cost: breakdown.staffLabor },
    { key: "accommodation", cost: breakdown.accommodation + breakdown.staffAccommodation },
    { key: "food", cost: breakdown.food + breakdown.staffFood },
    { key: "transport", cost: breakdown.transport + breakdown.teamTransport },
    { key: "extras", cost: breakdown.extras },
    { key: "operational", cost: breakdown.equipment + breakdown.software + breakdown.infrastructure },
  ];
  const groups = allGroups.filter((g) => g.cost > 0);

  const price = num(finalPrice);
  if (groups.length === 0 || price <= 0) {
    return price > 0 ? [{ key: "labor", label: CLIENT_LINE_LABELS.labor, amount: round2(price) }] : [];
  }

  const totalCost = groups.reduce((s, g) => s + g.cost, 0);
  const factor = totalCost > 0 ? price / totalCost : 0;

  const items: ClientLineItem[] = groups.map((g) => ({
    key: g.key,
    label: CLIENT_LINE_LABELS[g.key],
    amount: round2(g.cost * factor),
  }));

  // Diferença de arredondamento cai no maior item, para a soma fechar.
  const sum = round2(items.reduce((s, i) => s + i.amount, 0));
  const diff = round2(price - sum);
  if (diff !== 0) {
    const biggest = items.reduce((a, b) => (b.amount > a.amount ? b : a));
    biggest.amount = round2(biggest.amount + diff);
  }
  return items;
}

// ─── Compartilhamento da proposta ───────────────────────────────────────────

export function buildProposalUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.isoscanning.com";
  return `${origin}/proposta/${token}`;
}

export function buildProposalShareMessage(input: {
  eventName: string;
  ownerName: string;
  clientName?: string | null;
  price: number;
  link: string;
  validUntil?: string | null;
}): string {
  const lines = [
    `Olá${input.clientName ? `, ${input.clientName}` : ""}!`,
    "",
    `${input.ownerName} preparou a proposta para "${input.eventName}" no valor de ${fmtBRL(input.price)}.`,
    "",
    "Veja os detalhes e aprove pelo link (não precisa criar conta):",
    input.link,
  ];
  if (input.validUntil) lines.push("", `Proposta válida até ${formatDateOnly(input.validUntil)}.`);
  return lines.join("\n");
}
