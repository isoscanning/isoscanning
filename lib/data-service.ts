import apiClient, { isNavigatingToLogin } from "./api-service";
import { tokenManager } from "./token-manager";
import { notifyPlanLimit } from "./plans/plan-events";
import { supabase } from "./supabase";
import imageCompression from "browser-image-compression";

export interface Equipment {
  id: string;
  name: string;
  category: string;
  negotiationType: "sale" | "rent" | "free";
  condition: "new" | "refurbished" | "used";
  description?: string;
  brand?: string;
  model?: string;
  price?: number;
  rentPeriod?: "day" | "week" | "month";
  country?: string;
  city: string;
  state: string;
  additionalConditions?: string;
  imageUrls?: string[];
  ownerId: string;
  ownerName: string;
  /** Dono está em plano pago (selo Perfil Verificado). */
  ownerVerified?: boolean;
  /** Só vêm preenchidos quando o dono está em plano pago (contato direto). */
  ownerContactPhone?: string | null;
  ownerWhatsappUrl?: string | null;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Erro com a mensagem do backend, preservando `response` para as páginas
 * detectarem 403 de plano (`response.data.code === "PLAN_LIMIT" | "PLAN_FEATURE"`)
 * e não duplicarem o modal de upgrade aberto pelo interceptor do apiClient.
 */
function backendError(error: any, fallback: string): Error {
  const message = error?.response?.data?.message;
  const err = new Error(
    typeof message === "string" ? message : Array.isArray(message) ? message.join(", ") : fallback
  );
  (err as any).response = error?.response;
  (err as any).code = error?.response?.data?.code;
  return err;
}

export interface Professional {
  id: string;
  displayName: string;
  userType?: "client" | "professional";
  email?: string;
  artisticName?: string;
  specialty?: string;
  specialties?: string[];
  city?: string;
  state?: string;
  avatarUrl?: string;
  description?: string;
  averageRating?: number;
  totalReviews?: number;
  phone?: string;
  phoneCountryCode?: string;
  portfolioLink?: string;
  /** Só vem preenchido quando o dono do perfil está em plano pago. */
  instagram?: string | null;
  otherLinks?: string;
  isActive?: boolean;
  /** Tier efetivo (já rebaixado para free se a assinatura venceu). */
  subscriptionTier?: 'free' | 'standard' | 'pro' | 'vip';
  /** Indicações convertidas — selo Embaixador a partir de 3. */
  referralCount?: number;
  /** Selo Perfil Verificado (plano pago). */
  verified?: boolean;
  /** Posição nas buscas: 1 = Free, 2 = Pro, 3 = Ultra (Destaque). */
  searchRank?: 1 | 2 | 3;
  /** Contato direto — null a menos que o dono esteja em plano pago. */
  contactPhone?: string | null;
  contactWhatsappUrl?: string | null;
}

export interface JobOffer {
  id: string;
  employerId: string;
  employerName: string;
  title: string;
  description: string;
  category: string;
  jobType: "freelance" | "full_time" | "part_time" | "project";
  locationType: "on_site" | "remote" | "hybrid";
  country?: string | null;
  city?: string | null;
  state?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  requirements?: string | null;
  isActive: boolean;
  status: 'open' | 'paused' | 'closed';
  createdAt: string;
  updatedAt: string;
  employerAvatarUrl?: string;
  employerCreatedAt?: string;
  startDate?: string;
  endDate?: string;
  specialtyId?: string | null;
  requiresInvoice?: boolean;
}

export interface Specialty {
  id: string;
  name: string;
}

export const DEFAULT_SPECIALTIES: Specialty[] = [
  { id: "1", name: "Cinegrafista" },
  { id: "2", name: "Designer Gráfico" },
  { id: "3", name: "Editor de Fotos" },
  { id: "4", name: "Editor de Vídeos" },
  { id: "5", name: "Fotógrafo" },
  { id: "6", name: "Fotógrafo de Eventos" },
  { id: "7", name: "Fotógrafo de Produtos" },
  { id: "8", name: "Fotógrafo de Retratos" },
  { id: "9", name: "Ilustrador" },
  { id: "10", name: "Motion Designer" },
  { id: "11", name: "Piloto de Drone" },
  { id: "12", name: "Piloto de Drone FPV" },
  { id: "13", name: "Produtor Audiovisual" },
  { id: "14", name: "Programador" },
  { id: "15", name: "Social Media" },
  { id: "16", name: "Storymaker" },
  { id: "17", name: "Videomaker" },
  { id: "18", name: "Web Designer" },
];

export interface CreateEquipmentData {
  name: string;
  category: string;
  negotiationType: "sale" | "rent" | "free";
  condition: "new" | "refurbished" | "used";
  description?: string;
  brand?: string;
  model?: string;
  price?: number;
  rentPeriod?: "day" | "week" | "month";
  country?: string;
  city: string;
  state: string;
  additionalConditions?: string;
  imageUrls?: string[];
  ownerId?: string;
  ownerName?: string;
  isAvailable: boolean;
}

export interface CreateJobOfferData {
  title: string;
  description: string;
  category: string;
  jobType: "freelance" | "full_time" | "part_time" | "project";
  locationType: "on_site" | "remote" | "hybrid";
  country?: string;
  city?: string;
  state?: string;
  budgetMin?: number;
  budgetMax?: number;
  requirements?: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  specialtyId?: string;
  requiresInvoice?: boolean;
  status?: 'open' | 'paused' | 'closed';
}

export interface AppNotification {
  id: string;
  profileId: string;
  title: string;
  message: string;
  type:
    | "job_match"
    | "equipment_match"
    | "system"
    | "review_received"
    | "post_review_needed"
    | "post_approved"
    | "post_rejected"
    | "post_comment"
    | "post_published"
    | "team_invite"
    | "billing_confirmed"
    | "billing_overdue"
    | "billing_cancelled"
    | "application_received"
    | "application_status"
    | "proposal_received"
    | "proposal_status"
    | "booking_created"
    | "booking_status"
    | "briefing_invite"
    | "briefing_comment"
    | "briefing_item_assigned"
    | "briefing_approval_requested"
    | "briefing_approved"
    | "briefing_new_version"
    | "briefing_day_before"
    | "briefing_confirm_reminder"
    | "briefing_deliverable_due"
    | "briefing_execution_started"
    | "briefing_incident"
    | "negotiation_candidate"
    | "negotiation_employer"
    | "contract_received"
    | "contract_signed"
    | "contract_rejected"
    | "contract_cancelled"
    | "contract_completed"
    | "contract_expired"
    | "contract_reminder"
    | "contract_terminated"
    | "review_request";
  referenceId?: string | null;
  isRead: boolean;
  createdAt: string;
}

/**
 * Filtros aceitos por GET /equipments (SearchEquipmentDto do backend).
 * Atenção: `condition` NÃO é filtrável na API — refine no cliente.
 */
export interface EquipmentFilters {
  query?: string;
  ownerId?: string;
  category?: string;
  negotiationType?: "sale" | "rent" | "free";
  state?: string;
  city?: string;
  /** Default do backend é `true` (só anúncios ativos). */
  availableOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface EquipmentSearchResult {
  data: Equipment[];
  total: number;
  limit: number;
  offset: number;
}

/** Máximo aceito pelo DTO do backend (`@Max(100)`). */
export const EQUIPMENTS_MAX_LIMIT = 100;

function buildEquipmentQuery(filters: EquipmentFilters): string {
  const params = new URLSearchParams();
  const limit = Math.min(filters.limit ?? 24, EQUIPMENTS_MAX_LIMIT);

  if (filters.query?.trim()) params.set("query", filters.query.trim());
  if (filters.ownerId) params.set("ownerId", filters.ownerId);
  if (filters.category) params.set("category", filters.category);
  if (filters.negotiationType) params.set("negotiationType", filters.negotiationType);
  if (filters.state) params.set("state", filters.state);
  if (filters.city?.trim()) params.set("city", filters.city.trim());
  if (filters.availableOnly !== undefined) params.set("availableOnly", String(filters.availableOnly));
  params.set("limit", String(limit));
  params.set("offset", String(filters.offset ?? 0));

  return params.toString();
}

/**
 * Busca paginada de equipamentos. Os filtros vão para a API (o marketplace
 * não pode filtrar só o array local — passando do `limit` o resto sumiria).
 */
export async function fetchEquipments(
  filters: EquipmentFilters = {}
): Promise<EquipmentSearchResult> {
  const limit = Math.min(filters.limit ?? 24, EQUIPMENTS_MAX_LIMIT);
  const offset = filters.offset ?? 0;

  try {
    const response = await apiClient.get(`/equipments?${buildEquipmentQuery(filters)}`);
    const body = response.data;

    // Tolerante a backends antigos que devolviam só o array
    if (Array.isArray(body)) {
      return { data: body, total: body.length, limit, offset };
    }

    const data: Equipment[] = Array.isArray(body?.data) ? body.data : [];
    return {
      data,
      total: typeof body?.total === "number" ? body.total : data.length,
      limit: typeof body?.limit === "number" ? body.limit : limit,
      offset: typeof body?.offset === "number" ? body.offset : offset,
    };
  } catch (error) {
    console.error("[data-service] Error fetching equipments:", error);
    throw backendError(error, "Erro ao buscar equipamentos");
  }
}

/**
 * Equipamentos do usuário — inclusive os pausados (`availableOnly: false`),
 * senão o dono não enxerga no painel o anúncio que ele mesmo despublicou.
 */
export async function fetchUserEquipments(
  userId: string
): Promise<Equipment[]> {
  try {
    const result = await fetchEquipments({
      ownerId: userId,
      availableOnly: false,
      limit: EQUIPMENTS_MAX_LIMIT,
    });
    return result.data;
  } catch (error) {
    console.error("[data-service] Error fetching user equipments:", error);
    throw backendError(error, "Erro ao buscar equipamentos do usuário");
  }
}

/**
 * Detalhe de um equipamento (GET /equipments/:id). Usado pela edição: filtrar
 * a listagem escondia anúncios pausados e virava "sem permissão".
 */
export async function fetchEquipmentById(equipmentId: string): Promise<Equipment> {
  let data: Equipment | null = null;
  try {
    const response = await apiClient.get(`/equipments/${equipmentId}`);
    data = response.data ?? null;
  } catch (error) {
    console.error("[data-service] Error fetching equipment:", error);
    throw backendError(error, "Erro ao buscar equipamento");
  }
  if (!data) throw new Error("Equipamento não encontrado");
  return data;
}

/**
 * Create a new equipment
 */
export async function createEquipment(
  data: CreateEquipmentData
): Promise<string> {
  try {
    const response = await apiClient.post("/equipments", data, {
      headers: {
        "X-Skip-Auth-Redirect": "true",
      },
    });
    return response.data.id;
  } catch (error: any) {
    console.error("[data-service] Error creating equipment:", error);
    // Preserva mensagens do backend (ex.: limite do plano atingido)
    throw backendError(error, "Erro ao criar equipamento");
  }
}

/**
 * Update an existing equipment
 */
export async function updateEquipment(
  equipmentId: string,
  data: Partial<CreateEquipmentData>
): Promise<void> {
  try {
    if (typeof window !== "undefined" && !localStorage.getItem("auth_token")) {
      throw new Error("Sessão expirada. Por favor, faça login novamente.");
    }

    await apiClient.put(`/equipments/${equipmentId}`, data, {
      headers: {
        "X-Skip-Auth-Redirect": "true",
      },
    });
  } catch (error) {
    if ((error as any).message === "Sessão expirada. Por favor, faça login novamente.") {
      throw error;
    }
    console.error("[data-service] Error updating equipment:", error);
    // Preserva mensagem e `code` do backend (403 de permissão/plano)
    throw backendError(error, "Erro ao atualizar equipamento");
  }
}

/**
 * Delete an equipment
 */
export async function deleteEquipment(equipmentId: string): Promise<void> {
  try {
    await apiClient.delete(`/equipments/${equipmentId}`);
  } catch (error) {
    console.error("[data-service] Error deleting equipment:", error);
    throw backendError(error, "Erro ao excluir equipamento");
  }
}

/**
 * Upload equipment images through backend API
 * Backend handles Supabase Storage internally
 * 
 * TODO: Backend endpoint não implementado ainda
 * Por enquanto, retorna URLs vazias
 */
export async function uploadEquipmentImages(
  files: File[],
  userId: string
): Promise<string[]> {
  try {
    // Ensure Supabase client has the session from localStorage
    const token = localStorage.getItem("auth_token");
    const refreshToken = localStorage.getItem("refresh_token");

    if (token) {
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: refreshToken || "",
      });
    }

