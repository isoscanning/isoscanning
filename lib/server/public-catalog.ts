// Leitura PÚBLICA do catálogo (profissionais, equipamentos, vagas) direto do
// Supabase com a anon key — para generateMetadata, JSON-LD e sitemap das
// páginas de detalhe. As três tabelas têm SELECT público via RLS (marketplace
// aberto), então a anon key basta e não dependemos do backend no Render para
// renderizar o <head> (evita cold start e deixa as páginas cacheáveis via ISR).
//
// Só campos públicos. E-mail/telefone nunca passam por aqui.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas.");
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Evita bater no banco com lixo vindo da URL. */
export function isUuid(value: string | undefined | null): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Primeira frase(s) até `max` chars, sem quebras — para meta description. */
export function summarize(text: string | null | undefined, max = 160): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

// ── Profissionais ───────────────────────────────────────────────────────────

export interface PublicProfessional {
  id: string;
  name: string;
  specialty: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  avatarUrl: string | null;
  averageRating: number;
  totalReviews: number;
  updatedAt: string;
}

export async function getPublicProfessional(id: string): Promise<PublicProfessional | null> {
  const { data, error } = await getClient()
    .from("profiles")
    .select("id, display_name, artistic_name, specialty, description, city, state, avatar_url, average_rating, total_reviews, updated_at, created_at")
    .eq("id", id)
    .eq("user_type", "professional")
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    name: String(row.artistic_name || row.display_name || "Profissional"),
    specialty: (row.specialty as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    state: (row.state as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    averageRating: Number(row.average_rating ?? 0),
    totalReviews: Number(row.total_reviews ?? 0),
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  };
}

// ── Equipamentos ────────────────────────────────────────────────────────────

export interface PublicEquipment {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  negotiationType: string | null;
  condition: string | null;
  description: string | null;
  price: number | null;
  rentPeriod: string | null;
  city: string | null;
  state: string | null;
  imageUrls: string[];
  isAvailable: boolean;
  updatedAt: string;
}

export async function getPublicEquipment(id: string): Promise<PublicEquipment | null> {
  const { data, error } = await getClient()
    .from("equipments")
    .select("id, name, brand, model, category, negotiation_type, condition, description, price, rent_period, city, state, image_urls, is_available, updated_at, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    name: String(row.name || "Equipamento"),
    brand: (row.brand as string | null) ?? null,
    model: (row.model as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    negotiationType: (row.negotiation_type as string | null) ?? null,
    condition: (row.condition as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    price: row.price === null || row.price === undefined ? null : Number(row.price),
    rentPeriod: (row.rent_period as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    state: (row.state as string | null) ?? null,
    imageUrls: Array.isArray(row.image_urls) ? (row.image_urls as string[]).filter(Boolean) : [],
    isAvailable: row.is_available !== false,
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  };
}

// ── Vagas ───────────────────────────────────────────────────────────────────

export interface PublicJobOffer {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  jobType: string | null;
  locationType: string | null;
  city: string | null;
  state: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  isActive: boolean;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  venue: string | null;
  positions: number;
  employerName: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getPublicJobOffer(id: string): Promise<PublicJobOffer | null> {
  const { data, error } = await getClient()
    .from("job_offers")
    .select("id, title, description, category, job_type, location_type, city, state, budget_min, budget_max, is_active, status, start_date, end_date, venue, positions, employer_name, deleted_at, created_at, updated_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    title: String(row.title || "Vaga"),
    description: (row.description as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    jobType: (row.job_type as string | null) ?? null,
    locationType: (row.location_type as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    state: (row.state as string | null) ?? null,
    budgetMin: row.budget_min === null || row.budget_min === undefined ? null : Number(row.budget_min),
    budgetMax: row.budget_max === null || row.budget_max === undefined ? null : Number(row.budget_max),
    isActive: row.is_active !== false,
    status: (row.status as string | null) ?? null,
    startDate: (row.start_date as string | null) ?? null,
    endDate: (row.end_date as string | null) ?? null,
    venue: (row.venue as string | null) ?? null,
    positions: Number(row.positions ?? 1) || 1,
    employerName: (row.employer_name as string | null) ?? null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  };
}

// ── Sitemap ─────────────────────────────────────────────────────────────────

export interface CatalogSitemapEntries {
  professionals: { id: string; updatedAt: string }[];
  equipments: { id: string; updatedAt: string }[];
  jobOffers: { id: string; updatedAt: string }[];
}

const SITEMAP_LIMIT = 2000;

function toEntries(rows: unknown[] | null): { id: string; updatedAt: string }[] {
  return ((rows ?? []) as Array<{ id: string; updated_at?: string | null; created_at?: string | null }>).map((r) => ({
    id: r.id,
    updatedAt: r.updated_at ?? r.created_at ?? new Date().toISOString(),
  }));
}

export async function listCatalogSitemapEntries(): Promise<CatalogSitemapEntries> {
  const db = getClient();
  const [profs, equips, jobs] = await Promise.all([
    db.from("profiles").select("id, updated_at, created_at").eq("user_type", "professional").eq("is_published", true).limit(SITEMAP_LIMIT),
    db.from("equipments").select("id, updated_at, created_at").eq("is_available", true).limit(SITEMAP_LIMIT),
    db.from("job_offers").select("id, updated_at, created_at").eq("is_active", true).is("deleted_at", null).limit(SITEMAP_LIMIT),
  ]);
  return {
    professionals: toEntries(profs.data),
    equipments: toEntries(equips.data),
    jobOffers: toEntries(jobs.data),
  };
}
