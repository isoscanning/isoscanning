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
  phoneCountryCode?: string;
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
  startDate?: string;
  endDate?: string;
  specialtyId?: string;
  requiresInvoice?: boolean;
  status?: 'open' | 'paused' | 'closed';
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
  } catch (error) {
    console.error("[data-service] Error creating job offer:", error);
    throw new Error("Erro ao criar vaga");
  }
}

export const updateJobStatus = async (jobId: string, status: 'open' | 'paused' | 'closed'): Promise<boolean> => {
  try {
    // Also update isActive for backward compatibility
    const isActive = status === 'open';

    const { error } = await supabase
      .from('job_offers')
      .update({
        status,
        is_active: isActive
      })
      .eq('id', jobId);

    if (error) {
      console.error("Error updating job status:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error updating job status:", error);
    throw error;
  }
};

export const bulkUpdateJobStatus = async (jobIds: string[], status: 'open' | 'paused' | 'closed'): Promise<boolean> => {
  try {
    // Also update isActive for backward compatibility
    const isActive = status === 'open';

    const { error } = await supabase
      .from('job_offers')
      .update({
        status,
        is_active: isActive
      })
      .in('id', jobIds);

    if (error) {
      console.error("Error bulk updating job status:", error);
      throw error;
    }

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

export const checkJobApplication = async (jobId: string, candidateId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('job_applications')
      .select('id, status')
      .eq('job_offer_id', jobId)
      .eq('candidate_id', candidateId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error("Error checking application:", error);
      return false;
    }

    // Allow re-application if no record exists or if the application was withdrawn
    if (!data || data.status === 'withdrawn') {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking application:", error);
    return false;
  }
};

export const fetchJobApplication = async (jobId: string, candidateId: string): Promise<JobApplication | null> => {
  try {
    const { data, error } = await supabase
      .from('job_applications')
      .select(`
        id,
        job_offer_id,
        candidate_id,
        status,
        created_at,
        message,
        counter_proposal,
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
          budget_max
        )
      `)
      .eq('job_offer_id', jobId)
      .eq('candidate_id', candidateId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error("Error fetching application details:", error);
      return null;
    }

    const app = data as any;
    return {
      id: app.id,
      jobOfferId: app.job_offer_id,
      candidateId: app.candidate_id,
      status: app.status,
      createdAt: app.created_at,
      message: app.message,
      counterProposal: app.counter_proposal,
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
      }
    };
  } catch (error) {
    console.error("Error fetching application details:", error);
    return null;
  }
};

export const applyToJob = async (jobId: string, candidateId: string, message?: string, counterProposal?: number): Promise<boolean> => {
  try {
    // Use upsert to handle both new applications and reactivating withdrawn ones
    const { error } = await supabase
      .from('job_applications')
      .upsert({
        job_offer_id: jobId,
        candidate_id: candidateId,
        status: 'pending',
        message: message || null,
        counter_proposal: counterProposal || null
      }, {
        onConflict: 'job_offer_id,candidate_id'
      });

    if (error) {
      console.error("Error applying to job:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error applying to job:", error);
    throw error;
  }
};

export interface JobApplication {
  id: string;
  jobOfferId: string;
  candidateId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  message?: string;
  counterProposal?: number;
  agreedValue?: number;
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
  };
}

export const fetchUserApplications = async (userId: string): Promise<JobApplication[]> => {
  try {
    const { data, error } = await supabase
      .from('job_applications')
      .select(`
        id,
        job_offer_id,
        candidate_id,
        status,
        created_at,
        message,
        counter_proposal,
        agreed_value,
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
          budget_max
        )
      `)
      .eq('candidate_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
      throw error;
    }

    return data.map((app: any) => ({
      id: app.id,
      jobOfferId: app.job_offer_id,
      candidateId: app.candidate_id,
      status: app.status,
      createdAt: app.created_at,
      message: app.message,
      counterProposal: app.counter_proposal,
      agreedValue: app.agreed_value,
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
      }
    }));
  } catch (error) {
    console.error("Error fetching applications:", error);
    return [];
  }
};

export interface JobCandidate {
  id: string; // Application ID
  candidateId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  createdAt: string;
  message?: string;
  counterProposal?: number;
  agreedValue?: number;
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
        agreed_value,
        profiles (
          id,
          display_name,
          avatar_url,
          specialty,
          city,
          state,
          average_rating,
          total_reviews
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
      message: app.message,
      counterProposal: app.counter_proposal,
      agreedValue: app.agreed_value,
      profile: {
        id: app.profiles.id,
        displayName: app.profiles.display_name,
        avatarUrl: app.profiles.avatar_url,
        specialty: app.profiles.specialty,
        city: app.profiles.city,
        state: app.profiles.state,
        averageRating: app.profiles.average_rating,
        totalReviews: app.profiles.total_reviews,
        // email and phone removed to prevent error
      }
    }));
  } catch (error) {
    console.error("Error fetching candidates:", error);
    return [];
  }
};

export const updateJobApplicationStatus = async (applicationId: string, status: 'accepted' | 'rejected', agreedValue?: number): Promise<boolean> => {
  try {
    console.log(`Updating application ${applicationId} to status ${status} with agreed value ${agreedValue}`);
    const updateData: any = { status };
    if (agreedValue !== undefined) {
      updateData.agreed_value = agreedValue;
    }

    const { data, error } = await supabase
      .from('job_applications')
      .update(updateData)
      .eq('id', applicationId)
      .select();

    if (error) {
      console.error("Error updating application status:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn("No application updated. Possible RLS issue or ID not found.");
      return false;
    }

    console.log("Application updated successfully:", data);
    return true;
  } catch (error) {
    console.error("Error updating application status:", error);
    throw error;
  }
};