    const uploadPromises = files.map(async (file) => {
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        try {
          fileToUpload = await imageCompression(file, {
            maxSizeMB: 1.5,
            maxWidthOrHeight: 2048,
            useWebWorker: true,
            initialQuality: 0.85,
          });
        } catch (err) {
          console.warn('Image compression failed for equipment, using original', err);
        }
      }

      const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
      // Sanitize filename
      const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9]/g, '');
      const fileName = `${userId}/${Date.now()}-${safeName}.${fileExt}`;

      const { error } = await supabase.storage
        .from('equipments')
        .upload(fileName, fileToUpload);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('equipments')
        .getPublicUrl(fileName);

      return publicUrl;
    });

    const results = await Promise.allSettled(uploadPromises);
    const urls: string[] = [];
    const failedNames: string[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        urls.push(result.value);
      } else {
        failedNames.push(files[index].name);
      }
    });

    if (urls.length === 0) {
      throw new Error("Nenhuma imagem foi enviada com sucesso");
    }

    if (failedNames.length > 0) {
      console.warn(`[data-service] ${failedNames.length} imagem(ns) falharam: ${failedNames.join(", ")}`);
    }

    return urls;
  } catch (error) {
    console.error("[data-service] Error uploading equipment images:", error);
    throw error instanceof Error ? error : new Error("Erro ao fazer upload das imagens");
  }
}

