import apiClient from "./api-service";

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
    const response = await apiClient.post("/equipments", data);
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
    await apiClient.put(`/equipments/${equipmentId}`, data);
  } catch (error) {
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
  console.warn("[data-service] Upload de imagens não implementado no backend");
  // Retorna URLs vazias por enquanto
  return [];
  
  /* Código para quando backend implementar:
  try {
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("ownerId", userId);

      const response = await apiClient.post("/equipments/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data.url || response.data.uploadUrl;
    });

    const urls = await Promise.all(uploadPromises);
    return urls;
  } catch (error) {
    console.error("[data-service] Error uploading equipment images:", error);
    throw new Error("Erro ao fazer upload das imagens");
  }
  */
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
