export type PostType = "reels" | "carrossel" | "feed_image" | "influencer" | "story" | "shorts" | "thread";
export type NetworkType = "instagram" | "facebook" | "tiktok" | "linkedin" | "twitter" | "youtube";
export type PostStatus = "draft" | "in_review" | "approved" | "scheduled" | "published" | "rejected";
export type ProductionStatus = "pending" | "in_progress" | "done";
export type MemberRole = "owner" | "editor" | "approver" | "viewer";
export type MemberStatus = "pending" | "active" | "removed";
export type ScheduleStatus = "active" | "archived";

// Anamnese da conta gerada por IA (pesquisa web via @ do Instagram)
export interface AccountAnalysis {
  found?: boolean;
  web_research?: boolean;
  summary?: string;
  tone_of_voice?: string;
  content_themes?: string[];
  target_audience?: string;
  positioning?: string;
  strengths?: string[];
  weaknesses?: string[];
  opportunities?: string[];
  suggested_pillars?: string[];
}

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
  // Briefing avançado (usado na geração com IA)
  objective?: string;
  products_services?: string;
  differentials?: string;
  avoid_topics?: string;
  preferred_cta?: string;
  // Conta do Instagram + anamnese com IA
  account_handle?: string;
  account_analysis?: AccountAnalysis;
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
  capture_date?: string;
  production_status?: ProductionStatus;
  approved_by?: string;
  approved_at?: string;
  published_at?: string;
  // Métricas de desempenho (manuais hoje; Graph API no futuro)
  metric_likes?: number | null;
  metric_comments?: number | null;
  metric_shares?: number | null;
  metric_saves?: number | null;
  metric_reach?: number | null;
  metric_views?: number | null;
  metrics_updated_at?: string | null;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Status da conexão com o Instagram (retorno de sm_get_instagram_connection — sem token)
export interface InstagramConnection {
  connected: boolean;
  ig_username?: string;
  page_name?: string;
  last_synced_at?: string | null;
  token_expires_at?: string | null;
  connected_at?: string;
}

// Demografia dos seguidores (follower_demographics da Graph API)
export interface AudienceSlice {
  label: string;
  value: number;
}

export interface AudienceDemographics {
  followers?: number | null;
  age: AudienceSlice[];
  gender: AudienceSlice[];
  city: AudienceSlice[];
  country: AudienceSlice[];
  fetched_at?: string;
}

// ── Relatório mensal ──────────────────────────────────────────
export interface ReportPostStat {
  id: string;
  title: string;
  post_type: PostType;
  network: NetworkType;
  scheduled_date: string;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  views: number;
  engagement: number; // likes + comments + shares + saves
}

export interface MonthlyReportStats {
  totalPosts: number;
  publishedPosts: number;
  postsWithMetrics: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  totalReach: number;
  totalEngagement: number;
  avgEngagementPerPost: number;
  engagementRate: number | null; // engajamento / alcance (quando houver alcance)
  topPosts: ReportPostStat[];
  formatBreakdown: { post_type: PostType; count: number; avgEngagement: number }[];
  // Snapshot da demografia dos seguidores no momento da geração do relatório
  audience?: AudienceDemographics | null;
}

export interface MonthlyReportAI {
  executive_summary: string;
  highlights: string[];
  what_worked: string[];
  what_underperformed: string[];
  format_insights: string;
  recommendations: string[];
  next_month_strategy: string;
  suggested_posts: { title: string; post_type: string; network: string; rationale: string }[];
}

export interface SmMonthlyReport {
  id: string;
  schedule_id: string;
  month: number;
  year: number;
  stats: MonthlyReportStats;
  report: MonthlyReportAI;
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
  reels:      { label: "REELS",       color: "text-white", bgColor: "bg-orange-600" },
  carrossel:  { label: "CARROSSEL",   color: "text-white", bgColor: "bg-blue-700" },
  feed_image: { label: "FEED",        color: "text-white", bgColor: "bg-emerald-700" },
  influencer: { label: "INFLUENCER",  color: "text-white", bgColor: "bg-purple-600" },
  story:      { label: "STORY",       color: "text-white", bgColor: "bg-pink-600" },
  shorts:     { label: "SHORTS",      color: "text-white", bgColor: "bg-rose-700" },
  thread:     { label: "THREAD",      color: "text-white", bgColor: "bg-sky-700" },
};

export const NETWORK_CONFIG: Record<NetworkType, { label: string; color: string }> = {
  instagram: { label: "Instagram", color: "text-pink-500" },
  facebook: { label: "Facebook", color: "text-blue-600" },
  tiktok: { label: "TikTok", color: "text-slate-800 dark:text-slate-100" },
  linkedin: { label: "LinkedIn", color: "text-blue-700" },
  twitter: { label: "X / Twitter", color: "text-sky-500" },
  youtube: { label: "YouTube", color: "text-red-600" },
};

export const PRODUCTION_STATUS_CONFIG: Record<ProductionStatus, { label: string; color: string; bgColor: string; dot: string }> = {
  pending:     { label: "Pendente",     color: "text-gray-600 dark:text-gray-400",   bgColor: "bg-gray-100 dark:bg-gray-800",         dot: "bg-gray-400" },
  in_progress: { label: "Em Produção",  color: "text-amber-700 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-900/30",     dot: "bg-amber-400" },
  done:        { label: "Concluído",    color: "text-green-700 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-900/30",     dot: "bg-green-400" },
};

export const STATUS_CONFIG: Record<PostStatus, { label: string; color: string }> = {
  draft:     { label: "Em Produção", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  in_review: { label: "Em Revisão",  color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  approved:  { label: "Aprovado",    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  scheduled: { label: "Agendado",    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  published: { label: "Publicado",   color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  rejected:  { label: "Rejeitado",   color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
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

// Objetivos de marketing — o valor é enviado à IA, que ajusta o mix de conteúdo
export const OBJECTIVE_OPTIONS: { value: string; label: string }[] = [
  { value: "vendas", label: "Gerar vendas / leads" },
  { value: "engajamento", label: "Aumentar engajamento" },
  { value: "autoridade", label: "Construir autoridade" },
  { value: "seguidores", label: "Atrair novos seguidores" },
  { value: "lancamento", label: "Lançamento de produto/serviço" },
  { value: "relacionamento", label: "Relacionamento com clientes" },
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