/**
 * Remove imagens de um anúncio: o backend tira as URLs do registro E apaga os
 * objetos do bucket `equipments` (só o dono pode).
 */
export async function deleteEquipmentImages(
  equipmentId: string,
  imageUrls: string[]
): Promise<void> {
  if (!equipmentId || imageUrls.length === 0) return;
  try {
    await apiClient.post(`/equipments/${equipmentId}/images/delete`, { imageUrls });
  } catch (error) {
    console.error("[data-service] Error deleting equipment images:", error);
    throw backendError(error, "Erro ao excluir imagens do equipamento");
  }
}

/**
 * Fetch all professionals (filtered by userType = 'professional')
 */
export async function fetchProfessionals(): Promise<Professional[]> {
  try {
    const response = await apiClient.get(
      "/profiles?userType=professional&limit=100"
    );
    const professionals = response.data.data || response.data;
    return professionals;
  } catch (error) {
    console.error("[data-service] Error fetching professionals:", error);
    throw new Error("Erro ao buscar profissionais");
  }
}

export async function fetchSpecialties(): Promise<Specialty[]> {
  try {
    const response = await apiClient.get("/specialties");

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    }

    return DEFAULT_SPECIALTIES;
  } catch (error) {
    console.error("[data-service] Error fetching specialties:", error);
    return DEFAULT_SPECIALTIES;
  }
}

// --- PORTFOLIO ---

export interface CreatePortfolioItemData {
  title: string;
  description?: string;
  media: { url: string; type: "image" | "video" }[];
  professionalId: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  media: { url: string; type: "image" | "video" }[];
  professionalId: string;
  createdAt: Date;
}

export async function fetchPortfolio(professionalId: string): Promise<PortfolioItem[]> {
  try {
    const response = await apiClient.get(`/portfolio?professionalId=${professionalId}`);
    return response.data.data || [];
  } catch (error) {
    console.error("[data-service] Error fetching portfolio:", error);
    return []; // Return empty array instead of throwing to avoid breaking UI
  }
}

export async function createPortfolioItem(data: CreatePortfolioItemData): Promise<PortfolioItem> {
  try {
    const response = await apiClient.post("/portfolio", data);
    return response.data;
  } catch (error: any) {
    console.error("[data-service] Error creating portfolio item:", error);
    // Preserva a mensagem (e o `code`) do backend — ex.: limite do plano
    throw backendError(error, "Erro ao adicionar item ao portfólio");
  }
}

export async function updatePortfolioItem(
  id: string,
  itemData: Partial<CreatePortfolioItemData>
): Promise<PortfolioItem> {
  try {
    const response = await apiClient.put(`/portfolio/${id}`, itemData);
    return response.data;
  } catch (error: any) {
    console.error("[data-service] Error updating portfolio item:", error);
    throw backendError(error, "Erro ao atualizar item do portfólio");
  }
}

export async function deletePortfolioItem(id: string): Promise<void> {
  try {
    await apiClient.delete(`/portfolio/${id}`);
  } catch (error) {
    console.error("[data-service] Error deleting portfolio item:", error);
    throw new Error("Erro ao excluir item do portfólio");
  }
}

export async function uploadPortfolioItemImage(
  file: File,
  userId: string
): Promise<string> {
  try {
    // Ensure Supabase client has the session from localStorage
    const token = localStorage.getItem("auth_token");
    const refreshToken = localStorage.getItem("refresh_token");

    if (token) {
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: refreshToken || "",
      });
    }

    let fileToUpload = file;
    if (file.type.startsWith('image/')) {
      try {
        fileToUpload = await imageCompression(file, {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 2048,
          useWebWorker: true,
          initialQuality: 0.85,
        });
      } catch (err) {
        console.warn('Image compression failed for portfolio item, using original', err);
      }
    }

    const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
    const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `${userId}/${Date.now()}-${safeName}.${fileExt}`;

    const { error } = await supabase.storage
      .from('portfolio')
      .upload(fileName, fileToUpload);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('portfolio')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error("[data-service] Error uploading portfolio image:", error);
    throw new Error("Erro ao fazer upload da imagem do portfólio");
  }
}

