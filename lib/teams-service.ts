// Client HTTP do módulo Times (/teams/*). RLS fechado no banco — tudo passa
// pelo backend NestJS, exceto o realtime do chat (assinatura direta na
// tabela team_messages, que tem policy de SELECT para membros).

import apiClient from "./api-service";
import type { CreateJobOfferData, JobOffer, UpdateJobOfferData } from "./data-service";
import type { Briefing } from "./briefing-pro-types";
import type {
  Team,
  TeamAnnouncement,
  TeamAvailabilityView,
  TeamDetail,
  TeamInvitationRow,
  TeamInvitePreview,
  TeamJobApplication,
  TeamJobDetail,
  TeamJobRow,
  TeamListRow,
  TeamMember,
  TeamMemberView,
  TeamMessage,
  TeamProfileSummary,
} from "./teams-types";

export interface CreateTeamPayload {
  name: string;
  description?: string;
  color?: string;
  /** Empresa dona do time (precisa administrar a empresa); ausente = time pessoal. */
  company_id?: string | null;
}

export interface UpdateTeamPayload {
  name?: string;
  description?: string;
  color?: string;
  invite_role?: "member" | "manager";
  /** Liga (id) ou desliga (null) o time de uma empresa. Só o dono do time. */
  company_id?: string | null;
}

