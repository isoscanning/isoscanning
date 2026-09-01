/**
 * ESPELHO de isoscanning-backend/src/shared/plans/plan-limits.ts.
 *
 * O backend é a fonte de verdade: o front recebe `plan.limits` em GET /auth/me
 * e só usa esta cópia (1) nas rotas Next.js de IA (server) e (2) como fallback
 * enquanto o perfil ainda não carregou. Ao mudar um número lá, mude aqui.
 */

export type SubscriptionTier = "free" | "standard" | "pro" | "vip";

export const ALL_TIERS: readonly SubscriptionTier[] = ["free", "standard", "pro", "vip"];
export const PAID_TIERS: readonly SubscriptionTier[] = ["standard", "pro", "vip"];

export const PLAN_LABELS: Record<SubscriptionTier, string> = {
  free: "Free",
  standard: "Pro",
  pro: "Pro",
  vip: "Ultra",
};

export const TRIAL_DAYS = 14;

export type SupportChannel = "community" | "email" | "whatsapp";

export interface PlanLimits {
  jobApplicationsPerMonth: number | null;
  profileViewsPerMonth: number | null;
  jobOffersPerMonth: number | null;
  counterProposalsPerJob: number | null;
  equipmentListings: number | null;

  portfolioMediaFiles: number | null;
  portfolioVideos: number | null;
  verifiedBadge: boolean;
  directContact: boolean;
  searchRank: number;

  socialMediaAccounts: number | null;
  aiCalendarsPerMonth: number | null;
  teamMembersPerAccount: number | null;
  aiCreditsPerMonth: number | null;
  smPremiumReports: boolean;
  competitorAnalysis: boolean;
  whiteLabel: boolean;

  briefingsPerMonth: number | null;
  briefingMembers: number | null;
  briefingAiRefine: boolean;

  contractsPerMonth: number | null;
  customContractTemplates: boolean;
  routeCalculationsPerMonth: number | null;
  financeExport: boolean;

  /** Agenda privada de compromissos (o público vê só as datas fechadas) */
  personalAgenda: boolean;
  /** Sincronização com Google/iCloud/Outlook + feed .ics de exportação */
  calendarSync: boolean;

  supportChannel: SupportChannel;
}

export type CountableLimit = {
  [K in keyof PlanLimits]: PlanLimits[K] extends number | null ? K : never;
}[keyof PlanLimits];

export type FeatureFlag = {
  [K in keyof PlanLimits]: PlanLimits[K] extends boolean ? K : never;
}[keyof PlanLimits];

const FREE_LIMITS: PlanLimits = {
  jobApplicationsPerMonth: 5,
  profileViewsPerMonth: 10,
  jobOffersPerMonth: 1,
  counterProposalsPerJob: 0,
  equipmentListings: 1,

  portfolioMediaFiles: 4,
  portfolioVideos: 1,
  verifiedBadge: false,
  directContact: false,
  searchRank: 1,

  socialMediaAccounts: 1,
  aiCalendarsPerMonth: 1,
  teamMembersPerAccount: 0,
  aiCreditsPerMonth: 10,
  smPremiumReports: false,
  competitorAnalysis: false,
  whiteLabel: false,

  briefingsPerMonth: 1,
  briefingMembers: 2,
  briefingAiRefine: false,

  contractsPerMonth: 1,
  customContractTemplates: false,
  routeCalculationsPerMonth: 3,
  financeExport: false,
  personalAgenda: false,
  calendarSync: false,

  supportChannel: "community",
};

const PRO_LIMITS: PlanLimits = {
  jobApplicationsPerMonth: 10,
  profileViewsPerMonth: 30,
  jobOffersPerMonth: 3,
  counterProposalsPerJob: 3,
  equipmentListings: 5,

  portfolioMediaFiles: 20,
  portfolioVideos: 5,
  verifiedBadge: true,
  directContact: true,
  searchRank: 2,

  socialMediaAccounts: 5,
  aiCalendarsPerMonth: null,
  teamMembersPerAccount: 0,
  aiCreditsPerMonth: 300,
  smPremiumReports: true,
  competitorAnalysis: true,
  whiteLabel: false,

  briefingsPerMonth: 10,
  briefingMembers: 10,
  briefingAiRefine: true,

  contractsPerMonth: 10,
  customContractTemplates: true,
  routeCalculationsPerMonth: 50,
  financeExport: true,
  personalAgenda: true,
  calendarSync: true,

  supportChannel: "email",
};

const ULTRA_LIMITS: PlanLimits = {
  jobApplicationsPerMonth: null,
  profileViewsPerMonth: null,
  jobOffersPerMonth: null,
  counterProposalsPerJob: null,
  equipmentListings: null,

  portfolioMediaFiles: 150,
  portfolioVideos: 20,
  verifiedBadge: true,
  directContact: true,
  searchRank: 3,

  socialMediaAccounts: null,
  aiCalendarsPerMonth: null,
  teamMembersPerAccount: 5,
  aiCreditsPerMonth: 1500,
  smPremiumReports: true,
  competitorAnalysis: true,
  whiteLabel: true,

  briefingsPerMonth: null,
  briefingMembers: null,
  briefingAiRefine: true,

  contractsPerMonth: null,
  customContractTemplates: true,
  routeCalculationsPerMonth: 200,
  financeExport: true,
  personalAgenda: true,
  calendarSync: true,

  supportChannel: "whatsapp",
};