// --- AVAILABILITY ---

export interface CreateAvailabilityData {
  date?: string; // ISO date string YYYY-MM-DD (legacy single date)
  dates?: string[]; // Multiple dates (new feature)
  startTime?: string; // HH:mm (optional when isAllDay)
  endTime?: string;   // HH:mm (optional when isAllDay)
  isAllDay?: boolean; // When true, ignores time and sets full day
  type?: "available" | "blocked";
  professionalId: string;
}

export interface AvailabilitySlot {
  id: string;
  professionalId: string;
  date: string;
  startTime: string;
  endTime: string;
  type?: string;
  reason?: string;
  /** Reserva definitiva criada por um contrato assinado (não pode ser apagada à mão). */
  contractId?: string | null;
  /** Reserva provisória criada ao aceitar o acordo de uma vaga. */
  jobApplicationId?: string | null;
  createdAt: Date;
}

/** Reserva gerada pelo fluxo de fechar trabalho — só é liberada pelo próprio fluxo. */
export function isFlowReservation(slot: Pick<AvailabilitySlot, "contractId" | "jobApplicationId">): boolean {
  return !!slot.contractId || !!slot.jobApplicationId;
}

/**
 * Slots de disponibilidade de um profissional.
 *
 * Passe `range.from` para não trazer a agenda inteira: hoje a maior parte das
 * linhas é de datas passadas, que nenhuma tela exibe. O filtro é aplicado no
 * banco (índice de professional_id + date), não no cliente.
 */
export async function fetchAvailability(
  professionalId: string,
  range?: { from?: string; to?: string }
): Promise<AvailabilitySlot[]> {
  try {
    const params = new URLSearchParams({ professionalId });
    if (range?.from) params.set("from", range.from);
    if (range?.to) params.set("to", range.to);
    const response = await apiClient.get(`/availability?${params.toString()}`);
    let data = response.data;
    if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        data = data.data;
    }
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (!isNavigatingToLogin) console.warn("[data-service] Error fetching availability:", error);
    return [];
  }
}

export async function createAvailability(data: CreateAvailabilityData): Promise<AvailabilitySlot | AvailabilitySlot[]> {
  try {
    const payload = {
      ...data,
      type: data.type || "available",
    };
    const response = await apiClient.post("/availability", payload);
    return response.data;
  } catch (error) {
    console.error("[data-service] Error creating availability:", error);
    throw new Error("Erro ao adicionar disponibilidade");
  }
}

export async function deleteAvailability(id: string): Promise<void> {
  try {
    await apiClient.delete(`/availability/${id}`);
  } catch (error) {
    console.error("[data-service] Error deleting availability:", error);
    throw new Error("Erro ao excluir disponibilidade");
  }
}

export async function deleteAvailabilities(ids: string[]): Promise<void> {
  try {
    await apiClient.post("/availability/bulk-delete", { ids });
  } catch (error) {
    console.error("[data-service] Error deleting multiple availabilities:", error);
    throw new Error("Erro ao excluir disponibilidades");
  }
}


// --- JOB OFFERS ---

/**
 * Fetch all active job offers
 */
export async function fetchJobOffers(): Promise<JobOffer[]> {
  try {
    const response = await apiClient.get("/job-offers?isActive=true&limit=100");
    return response.data.data || response.data;
  } catch (error) {
    console.error("[data-service] Error fetching job offers:", error);
    throw new Error("Erro ao buscar vagas");
  }
}

/**
 * Fetch a single job offer by ID
 */
export async function fetchJobOfferById(id: string): Promise<JobOffer> {
  try {
    const response = await apiClient.get(`/job-offers/${id}`);
    return response.data;
  } catch (error) {
    console.error(`[data-service] Error fetching job offer ${id}:`, error);
    throw new Error("Erro ao buscar detalhes da vaga");
  }
}

/**
 * Fetch all job offers for a specific user
 */
export async function fetchUserJobOffers(userId: string): Promise<JobOffer[]> {
  try {
    const response = await apiClient.get(`/job-offers?employerId=${userId}&limit=100`);
    return response.data.data || response.data;
  } catch (error) {
    console.error("[data-service] Error fetching user job offers:", error);
    throw new Error("Erro ao buscar suas vagas");
  }
}

/**
 * Create a new job offer
 */
export async function createJobOffer(data: CreateJobOfferData): Promise<string> {
  try {
    const response = await apiClient.post("/job-offers", data);
    return response.data.id;
  } catch (error: any) {
    console.error("[data-service] Error creating job offer:", error);
    // Preserva mensagens do backend (ex.: limite do plano atingido)
    throw backendError(error, "Erro ao criar vaga");
  }
}

/**
 * Muda o status de uma vaga pelo backend (valida dono e limites do plano;
 * um 403 de plano abre o modal de upgrade via interceptor do apiClient).
 */
export const updateJobStatus = async (jobId: string, status: 'open' | 'paused' | 'closed'): Promise<boolean> => {
  try {
    // isActive acompanha o status (compatibilidade com o filtro público)
    await apiClient.patch(`/job-offers/${jobId}/status`, {
      status,
      isActive: status === 'open',
    });
    return true;
  } catch (error) {
    console.error("Error updating job status:", error);
    throw error;
  }
};

export const bulkUpdateJobStatus = async (jobIds: string[], status: 'open' | 'paused' | 'closed'): Promise<boolean> => {
  try {
    await apiClient.post('/job-offers/bulk-status', {
      ids: jobIds,
      status,
      isActive: status === 'open',
    });
    return true;
  } catch (error) {
    console.error("Error bulk updating job status:", error);
    throw error;
  }
};

