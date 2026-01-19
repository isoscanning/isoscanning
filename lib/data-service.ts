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

export interface Specialty {
  id: string;
  name: string;
}

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
    const response = await apiClient.get("/specialties");
    return response.data || [];
  } catch (error) {
    console.error("[data-service] Error fetching specialties:", error);
    return [];
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
  date: string; // ISO date string YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  isBooked: boolean;
  professionalId: string;
}

export interface AvailabilitySlot {
  id: string;
  professionalId: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
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

export async function createAvailability(data: CreateAvailabilityData): Promise<AvailabilitySlot> {
  try {
    const response = await apiClient.post("/availability", data);
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