export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimits> = {
  free: FREE_LIMITS,
  standard: PRO_LIMITS,
  pro: PRO_LIMITS,
  vip: ULTRA_LIMITS,
};

/** Rótulos em PT-BR (mensagens de limite, medidores, modal de upgrade). */
export const FEATURE_LABELS: Record<keyof PlanLimits, string> = {
  jobApplicationsPerMonth: "candidaturas por mês",
  profileViewsPerMonth: "visualizações de perfil por mês",
  jobOffersPerMonth: "vagas publicadas por mês",
  counterProposalsPerJob: "contrapropostas por vaga",
  equipmentListings: "equipamentos anunciados",
  portfolioMediaFiles: "arquivos no portfólio",
  portfolioVideos: "vídeos no portfólio",
  verifiedBadge: "selo Perfil Verificado",
  directContact: "contato direto (WhatsApp e Instagram) no perfil",
  searchRank: "destaque nas buscas",
  socialMediaAccounts: "contas de social media",
  aiCalendarsPerMonth: "calendários com IA por mês",
  teamMembersPerAccount: "membros de equipe por conta",
  aiCreditsPerMonth: "créditos de IA por mês",
  smPremiumReports: "Simulador de Feed e Relatório com IA",
  competitorAnalysis: "análise de concorrentes com IA",
  whiteLabel: "relatórios sem marca IsoScanning",
  briefingsPerMonth: "briefings por mês",
  briefingMembers: "membros por briefing",
  briefingAiRefine: "refinar seção do briefing com IA",
  contractsPerMonth: "contratos enviados por mês",
  customContractTemplates: "contratos personalizados e modelos próprios",
  routeCalculationsPerMonth: "cálculos de rota por mês",
  financeExport: "exportação do financeiro",
  personalAgenda: "agenda privada de compromissos",
  calendarSync: "sincronização com Google Agenda, iCloud e Outlook",
  supportChannel: "canal de suporte",
};

export function isSubscriptionTier(value: unknown): value is SubscriptionTier {
  return typeof value === "string" && (ALL_TIERS as readonly string[]).includes(value);
}

export function isPaidTier(tier: SubscriptionTier): boolean {
  return PAID_TIERS.includes(tier);
}

/**
 * Tier EFETIVO: rebaixa para "free" quando a assinatura/trial venceu.
 * Tier desconhecido ou ausente = "free" (a promoção de lançamento acabou).
 */
export function resolveEffectiveTier(
  tier: string | null | undefined,
  expiresAt?: string | Date | null,
  now: Date = new Date()
): SubscriptionTier {
  if (!isSubscriptionTier(tier)) return "free";
  if (tier === "free") return "free";
  if (expiresAt) {
    const exp = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < now.getTime()) return "free";
  }
  return tier;
}

export function getPlanLimits(tier?: string | null): PlanLimits {
  return isSubscriptionTier(tier) ? PLAN_LIMITS[tier] : PLAN_LIMITS.free;
}

export function withinLimit(current: number, limit: number | null): boolean {
  return limit === null || current < limit;
}

export function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Menor tier que libera o recurso — usado nas mensagens de upgrade. */
export function minimumTierFor(feature: keyof PlanLimits): SubscriptionTier {
  const order: SubscriptionTier[] = ["free", "pro", "vip"];
  for (const tier of order) {
    const value = PLAN_LIMITS[tier][feature];
    if (typeof value === "boolean" ? value : value === null || (typeof value === "number" && value > 0)) {
      return tier;
    }
  }
  return "vip";
}

/** Corpo do 403 de plano — mesmo formato do backend NestJS e das rotas Next.js. */
export interface PlanErrorBody {
  statusCode: 403;
  code: "PLAN_LIMIT" | "PLAN_FEATURE";
  feature: keyof PlanLimits;
  tier: SubscriptionTier;
  requiredTier: SubscriptionTier;
  current?: number;
  limit?: number | null;
  message: string;
}

export function isPlanErrorBody(value: unknown): value is PlanErrorBody {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (v.code === "PLAN_LIMIT" || v.code === "PLAN_FEATURE") && typeof v.feature === "string";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function buildPlanLimitBody(
  feature: keyof PlanLimits,
  tier: SubscriptionTier,
  current: number,
  limit: number | null
): PlanErrorBody {
  const requiredTier: SubscriptionTier =
    tier === "free" ? (minimumTierFor(feature) === "free" ? "pro" : minimumTierFor(feature)) : "vip";
  return {
    statusCode: 403,
    code: "PLAN_LIMIT",
    feature,
    tier,
    requiredTier,
    current,
    limit,
    message:
      `Você atingiu o limite de ${limit} ${FEATURE_LABELS[feature]} do plano ${PLAN_LABELS[tier]} (${current}/${limit}). ` +
      `Faça upgrade para o ${PLAN_LABELS[requiredTier]} em /precos para continuar.`,
  };
}

export function buildPlanFeatureBody(feature: keyof PlanLimits, tier: SubscriptionTier): PlanErrorBody {
  const requiredTier = minimumTierFor(feature);
  return {
    statusCode: 403,
    code: "PLAN_FEATURE",
    feature,
    tier,
    requiredTier,
    message:
      `${capitalize(FEATURE_LABELS[feature])} não está disponível no plano ${PLAN_LABELS[tier]}. ` +
      `Disponível a partir do plano ${PLAN_LABELS[requiredTier]} — faça upgrade em /precos.`,
  };
}