/**
 * Update an existing job offer
 */
export async function updateJobOffer(
  id: string,
  data: Partial<CreateJobOfferData>
): Promise<void> {
  try {
    await apiClient.put(`/job-offers/${id}`, data);
  } catch (error) {
    console.error("[data-service] Error updating job offer:", error);
    throw new Error("Erro ao atualizar vaga");
  }
}

/**
 * Delete a job offer
 */
export async function deleteJobOffer(id: string): Promise<void> {
  try {
    await apiClient.delete(`/job-offers/${id}`);
  } catch (error) {
    console.error("[data-service] Error deleting job offer:", error);
    throw new Error("Erro ao excluir vaga");
  }
}

const JOB_APPLICATION_SELECT = `
  id,
  job_offer_id,
  candidate_id,
  status,
  created_at,
  message,
  counter_proposal,
  employer_counter_proposal,
  counter_proposal_count,
  agreement_status,
  agreement_text,
  agreement_value,
  agreement_deadline,
  agreement_location,
  agreement_start_date,
  agreement_end_date,
  contract_id,
  job_offers (
    id,
    title,
    employer_id,
    employer_name,
    city,
    state,
    job_type,
    location_type,
    budget_min,
    budget_max,
    start_date,
    end_date
  )
`;

function mapJobApplicationRow(app: any): JobApplication {
  return {
    id: app.id,
    jobOfferId: app.job_offer_id,
    candidateId: app.candidate_id,
    status: app.status,
    createdAt: app.created_at,
    message: app.message ?? undefined,
    counterProposal: app.counter_proposal ?? undefined,
    employerCounterProposal: app.employer_counter_proposal ?? undefined,
    counterProposalCount: app.counter_proposal_count ?? 0,
    agreementStatus: app.agreement_status ?? 'none',
    agreementText: app.agreement_text ?? undefined,
    agreementValue: app.agreement_value ?? undefined,
    agreementDeadline: app.agreement_deadline ?? undefined,
    agreementLocation: app.agreement_location ?? undefined,
    agreementStartDate: app.agreement_start_date ?? undefined,
    agreementEndDate: app.agreement_end_date ?? undefined,
    contractId: app.contract_id ?? null,
    jobOffer: {
      id: app.job_offers.id,
      title: app.job_offers.title,
      employerId: app.job_offers.employer_id,
      employerName: app.job_offers.employer_name,
      city: app.job_offers.city,
      state: app.job_offers.state,
      jobType: app.job_offers.job_type,
      locationType: app.job_offers.location_type,
      budgetMin: app.job_offers.budget_min,
      budgetMax: app.job_offers.budget_max,
      startDate: app.job_offers.start_date ?? undefined,
      endDate: app.job_offers.end_date ?? undefined,
    },
  };
}

export const fetchJobApplication = async (jobId: string, candidateId: string): Promise<JobApplication | null> => {
  try {
    const { data, error } = await supabase
      .from('job_applications')
      .select(JOB_APPLICATION_SELECT)
      .eq('job_offer_id', jobId)
      .eq('candidate_id', candidateId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error("Error fetching application details:", error);
      return null;
    }

    return mapJobApplicationRow(data);
  } catch (error) {
    console.error("Error fetching application details:", error);
    return null;
  }
};

export const applyToJob = async (jobId: string, candidateId: string, message?: string, counterProposal?: number): Promise<boolean> => {
  try {
    // Passa pelo backend para aplicar limites de plano, validações e
    // notificar o dono da vaga. Candidaturas retiradas são reativadas.
    await apiClient.post('/job-applications', {
      jobOfferId: jobId,
      candidateId,
      message: message || undefined,
      counterProposal: counterProposal || undefined,
    });

    return true;
  } catch (error) {
    console.error("Error applying to job:", error);
    throw error;
  }
};

/**
 * Estado da negociação de uma candidatura:
 * - none: só a proposta inicial (com ou sem contraproposta do candidato)
 * - pending_candidate: contratante enviou acordo, aguardando o candidato
 * - countered: candidato contrapropôs; bola com o contratante
 * - accepted / rejected: resposta final do candidato ao acordo
 */
export type JobAgreementStatus = 'none' | 'pending_candidate' | 'countered' | 'accepted' | 'rejected';

export interface JobApplication {
  id: string;
  jobOfferId: string;
  candidateId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  message?: string;
  /** Última contraproposta do candidato */
  counterProposal?: number;
  /** Última contraproposta do contratante */
  employerCounterProposal?: number;
  /** Quantas contrapropostas o candidato já usou nesta vaga (cota por plano) */
  counterProposalCount?: number;
  agreementStatus?: JobAgreementStatus;
  agreementText?: string;
  agreementValue?: number;
  agreementDeadline?: string;
  agreementLocation?: string;
  agreementStartDate?: string;
  agreementEndDate?: string;
  contractId?: string | null;
  createdAt: string;
  jobOffer: {
    id: string;
    title: string;
    employerId: string;
    employerName: string;
    city?: string;
    state?: string;
    jobType: string;
    locationType: string;
    budgetMin?: number;
    budgetMax?: number;
    startDate?: string;
    endDate?: string;
  };
}

export const fetchUserApplications = async (userId: string): Promise<JobApplication[]> => {
  try {
    const { data, error } = await supabase
      .from('job_applications')
      .select(JOB_APPLICATION_SELECT)
      .eq('candidate_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
      throw error;
    }

    return (data as any[]).map(mapJobApplicationRow);
  } catch (error) {
    console.error("Error fetching applications:", error);
    return [];
  }
};

// ── Negociação (contrapropostas em rodadas) ──────────────────────────────────

export type NegotiationRoundKind = 'proposal' | 'counter' | 'agreement' | 'accept' | 'reject';

