// Client HTTP do módulo Briefing Pro.
// CRUD e colaboração passam pelo backend NestJS (/briefing-pro/*) — o banco
// tem RLS fechado e não aceita acesso direto do client. A geração por IA usa
// a rota Next /api/briefing-pro/generate (proxy da Groq).

import apiClient from "./api-service";
import { tokenManager } from "./token-manager";
import {
  Briefing,
  BriefingComment,
  BriefingContact,
  BriefingDeliverable,
  BriefingDetail,
  BriefingIncident,
  BriefingItem,
  BriefingLink,
  BriefingListRow,
  BriefingLocation,
  BriefingMember,
  BriefingReadConfirmation,
  BriefingSection,
  BriefingSubitem,
  GeneratedBriefingStructure,
  GeneratedSection,
  MemberRole,
  PublicBriefingView,
  RefineMode,
} from "./briefing-pro-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export interface CreateBriefingPayload {
  title: string;
  briefing_type: string;
  client_name?: string;
  objective?: string;
  target_audience?: string;
  tone?: string;
  restrictions?: string;
  notes?: string;
  event_date?: string;
  event_time?: string;
  contacts?: BriefingContact[];
  locations?: BriefingLocation[];
  ai_generated?: boolean;
  source_text?: string;
  sections?: Array<{
    title: string;
    description?: string;
    items?: Array<{
      title: string;
      description?: string;
      item_type?: string;
      priority?: string;
      scheduled_time?: string;
      is_required?: boolean;
      subitems?: Array<{ title: string }>;
    }>;
  }>;
  deliverables?: Array<{
    title: string;
    description?: string;
    specs?: string;
    quantity?: number;
    due_date?: string;
    deliver_to?: string;
    delivery_method?: string;
  }>;
}