export const teamsService = {
  // ─── Times ──────────────────────────────────────────────────────────────
  async listMine(): Promise<{ teams: TeamListRow[]; invitations: TeamInvitationRow[] }> {
    const { data } = await apiClient.get("/teams");
    return data;
  },
  async create(payload: CreateTeamPayload): Promise<Team> {
    const { data } = await apiClient.post("/teams", payload);
    return data;
  },
  async getDetail(teamId: string): Promise<TeamDetail> {
    const { data } = await apiClient.get(`/teams/${teamId}`);
    return data;
  },
  async update(teamId: string, payload: UpdateTeamPayload): Promise<Team> {
    const { data } = await apiClient.patch(`/teams/${teamId}`, payload);
    return data;
  },
  async remove(teamId: string): Promise<void> {
    await apiClient.delete(`/teams/${teamId}`);
  },
  async archive(teamId: string): Promise<Team> {
    const { data } = await apiClient.post(`/teams/${teamId}/archive`);
    return data;
  },
  async unarchive(teamId: string): Promise<Team> {
    const { data } = await apiClient.post(`/teams/${teamId}/unarchive`);
    return data;
  },
  async enableInviteLink(teamId: string, payload: { regenerate?: boolean; role?: "member" | "manager" } = {}): Promise<Team> {
    const { data } = await apiClient.post(`/teams/${teamId}/invite-link`, payload);
    return data;
  },
  async disableInviteLink(teamId: string): Promise<void> {
    await apiClient.delete(`/teams/${teamId}/invite-link`);
  },
  async previewInvite(token: string): Promise<TeamInvitePreview> {
    const { data } = await apiClient.get(`/teams/invite/${encodeURIComponent(token)}`);
    return data;
  },
  async joinByToken(token: string): Promise<{ team_id: string; status: string }> {
    const { data } = await apiClient.post(`/teams/join/${encodeURIComponent(token)}`);
    return data;
  },

  // ─── Membros ────────────────────────────────────────────────────────────
  async searchCandidates(teamId: string, q: string): Promise<TeamProfileSummary[]> {
    const { data } = await apiClient.get(`/teams/${teamId}/members/search`, { params: { q } });
    return data;
  },
  async invite(teamId: string, payload: { user_id: string; role?: "member" | "manager"; job_role?: string }): Promise<TeamMemberView> {
    const { data } = await apiClient.post(`/teams/${teamId}/members`, payload);
    return data;
  },
  async respondInvitation(teamId: string, memberId: string, accept: boolean): Promise<TeamMember> {
    const { data } = await apiClient.post(`/teams/${teamId}/members/${memberId}/respond`, { accept });
    return data;
  },
  async updateMember(teamId: string, memberId: string, payload: { role?: "member" | "manager"; job_role?: string; notes?: string }): Promise<TeamMember> {
    const { data } = await apiClient.patch(`/teams/${teamId}/members/${memberId}`, payload);
    return data;
  },
  async removeMember(teamId: string, memberId: string): Promise<void> {
    await apiClient.delete(`/teams/${teamId}/members/${memberId}`);
  },
  async availability(teamId: string, from: string, to: string): Promise<TeamAvailabilityView> {
    const { data } = await apiClient.get(`/teams/${teamId}/availability`, { params: { from, to } });
    return data;
  },

  // ─── Jobs ───────────────────────────────────────────────────────────────
  async listJobs(teamId: string): Promise<TeamJobRow[]> {
    const { data } = await apiClient.get(`/teams/${teamId}/jobs`);
    return data;
  },
  async createJob(teamId: string, payload: CreateJobOfferData): Promise<JobOffer> {
    const { data } = await apiClient.post(`/teams/${teamId}/jobs`, payload);
    return data;
  },
  async getJob(teamId: string, jobId: string): Promise<TeamJobDetail> {
    const { data } = await apiClient.get(`/teams/${teamId}/jobs/${jobId}`);
    return data;
  },
  async updateJob(teamId: string, jobId: string, payload: UpdateJobOfferData): Promise<JobOffer> {
    const { data } = await apiClient.put(`/teams/${teamId}/jobs/${jobId}`, payload);
    return data;
  },
  async updateJobStatus(teamId: string, jobId: string, status: "open" | "paused" | "closed"): Promise<JobOffer> {
    const { data } = await apiClient.patch(`/teams/${teamId}/jobs/${jobId}/status`, { status });
    return data;
  },
  async removeJob(teamId: string, jobId: string): Promise<void> {
    await apiClient.delete(`/teams/${teamId}/jobs/${jobId}`);
  },
  async apply(teamId: string, jobId: string, payload: { message?: string; team_role?: string }): Promise<TeamJobApplication> {
    const { data } = await apiClient.post(`/teams/${teamId}/jobs/${jobId}/apply`, payload);
    return data;
  },
  async convoke(teamId: string, jobId: string, payload: { user_id: string; team_role?: string; message?: string }): Promise<TeamJobApplication> {
    const { data } = await apiClient.post(`/teams/${teamId}/jobs/${jobId}/convoke`, payload);
    return data;
  },
  async confirm(teamId: string, jobId: string, appId: string): Promise<TeamJobApplication> {
    const { data } = await apiClient.post(`/teams/${teamId}/jobs/${jobId}/applications/${appId}/confirm`);
    return data;
  },
  async reject(teamId: string, jobId: string, appId: string): Promise<TeamJobApplication> {
    const { data } = await apiClient.post(`/teams/${teamId}/jobs/${jobId}/applications/${appId}/reject`);
    return data;
  },
  async respond(teamId: string, jobId: string, appId: string, accept: boolean): Promise<TeamJobApplication> {
    const { data } = await apiClient.post(`/teams/${teamId}/jobs/${jobId}/applications/${appId}/respond`, { accept });
    return data;
  },
  async withdraw(teamId: string, jobId: string, appId: string): Promise<TeamJobApplication> {
    const { data } = await apiClient.post(`/teams/${teamId}/jobs/${jobId}/applications/${appId}/withdraw`);
    return data;
  },
  async createBriefing(
    teamId: string,
    jobId: string,
    payload: { title?: string; briefing_type?: string; include_crew?: boolean; add_members?: boolean }
  ): Promise<Briefing> {
    const { data } = await apiClient.post(`/teams/${teamId}/jobs/${jobId}/briefings`, payload);
    return data;
  },

  // ─── Chat ───────────────────────────────────────────────────────────────
  async listMessages(teamId: string, params: { job_id?: string; limit?: number; before?: string } = {}): Promise<TeamMessage[]> {
    const { data } = await apiClient.get(`/teams/${teamId}/messages`, { params });
    return data.data ?? [];
  },
  async sendMessage(teamId: string, content: string, jobId?: string): Promise<TeamMessage> {
    const { data } = await apiClient.post(`/teams/${teamId}/messages`, { content, job_id: jobId });
    return data;
  },
  async markRead(teamId: string, jobId?: string): Promise<void> {
    await apiClient.post(`/teams/${teamId}/messages/read`, { job_id: jobId });
  },

  // ─── Avisos ─────────────────────────────────────────────────────────────
  async listAnnouncements(teamId: string): Promise<TeamAnnouncement[]> {
    const { data } = await apiClient.get(`/teams/${teamId}/announcements`);
    return data;
  },
  async createAnnouncement(teamId: string, payload: { title: string; content: string; pinned?: boolean }): Promise<TeamAnnouncement> {
    const { data } = await apiClient.post(`/teams/${teamId}/announcements`, payload);
    return data;
  },
  async updateAnnouncement(teamId: string, annId: string, payload: { title?: string; content?: string; pinned?: boolean }): Promise<TeamAnnouncement> {
    const { data } = await apiClient.patch(`/teams/${teamId}/announcements/${annId}`, payload);
    return data;
  },
  async deleteAnnouncement(teamId: string, annId: string): Promise<void> {
    await apiClient.delete(`/teams/${teamId}/announcements/${annId}`);
  },
};

/** Mensagem de erro da API (array ou string) com fallback. */
export function teamsApiError(error: unknown, fallback: string): string {
  const msg = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(" ");
  return typeof msg === "string" && msg ? msg : fallback;
}