export interface NegotiationRound {
  id: string;
  authorId: string;
  authorRole: 'candidate' | 'employer';
  kind: NegotiationRoundKind;
  value: number | null;
  message: string | null;
  createdAt: string;
}

/** Estado da candidatura como o backend devolve nos endpoints de negociação. */
export interface JobAgreementState {
  id: string;
  jobOfferId: string;
  candidateId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  counterProposal: number | null;
  employerCounterProposal: number | null;
  counterProposalCount: number;
  agreementStatus: JobAgreementStatus | null;
  agreementText: string | null;
  agreementValue: number | null;
  agreementDeadline: string | null;
  agreementLocation: string | null;
  agreementStartDate: string | null;
  agreementEndDate: string | null;
  contractId: string | null;
  updatedAt: string;
}

export interface JobNegotiation {
  role: 'candidate' | 'employer';
  application: JobAgreementState;
  jobOffer: {
    id: string;
    title: string;
    employerId: string;
    startDate: string | null;
    endDate: string | null;
    budgetMin: number | null;
    budgetMax: number | null;
  };
  rounds: NegotiationRound[];
  /** Só para o candidato. limit null = ilimitado (Ultra); 0 = plano sem contraproposta. */
  counterProposalQuota: { limit: number | null; used: number } | null;
}

export const fetchJobNegotiation = async (applicationId: string): Promise<JobNegotiation | null> => {
  try {
    const response = await apiClient.get(`/job-applications/${applicationId}/negotiation`);
    const raw = response.data?.data ?? response.data;
    if (!raw || !raw.application) return null;
    return {
      role: raw.role,
      application: raw.application,
      jobOffer: raw.jobOffer,
      rounds: Array.isArray(raw.rounds) ? raw.rounds : [],
      counterProposalQuota: raw.counterProposalQuota ?? null,
    };
  } catch (error) {
    if (!isNavigatingToLogin) console.warn("[data-service] Error fetching negotiation:", error);
    return null;
  }
};

/**
 * Contraproposta de valor (candidato ou contratante) numa candidatura já
 * existente. NÃO usar `applyToJob` para isso: o backend responde 409 para
 * candidatura duplicada. O backend aplica a cota `counterProposalsPerJob`
 * para o candidato e registra a rodada no histórico.
 */
export const counterJobProposal = async (
  applicationId: string,
  data: { value: number; message?: string }
): Promise<JobAgreementState> => {
  try {
    const response = await apiClient.post(`/job-applications/${applicationId}/counter`, {
      value: data.value,
      message: data.message || undefined,
    });
    return response.data?.data ?? response.data;
  } catch (error) {
    console.error("Error sending counter proposal:", error);
    throw error;
  }
};

export interface JobCandidate {
  id: string; // Application ID
  candidateId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  createdAt: string;
  message?: string;
  counterProposal?: number;
  employerCounterProposal?: number;
  counterProposalCount?: number;
  agreementStatus?: JobAgreementStatus;
  agreementText?: string;
  agreementValue?: number;
  agreementDeadline?: string;
  agreementLocation?: string;
  agreementStartDate?: string;
  agreementEndDate?: string;
  contractId?: string | null;
  profile: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    specialty?: string;
    city?: string;
    state?: string;
    averageRating?: number;
    totalReviews?: number;
    email?: string;
    phone?: string;
  };
}

export const fetchJobCandidates = async (jobId: string): Promise<JobCandidate[]> => {
  try {
    const { data, error } = await supabase
      .from('job_applications')
      .select(`
        id,
        candidate_id,
        status,
        created_at,
        message,
        counter_proposal,
        employer_counter_proposal,
        counter_proposal_count,
        agreement_status,
        agreement_text,
        agreement_value,
        agreement_deadline,
        agreement_location,
        agreement_start_date,
        agreement_end_date,
        contract_id,
        profiles (
          id,
          display_name,
          avatar_url,
          specialty,
          city,
          state,
          average_rating,
          total_reviews,
          subscription_tier
        )
      `)
      .eq('job_offer_id', jobId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching candidates:", error);
      throw error;
    }

    return data.map((app: any) => ({
      id: app.id,
      candidateId: app.candidate_id,
      status: app.status,
      createdAt: app.created_at,
      message: app.message ?? undefined,
      counterProposal: app.counter_proposal ?? undefined,
      employerCounterProposal: app.employer_counter_proposal ?? undefined,
      counterProposalCount: app.counter_proposal_count ?? 0,
      agreementStatus: app.agreement_status ?? 'none',
      agreementText: app.agreement_text ?? undefined,
      agreementValue: app.agreement_value ?? undefined,
      agreementDeadline: app.agreement_deadline ?? undefined,
      agreementLocation: app.agreement_location ?? undefined,
      agreementStartDate: app.agreement_start_date ?? undefined,
      agreementEndDate: app.agreement_end_date ?? undefined,
      contractId: app.contract_id ?? null,
      profile: {
        id: app.profiles.id,
        displayName: app.profiles.display_name,
        avatarUrl: app.profiles.avatar_url,
        specialty: app.profiles.specialty,
        city: app.profiles.city,
        state: app.profiles.state,
        averageRating: app.profiles.average_rating,
        totalReviews: app.profiles.total_reviews,
        subscriptionTier: app.profiles.subscription_tier,
        // email and phone removed to prevent error
      }
    }));
  } catch (error) {
    console.error("Error fetching candidates:", error);
    return [];
  }
};

export const updateJobApplicationStatus = async (applicationId: string, status: 'accepted' | 'rejected'): Promise<boolean> => {
  try {
    // Passa pelo backend: valida que o ator é o dono da vaga, libera reservas
    // provisórias ao recusar e dispara a notificação de status.
    await apiClient.patch(`/job-applications/${applicationId}`, { status });

    return true;
  } catch (error) {
    console.error("Error updating application status:", error);
    throw error;
  }
};