export const briefingProService = {
  // ─── Briefings ────────────────────────────────────────────────────────────

  async list(): Promise<{ owned: BriefingListRow[]; shared: BriefingListRow[] }> {
    const { data } = await apiClient.get("/briefing-pro");
    return data;
  },

  async getDetail(id: string): Promise<BriefingDetail> {
    const { data } = await apiClient.get(`/briefing-pro/${id}`);
    return data;
  },

  async create(payload: CreateBriefingPayload): Promise<Briefing> {
    const { data } = await apiClient.post("/briefing-pro", payload);
    return data;
  },

  async update(id: string, payload: Partial<CreateBriefingPayload> & { approver_id?: string }): Promise<Briefing> {
    const { data } = await apiClient.patch(`/briefing-pro/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/briefing-pro/${id}`);
  },

  async changeStatus(id: string, status: string): Promise<Briefing> {
    const { data } = await apiClient.post(`/briefing-pro/${id}/status`, { status });
    return data;
  },

  async confirmRead(id: string): Promise<BriefingReadConfirmation> {
    const { data } = await apiClient.post(`/briefing-pro/${id}/confirm-read`);
    return data;
  },

  // ─── Compartilhamento por link ────────────────────────────────────────────

  /** Ativa/atualiza o link público (só o dono). */
  async enableShare(
    briefingId: string,
    role: MemberRole,
    regenerate?: boolean
  ): Promise<{ share_token: string; share_role: MemberRole }> {
    const { data } = await apiClient.post(`/briefing-pro/${briefingId}/share`, {
      role,
      ...(regenerate ? { regenerate: true } : {}),
    });
    return data;
  },

  async disableShare(briefingId: string): Promise<void> {
    await apiClient.delete(`/briefing-pro/${briefingId}/share`);
  },

  /** Visão pública do briefing — SEM autenticação (fetch direto, sem apiClient). */
  async fetchPublicBriefing(token: string): Promise<PublicBriefingView> {
    const response = await fetch(`${API_URL}/briefing-pro/public/${token}`);
    if (!response.ok) {
      throw new Error(response.status === 404 ? "Link inválido ou desativado" : "Erro ao carregar");
    }
    return response.json();
  },

  /** Entra no briefing pelo link (usuário autenticado). */
  async joinShared(token: string): Promise<{ briefing_id: string; role: string }> {
    const { data } = await apiClient.post(`/briefing-pro/join/${token}`);
    return data;
  },

  /** Duplica o briefing como novo rascunho do usuário (com remap de datas). */
  async duplicate(
    id: string,
    payload: { title?: string; client_name?: string; event_date?: string; copy_members?: boolean }
  ): Promise<Briefing> {
    const { data } = await apiClient.post(`/briefing-pro/${id}/duplicate`, payload);
    return data;
  },

  async reorderSections(briefingId: string, sectionIds: string[]): Promise<void> {
    await apiClient.post(`/briefing-pro/${briefingId}/sections/reorder`, {
      section_ids: sectionIds,
    });
  },

  async reorderItems(
    briefingId: string,
    items: Array<{ id: string; section_id: string; position: number }>
  ): Promise<void> {
    await apiClient.post(`/briefing-pro/${briefingId}/items/reorder`, { items });
  },

  /** Empurra/adianta todos os horários em N minutos (opcionalmente por seção). */
  async timeShift(
    briefingId: string,
    minutes: number,
    sectionIds?: string[]
  ): Promise<{ updated: number }> {
    const { data } = await apiClient.post(`/briefing-pro/${briefingId}/time-shift`, {
      minutes,
      ...(sectionIds?.length ? { section_ids: sectionIds } : {}),
    });
    return data;
  },

  // ─── Membros ──────────────────────────────────────────────────────────────

  async addMember(briefingId: string, userId: string, role: string): Promise<BriefingMember> {
    const { data } = await apiClient.post(`/briefing-pro/${briefingId}/members`, {
      user_id: userId,
      role,
    });
    return data;
  },

  async updateMemberRole(memberId: string, role: string): Promise<BriefingMember> {
    const { data } = await apiClient.patch(`/briefing-pro/members/${memberId}`, { role });
    return data;
  },

  async removeMember(memberId: string): Promise<void> {
    await apiClient.delete(`/briefing-pro/members/${memberId}`);
  },

  // ─── Seções ───────────────────────────────────────────────────────────────

  async createSection(
    briefingId: string,
    payload: { title: string; description?: string }
  ): Promise<BriefingSection> {
    const { data } = await apiClient.post(`/briefing-pro/${briefingId}/sections`, payload);
    return data;
  },

  async updateSection(
    sectionId: string,
    payload: { title?: string; description?: string; position?: number }
  ): Promise<BriefingSection> {
    const { data } = await apiClient.patch(`/briefing-pro/sections/${sectionId}`, payload);
    return data;
  },

  async deleteSection(sectionId: string): Promise<void> {
    await apiClient.delete(`/briefing-pro/sections/${sectionId}`);
  },

  /** Aplica o refino: substitui título/descrição e recria todos os itens da seção. */
  async replaceSectionContent(
    sectionId: string,
    payload: { title?: string; description?: string; items: GeneratedSection["items"] }
  ): Promise<BriefingSection> {
    const { data } = await apiClient.put(`/briefing-pro/sections/${sectionId}/content`, payload);
    return data;
  },

  // ─── Itens ────────────────────────────────────────────────────────────────

  async createItem(briefingId: string, payload: Record<string, unknown>): Promise<BriefingItem> {
    const { data } = await apiClient.post(`/briefing-pro/${briefingId}/items`, payload);
    return data;
  },

  async updateItem(itemId: string, payload: Record<string, unknown>): Promise<BriefingItem> {
    const { data } = await apiClient.patch(`/briefing-pro/items/${itemId}`, payload);
    return data;
  },

  async updateItemStatus(itemId: string, status: string): Promise<BriefingItem> {
    const { data } = await apiClient.post(`/briefing-pro/items/${itemId}/status`, { status });
    return data;
  },

  async deleteItem(itemId: string): Promise<void> {
    await apiClient.delete(`/briefing-pro/items/${itemId}`);
  },

  // ─── Subitens ─────────────────────────────────────────────────────────────

  async createSubitem(itemId: string, title: string): Promise<BriefingSubitem> {
    const { data } = await apiClient.post(`/briefing-pro/items/${itemId}/subitems`, { title });
    return data;
  },

  async updateSubitem(subitemId: string, payload: { title?: string }): Promise<BriefingSubitem> {
    const { data } = await apiClient.patch(`/briefing-pro/subitems/${subitemId}`, payload);
    return data;
  },

  async updateSubitemStatus(subitemId: string, status: "pending" | "done"): Promise<BriefingSubitem> {
    const { data } = await apiClient.post(`/briefing-pro/subitems/${subitemId}/status`, { status });
    return data;
  },

  async deleteSubitem(subitemId: string): Promise<void> {
    await apiClient.delete(`/briefing-pro/subitems/${subitemId}`);
  },

  // ─── Entregáveis ──────────────────────────────────────────────────────────

  async createDeliverable(
    briefingId: string,
    payload: Record<string, unknown>
  ): Promise<BriefingDeliverable> {
    const { data } = await apiClient.post(`/briefing-pro/${briefingId}/deliverables`, payload);
    return data;
  },

  async updateDeliverable(
    deliverableId: string,
    payload: Record<string, unknown>
  ): Promise<BriefingDeliverable> {
    const { data } = await apiClient.patch(`/briefing-pro/deliverables/${deliverableId}`, payload);
    return data;
  },

  async deleteDeliverable(deliverableId: string): Promise<void> {
    await apiClient.delete(`/briefing-pro/deliverables/${deliverableId}`);
  },

  // ─── Links de materiais ───────────────────────────────────────────────────

  async createLink(briefingId: string, payload: Record<string, unknown>): Promise<BriefingLink> {
    const { data } = await apiClient.post(`/briefing-pro/${briefingId}/links`, payload);
    return data;
  },

  async updateLink(linkId: string, payload: Record<string, unknown>): Promise<BriefingLink> {
    const { data } = await apiClient.patch(`/briefing-pro/links/${linkId}`, payload);
    return data;
  },

  async deleteLink(linkId: string): Promise<void> {
    await apiClient.delete(`/briefing-pro/links/${linkId}`);
  },

  // ─── Comentários ──────────────────────────────────────────────────────────

  async listComments(briefingId: string, since?: string): Promise<BriefingComment[]> {
    const { data } = await apiClient.get(`/briefing-pro/${briefingId}/comments`, {
      params: since ? { since } : undefined,
    });
    return data;
  },

  async addComment(
    briefingId: string,
    content: string,
    itemId?: string
  ): Promise<BriefingComment> {
    const { data } = await apiClient.post(`/briefing-pro/${briefingId}/comments`, {
      content,
      ...(itemId ? { item_id: itemId } : {}),
    });
    return data;
  },

  async deleteComment(commentId: string): Promise<void> {
    await apiClient.delete(`/briefing-pro/comments/${commentId}`);
  },

  // ─── Intercorrências ──────────────────────────────────────────────────────

  async addIncident(
    briefingId: string,
    payload: { description: string; severity?: string; item_id?: string }
  ): Promise<BriefingIncident> {
    const { data } = await apiClient.post(`/briefing-pro/${briefingId}/incidents`, payload);
    return data;
  },

  async updateIncident(
    incidentId: string,
    payload: { description?: string; severity?: string; resolved?: boolean; resolution?: string }
  ): Promise<BriefingIncident> {
    const { data } = await apiClient.patch(`/briefing-pro/incidents/${incidentId}`, payload);
    return data;
  },

  async deleteIncident(incidentId: string): Promise<void> {
    await apiClient.delete(`/briefing-pro/incidents/${incidentId}`);
  },

  // ─── IA ───────────────────────────────────────────────────────────────────

  async generateWithAi(
    text: string,
    briefingType?: string
  ): Promise<GeneratedBriefingStructure> {
    const response = await fetch("/api/briefing-pro/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...tokenManager.authHeader() },
      body: JSON.stringify({ text, briefing_type: briefingType }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Erro ao gerar o briefing com IA");
    }
    return data.briefing as GeneratedBriefingStructure;
  },

  /** Refina UMA seção com IA (mais detalhes, mais enxuto ou instrução livre). */
  async refineSectionWithAi(payload: {
    mode: RefineMode;
    instruction?: string;
    briefing: {
      title: string;
      briefing_type: string;
      objective?: string | null;
      tone?: string | null;
      restrictions?: string | null;
      event_date?: string | null;
      event_time?: string | null;
    };
    section: {
      title: string;
      description?: string | null;
      items: Array<{
        title: string;
        description?: string | null;
        item_type: string;
        priority: string;
        scheduled_time?: string | null;
        is_required: boolean;
        subitems: Array<{ title: string }>;
      }>;
    };
  }): Promise<GeneratedSection> {
    const response = await fetch("/api/briefing-pro/refine-section", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...tokenManager.authHeader() },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Erro ao refinar a seção com IA");
    }
    return data.section as GeneratedSection;
  },
};
