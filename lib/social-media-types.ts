export type PostType = "reels" | "carrossel" | "feed_image" | "feed_video" | "story" | "shorts" | "thread";
export type NetworkType = "instagram" | "facebook" | "tiktok" | "linkedin" | "twitter" | "youtube";
export type PostStatus = "draft" | "in_review" | "approved" | "scheduled" | "published" | "rejected";
export type MemberRole = "owner" | "editor" | "approver" | "viewer";
export type MemberStatus = "pending" | "active" | "removed";
export type ScheduleStatus = "active" | "archived";

export interface SocialMediaSchedule {
  id: string;
  owner_id: string;
  client_name: string;
  client_niche?: string;
  description?: string;
  month: number;
  year: number;
  networks: NetworkType[];
  tone_of_voice?: string;
  target_audience?: string;
  posting_frequency: number;
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
}

export interface SocialMediaPost {
  id: string;
  schedule_id: string;
  title: string;
  post_type: PostType;
  network: NetworkType;
  scheduled_date: string;
  scheduled_time?: string;
  status: PostStatus;
  copy?: string;
  hashtags: string[];
  content_description?: string;
  ai_generated: boolean;
  position_number?: number;
  notes?: string;
  material_link?: string;
  video_link?: string;
  approved_by?: string;
  approved_at?: string;
  published_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  schedule_id: string;
  user_id: string;
  role: MemberRole;
  invited_by?: string;
  invited_at: string;
  accepted_at?: string;
  status: MemberStatus;
  profile?: {
    display_name: string;
    avatar_url?: string;
    username?: string;
    email?: string;
  };
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  comment: string;
  comment_type: "comment" | "suggestion" | "approval" | "rejection";
  created_at: string;
  profile?: {
    display_name: string;
    avatar_url?: string;
  };
}

export const POST_TYPE_CONFIG: Record<PostType, { label: string; color: string; bgColor: string }> = {
  reels: { label: "REELS", color: "text-white", bgColor: "bg-orange-600" },
  carrossel: { label: "CARROSSEL", color: "text-white", bgColor: "bg-blue-700" },
  feed_image: { label: "FEED", color: "text-white", bgColor: "bg-emerald-700" },
  feed_video: { label: "FEED VÍD.", color: "text-white", bgColor: "bg-teal-700" },
  story: { label: "STORY", color: "text-white", bgColor: "bg-pink-600" },
  shorts: { label: "SHORTS", color: "text-white", bgColor: "bg-rose-700" },
  thread: { label: "THREAD", color: "text-white", bgColor: "bg-sky-700" },
};

export const NETWORK_CONFIG: Record<NetworkType, { label: string; color: string }> = {
  instagram: { label: "Instagram", color: "text-pink-500" },
  facebook: { label: "Facebook", color: "text-blue-600" },
  tiktok: { label: "TikTok", color: "text-slate-800 dark:text-slate-100" },
  linkedin: { label: "LinkedIn", color: "text-blue-700" },
  twitter: { label: "X / Twitter", color: "text-sky-500" },
  youtube: { label: "YouTube", color: "text-red-600" },
};

export const STATUS_CONFIG: Record<PostStatus, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" },
  in_review: { label: "Em Revisão", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  approved: { label: "Aprovado", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  scheduled: { label: "Agendado", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  published: { label: "Publicado", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  rejected: { label: "Rejeitado", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const NETWORK_OPTIONS: { value: NetworkType; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "X / Twitter" },
  { value: "youtube", label: "YouTube" },
];

export const TONE_OPTIONS = [
  "Profissional e técnico",
  "Informal e descontraído",
  "Inspiracional e motivador",
  "Humorístico e divertido",
  "Educativo e informativo",
  "Luxo e premium",
  "Próximo e acolhedor",
];

export const COMMEMORATIVE_DATES: Record<string, string> = {
  "01-01": "Ano Novo 🎉",
  "03-08": "Dia Internacional da Mulher 🌸",
  "04-21": "Tiradentes",
  "05-01": "Dia do Trabalho",
  "06-12": "Dia dos Namorados ❤️",
  "06-13": "Santo Antônio",
  "06-24": "São João 🎆",
  "07-09": "Revolução Constitucionalista",
  "09-07": "Independência do Brasil 🇧🇷",
  "10-12": "Nossa Sra. Aparecida / Dia das Crianças",
  "11-02": "Finados",
  "11-15": "Proclamação da República",
  "11-20": "Dia da Consciência Negra",
  "12-25": "Natal 🎄",
  "12-31": "Réveillon 🥂",
};