export interface SendJobAgreementData {
  agreementText: string;
  agreementValue?: number;
  agreementDeadline?: string;
  agreementLocation?: string;
  /** YYYY-MM-DD — datas que reservam a agenda do profissional ao aceitar */
  agreementStartDate?: string;
  agreementEndDate?: string;
}

export const sendJobAgreement = async (
  applicationId: string,
  agreementData: SendJobAgreementData
): Promise<JobAgreementState> => {
  try {
    // Backend valida que o ator é o dono da vaga, marca o acordo como
    // pending_candidate, registra a rodada e notifica o candidato.
    const response = await apiClient.post(`/job-applications/${applicationId}/agreement`, {
      agreementText: agreementData.agreementText,
      agreementValue: agreementData.agreementValue,
      agreementDeadline: agreementData.agreementDeadline || undefined,
      agreementLocation: agreementData.agreementLocation || undefined,
      agreementStartDate: agreementData.agreementStartDate || undefined,
      agreementEndDate: agreementData.agreementEndDate || undefined,
    });
    return response.data?.data ?? response.data;
  } catch (error) {
    console.error("Error sending job agreement:", error);
    throw error;
  }
};

export interface RespondToJobAgreementResult extends JobAgreementState {
  /** Dias reservados provisoriamente na agenda ao aceitar (0 = sem datas). */
  reservedDays?: number;
}

/**
 * Resposta do candidato ao acordo. `accepted` reserva a agenda provisoriamente;
 * `rejected` encerra; `countered` devolve uma contraproposta (usa a cota do plano).
 */
export const respondToJobAgreement = async (
  applicationId: string,
  response: 'accepted' | 'rejected' | 'countered',
  counter?: { value: number; message?: string }
): Promise<RespondToJobAgreementResult> => {
  try {
    const res = await apiClient.post(`/job-applications/${applicationId}/agreement/respond`, {
      accept: response === 'accepted',
      ...(response === 'countered' && counter
        ? { counterValue: counter.value, counterMessage: counter.message || undefined }
        : {}),
    });
    return res.data?.data ?? res.data;
  } catch (error) {
    console.error("Error responding to job agreement:", error);
    throw error;
  }
};

export async function fetchNotifications(): Promise<{ data: AppNotification[], total: number, unreadCount: number }> {
  try {
    const response = await apiClient.get('/notifications?limit=20');
    return response.data;
  } catch (error) {
    if (!isNavigatingToLogin) console.warn("[data-service] Error fetching notifications:", error);
    return { data: [], total: 0, unreadCount: 0 };
  }
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    await apiClient.patch(`/notifications/${id}/read`);
    return true;
  } catch (error) {
    console.error("[data-service] Error marking notification as read:", error);
    return false;
  }
}

// ── Social Media Notification Dispatchers ─────────────────────────────────────

export async function notifySocialMediaPostStatus(data: {
  postId: string;
  scheduleId: string;
  postTitle: string;
  newStatus: string;
  scheduleClientName: string;
}): Promise<void> {
  try {
    await apiClient.post("/social-media/notifications/post-status", data);
  } catch {
    // non-critical — do not block UI
  }
}

export async function notifySocialMediaTeamInvite(data: {
  scheduleId: string;
  invitedUserId: string;
  role: string;
  scheduleClientName: string;
  inviterName: string;
}): Promise<void> {
  try {
    await apiClient.post("/social-media/notifications/team-invite", data);
  } catch {
    // non-critical
  }
}

export async function notifySocialMediaComment(data: {
  postId: string;
  scheduleId: string;
  postTitle: string;
  commentType: string;
  scheduleClientName: string;
}): Promise<void> {
  try {
    await apiClient.post("/social-media/notifications/comment", data);
  } catch {
    // non-critical
  }
}

// --- AGENDA (recorrência, preferências, sincronização com calendários) ---
//
// A agenda EFETIVA (recorrência + datas − bloqueios − calendário externo) é
// calculada no backend (GET /availability/agenda). As telas não devem somar
// slots por conta própria — sempre desenhar a partir de `AgendaDay`.
// Conexões com Google/.ics vivem em rotas /app/api/agenda (Next), porque é lá
// que ficam o OAuth e a chave de criptografia dos tokens.

export type AgendaDayStatus = "free" | "partial" | "busy" | "unset";

export interface AgendaWindow {
  /** "HH:MM" */
  start: string;
  /** "HH:MM" — "24:00" é fim do dia. */
  end: string;
}

export interface AgendaDay {
  date: string;
  weekday: number;
  status: AgendaDayStatus;
  windows: AgendaWindow[];
  blocked: AgendaWindow[];
  origin: "rule" | "date" | "none";
  fromExternal: boolean;
  fromEvents: boolean;
}

export interface WeeklyPatternDay {
  /** 0 = domingo … 6 = sábado */
  weekday: number;
  windows: AgendaWindow[];
}

export interface AgendaView {
  professionalId: string;
  timezone: string;
  from: string;
  to: string;
  days: AgendaDay[];
  hasRules: boolean;
  publishWeeklyRules: boolean;
  /** Dias/horários de atendimento publicados (vazio se a semana padrão não é publicada). */
  weeklyPattern: WeeklyPatternDay[];
  externalConnected: boolean;
}

