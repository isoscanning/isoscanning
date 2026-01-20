import apiClient from "./api-service";
import { supabase } from "./supabase";

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
  city: string;
  state: string;
  additionalConditions?: string;
  imageUrls?: string[];
  ownerId: string;
  ownerName: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  portfolioLink?: string;
  isActive?: boolean;
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
  city?: string | null;
  state?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  requirements?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  employerAvatarUrl?: string;
  employerCreatedAt?: string;
}

export interface Specialty {
  id: string;
  name: string;
}

export const DEFAULT_SPECIALTIES: Specialty[] = [
  { id: "1", name: "Fotógrafo" },
  { id: "2", name: "Videomaker" },
  { id: "3", name: "Editor de Vídeo" },
  { id: "4", name: "Editor de Fotos" },
  { id: "5", name: "Produtor Audiovisual" },
  { id: "6", name: "Drone Pilot" },
  { id: "7", name: "Fotógrafo de Eventos" },
  { id: "8", name: "Fotógrafo de Produtos" },
  { id: "9", name: "Fotógrafo de Retratos" },
  { id: "10", name: "Cinegrafista" },
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
  city?: string;
  state?: string;
  budgetMin?: number;
  budgetMax?: number;
  requirements?: string;
  isActive?: boolean;
}

/**
 * Fetch all available equipments (for public marketplace)
 */
export async function fetchEquipments(): Promise<Equipment[]> {
  try {
    console.log("[data-service] Fetching equipments from API...");
    const response = await apiClient.get(
      "/equipments?limit=100&availableOnly=true"
    );
    const equipments = response.data.data || response.data;
    console.log(`[data-service] Found ${equipments.length} equipments`);
    return equipments;
  } catch (error) {
    console.error("[data-service] Error fetching equipments:", error);
    throw new Error("Erro ao buscar equipamentos");
  }
}

/**
 * Fetch all equipments for a specific user
 */
export async function fetchUserEquipments(
  userId: string
): Promise<Equipment[]> {
  try {
    const response = await apiClient.get(
      `/equipments?limit=100&ownerId=${userId}`
    );
    const equipments = response.data.data || response.data;
    return equipments;
  } catch (error) {
    console.error("[data-service] Error fetching user equipments:", error);
    throw new Error("Erro ao buscar equipamentos do usuário");
  }
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
  } catch (error) {
    console.error("[data-service] Error creating equipment:", error);
    throw new Error("Erro ao criar equipamento");
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
    throw new Error("Erro ao atualizar equipamento");
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
    throw new Error("Erro ao excluir equipamento");
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
      const fileExt = file.name.split('.').pop();
      // Sanitize filename
      const safeName = file.name.replace(/[^a-zA-Z0-9]/g, '');
      const fileName = `${userId}/${Date.now()}-${safeName}.${fileExt}`;

      const { error } = await supabase.storage
        .from('equipments')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('equipments')
        .getPublicUrl(fileName);

      return publicUrl;
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error("[data-service] Error uploading equipment images:", error);
    throw new Error("Erro ao fazer upload das imagens");
  }
}

/**
 * Delete equipment images through backend API
 * 
 * TODO: Backend endpoint não implementado ainda
 */
export async function deleteEquipmentImages(
  imageUrls: string[]
): Promise<void> {
  console.warn("[data-service] Delete de imagens não implementado no backend");
  // Não faz nada por enquanto
  return;

  /* Código para quando backend implementar:
  try {
    await apiClient.post("/equipments/delete-images", {
      imageUrls,
    });
  } catch (error) {
    console.error("[data-service] Error deleting equipment images:", error);
    throw new Error("Erro ao excluir imagens");
  }
  */
}

/**
 * Fetch all professionals (filtered by userType = 'professional')
 */
export async function fetchProfessionals(): Promise<Professional[]> {
  try {
    console.log("[data-service] Fetching professionals from API...");
    const response = await apiClient.get(
      "/profiles?userType=professional&limit=100"
    );
    const professionals = response.data.data || response.data;
    console.log(`[data-service] Found ${professionals.length} professionals`);
    return professionals;
  } catch (error) {
    console.error("[data-service] Error fetching professionals:", error);
    throw new Error("Erro ao buscar profissionais");
  }
}

export async function fetchSpecialties(): Promise<Specialty[]> {
  try {
    console.log("[data-service] Fetching specialties...");
    const response = await apiClient.get("/specialties");

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      console.log(`[data-service] Found ${response.data.length} specialties`);
      return response.data;
    }

    console.log("[data-service] No specialties returned from API, using default list");
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
  mediaUrl: string;
  mediaType: "image" | "video";
  professionalId: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  mediaUrl: string;
  mediaType: "image" | "video";
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
  } catch (error) {
    console.error("[data-service] Error creating portfolio item:", error);
    throw new Error("Erro ao adicionar item ao portfólio");
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

    const fileExt = file.name.split('.').pop();
    const safeName = file.name.replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `${userId}/${Date.now()}-${safeName}.${fileExt}`;

    const { error } = await supabase.storage
      .from('portfolio')
      .upload(fileName, file);

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
  createdAt: Date;
}

export async function fetchAvailability(professionalId: string): Promise<AvailabilitySlot[]> {
  try {
    const response = await apiClient.get(`/availability?professionalId=${professionalId}`);
    return response.data || [];
  } catch (error) {
    console.error("[data-service] Error fetching availability:", error);
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
  } catch (error) {
    console.error("[data-service] Error creating job offer:", error);
    throw new Error("Erro ao criar vaga");
  }
}

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
