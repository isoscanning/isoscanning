// Tipos do módulo Times — espelham as respostas de /teams/* (snake_case,
// como o backend devolve as linhas).

import type { JobOffer } from "@/lib/data-service";

export type TeamRole = "owner" | "manager" | "member";
export type TeamMemberStatus = "invited" | "active" | "declined" | "removed" | "left";
export type TeamInviteRole = "member" | "manager";

/** Empresa dona do time, resumida (SQL 82). */
export interface TeamCompanySummary {
  id: string;
  name: string;
  color: string;
}

export interface Team {
  id: string;
  owner_id: string;
  /** Empresa dona do time; null = time do profissional autônomo. */
  company_id: string | null;
  name: string;
  description: string | null;
  color: string;
  invite_token: string | null;
  invite_role: TeamInviteRole;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamProfileSummary {
  id: string;
  display_name: string;
  avatar_url: string | null;
  username: string | null;
  specialty: string | null;
  specialties: string[];
  city: string | null;
  state: string | null;
  average_rating: number | null;
  total_reviews: number | null;
  subscription_tier: string | null;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  status: TeamMemberStatus;
  job_role: string;
  notes: string | null;
  invited_by: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberView extends TeamMember {
  profile: TeamProfileSummary | null;
  invited_by_profile?: TeamProfileSummary | null;
  escalations_count: number;
  last_job_date: string | null;
  next_job_date: string | null;
}

export interface TeamListRow {
  team: Team;
  my_role: TeamRole;
  members_count: number;
  open_jobs_count: number;
  unread_count: number;
  company: TeamCompanySummary | null;
}

export interface TeamInvitationRow {
  membership: TeamMember;
  team: Team;
  invited_by_profile: TeamProfileSummary | null;
  members_count: number;
}

export interface TeamJobSummary {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  positions: number;
  confirmed_count: number;
  pending_count: number;
  my_status: string | null;
  my_origin: string | null;
}

export interface TeamAnnouncement {
  id: string;
  team_id: string;
  author_id: string | null;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  author?: TeamProfileSummary | null;
}

export interface TeamDetail {
  team: Team;
  my_role: TeamRole;
  company: TeamCompanySummary | null;
  members: TeamMemberView[];
  invited: TeamMemberView[];
  upcoming_jobs: TeamJobSummary[];
  announcements: TeamAnnouncement[];
  unread: { team: number; jobs: Record<string, number> };
  stats: {
    members_active: number;
    members_invited: number;
    jobs_open: number;
    jobs_total: number;
    pending_applications: number;
    my_pending_convocations: number;
  };
}

export type AgendaDayStatus = "free" | "partial" | "busy" | "unset";

export interface TeamAvailabilityView {
  from: string;
  to: string;
  members: Array<{
    user_id: string;
    days: Record<string, AgendaDayStatus>;
    jobs: Array<{ job_id: string; title: string; start_date: string; end_date: string }>;
  }>;
}

export type TeamApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";
export type TeamApplicationOrigin = "candidate" | "convocation";

export interface TeamJobApplication {
  id: string;
  job_offer_id: string;
  candidate_id: string;
  status: TeamApplicationStatus;
  origin: TeamApplicationOrigin;
  is_team: boolean;
  team_role: string | null;
  message: string | null;
  counter_proposal: number | null;
  employer_counter_proposal: number | null;
  agreement_status: string | null;
  agreement_value: number | null;
  agreement_start_date: string | null;
  agreement_end_date: string | null;
  contract_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface TeamJobApplicationView extends TeamJobApplication {
  profile: TeamProfileSummary | null;
  member_job_role: string | null;
}

export interface TeamJobRow {
  job: JobOffer;
  positions: number;
  confirmed_count: number;
  pending_count: number;
  my_application: Pick<TeamJobApplication, "id" | "status" | "origin" | "team_role"> | null;
}

export interface TeamJobBriefingSummary {
  id: string;
  owner_id: string;
  title: string;
  status: string;
  event_date: string | null;
  event_time: string | null;
  briefing_type: string;
  items_total: number;
  items_done: number;
  deliverables: Array<{
    id: string;
    title: string;
    quantity: number;
    due_date: string | null;
    status: string;
  }>;
}

export interface TeamJobDetail {
  job: JobOffer;
  my_role: TeamRole;
  applications: TeamJobApplicationView[];
  my_application: TeamJobApplicationView | null;
  briefings: TeamJobBriefingSummary[];
  escalation: { positions: number; confirmed: number; pending: number; complete: boolean };
}

export interface TeamMessage {
  id: string;
  team_id: string;
  job_offer_id: string | null;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: TeamProfileSummary | null;
}

export interface TeamInvitePreview {
  team: Pick<Team, "id" | "name" | "description" | "color">;
  owner: TeamProfileSummary | null;
  members_count: number;
}

// ─── Rótulos ──────────────────────────────────────────────────────────────

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Dono",
  manager: "Gestor",
  member: "Membro",
};

export const TEAM_JOB_ROLE_SUGGESTIONS = [
  "Foto",
  "Vídeo",
  "Drone",
  "Edição",
  "Coordenação",
  "Auxiliar",
  "Social media",
  "Iluminação",
  "Áudio",
];

export const TEAM_COLORS = ["#0ea5e9", "#8b5cf6", "#ec4899", "#f97316", "#10b981", "#eab308", "#ef4444", "#6366f1"];

export const APPLICATION_STATUS_LABELS: Record<TeamApplicationStatus, string> = {
  pending: "Pendente",
  accepted: "Escalado",
  rejected: "Recusado",
  withdrawn: "Retirado",
};

export function isManagerRole(role: TeamRole | null | undefined): boolean {
  return role === "owner" || role === "manager";
}

/** "2026-09-15" → "15/09/2026". */
export function formatTeamDate(value: string | null | undefined): string {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