export interface AgendaRule {
  id?: string;
  /** 0 = domingo … 6 = sábado */
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface AgendaSettings {
  timezone: string;
  leadTimeHours: number;
  horizonDays: number;
  publishWeeklyRules: boolean;
  autoBlockExternal: boolean;
}

export interface CalendarConnection {
  id: string;
  provider: "google" | "ics";
  label: string | null;
  calendarIds: string[];
  syncEnabled: boolean;
  /** Envio IsoScanning → Google ligado. */
  pushEnabled: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  status: "active" | "error" | "revoked";
  createdAt: string;
}

export interface AgendaOverview {
  rules: AgendaRule[];
  settings: AgendaSettings;
  feedUrl: string | null;
  connections: CalendarConnection[];
}

export interface CalendarSyncResult {
  connectionId: string;
  provider: "google" | "ics";
  label: string | null;
  busyRows: number;
  from: string;
  to: string;
  warnings: string[];
  error?: string;
}

export interface CalendarSyncSummary {
  results: CalendarSyncResult[];
  synced: number;
  failed: number;
}

/** Agenda pública de um profissional (janela de publicação aplicada). */
export async function fetchAgenda(
  professionalId: string,
  range?: { from?: string; to?: string }
): Promise<AgendaView | null> {
  try {
    const params = new URLSearchParams({ professionalId });
    if (range?.from) params.set("from", range.from);
    if (range?.to) params.set("to", range.to);
    const response = await apiClient.get(`/availability/agenda?${params.toString()}`);
    return (response.data as AgendaView) ?? null;
  } catch (error) {
    if (!isNavigatingToLogin) console.warn("[data-service] Error fetching agenda:", error);
    return null;
  }
}

/** Agenda do próprio profissional (sem janela de publicação — vê tudo). */
export async function fetchMyAgenda(range?: { from?: string; to?: string }): Promise<AgendaView | null> {
  try {
    const params = new URLSearchParams();
    if (range?.from) params.set("from", range.from);
    if (range?.to) params.set("to", range.to);
    const qs = params.toString();
    const response = await apiClient.get(`/availability/agenda/mine${qs ? `?${qs}` : ""}`);
    return (response.data as AgendaView) ?? null;
  } catch (error) {
    if (!isNavigatingToLogin) console.warn("[data-service] Error fetching my agenda:", error);
    return null;
  }
}

export async function fetchAgendaOverview(): Promise<AgendaOverview> {
  const response = await apiClient.get("/availability/overview");
  return response.data as AgendaOverview;
}

export async function saveAgendaRules(rules: AgendaRule[]): Promise<AgendaRule[]> {
  const response = await apiClient.put("/availability/rules", {
    rules: rules.map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime })),
  });
  return response.data as AgendaRule[];
}

export async function applyAgendaRules(weeks: number): Promise<{ created: number }> {
  const response = await apiClient.post("/availability/rules/apply", { weeks });
  return response.data as { created: number };
}

export async function saveAgendaSettings(patch: Partial<AgendaSettings>): Promise<AgendaSettings> {
  const response = await apiClient.put("/availability/settings", patch);
  return response.data as AgendaSettings;
}

export async function rotateAgendaFeedToken(): Promise<{ feedUrl: string }> {
  const response = await apiClient.post("/availability/feed-token");
  return response.data as { feedUrl: string };
}

// Rotas Next (/app/api/agenda) — fetch direto com o bearer da sessão.

async function agendaApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/agenda/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...tokenManager.authHeader(),
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!res.ok) {
    // 403 de plano (PLAN_FEATURE) → modal de upgrade, igual ao interceptor do axios
    if (res.status === 403) notifyPlanLimit(data);
    throw new Error(data?.error || data?.message || `Erro (${res.status})`);
  }
  return data;
}

export function checkGoogleAgendaConfig(): Promise<{ configured: boolean; missing: string[] }> {
  return agendaApi("google/connect");
}

export function startGoogleAgendaConnect(): Promise<{ url: string }> {
  return agendaApi("google/connect", { method: "POST" });
}

export function addIcsConnection(
  url: string,
  label?: string
): Promise<{ id: string; label: string; eventsFound: number; sync: CalendarSyncResult | null }> {
  return agendaApi("connections", { method: "POST", body: JSON.stringify({ url, label }) });
}

export function updateCalendarConnection(
  id: string,
  patch: { syncEnabled?: boolean; pushEnabled?: boolean; calendarIds?: string[] }
): Promise<{ ok: boolean; sync?: CalendarSyncResult | null }> {
  return agendaApi(`connections/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function removeCalendarConnection(id: string): Promise<{ ok: boolean }> {
  return agendaApi(`connections/${id}`, { method: "DELETE" });
}

export interface CalendarPushResult {
  connectionId: string;
  inserted: number;
  updated: number;
  deleted: number;
  unchanged: number;
  skipped?: boolean;
  error?: string;
}

export function syncCalendars(
  connectionId?: string,
  opts?: { pushOnly?: boolean }
): Promise<CalendarSyncSummary & { pushes?: CalendarPushResult[] }> {
  return agendaApi("sync", {
    method: "POST",
    body: JSON.stringify({
      ...(connectionId ? { connectionId } : {}),
      ...(opts?.pushOnly ? { pushOnly: true } : {}),
    }),
  });
}

// --- COMPROMISSOS PESSOAIS (agenda privada do profissional) ---
// Só o dono lê/escreve. O público recebe apenas o efeito (data fechada) via
// fetchAgenda — nunca título, notas ou local.

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  /** "YYYY-MM-DD" */
  date: string;
  endDate: string;
  /** "HH:MM" ou null quando allDay */
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  /** Falso = lembrete (aparece só para você, não fecha o perfil). */
  blocksAgenda: boolean;
  color: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export type CalendarEventDraft = Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">;

export async function fetchCalendarEvents(range?: { from?: string; to?: string }): Promise<CalendarEvent[]> {
  const params = new URLSearchParams();
  if (range?.from) params.set("from", range.from);
  if (range?.to) params.set("to", range.to);
  const qs = params.toString();
  const response = await apiClient.get(`/availability/events${qs ? `?${qs}` : ""}`);
  return Array.isArray(response.data) ? (response.data as CalendarEvent[]) : [];
}

export async function createCalendarEvent(draft: CalendarEventDraft): Promise<CalendarEvent> {
  const response = await apiClient.post("/availability/events", draft);
  return response.data as CalendarEvent;
}

export async function updateCalendarEvent(id: string, patch: Partial<CalendarEventDraft>): Promise<CalendarEvent> {
  const response = await apiClient.put(`/availability/events/${id}`, patch);
  return response.data as CalendarEvent;
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await apiClient.delete(`/availability/events/${id}`);
}

