// Tipos do módulo Briefing Pro — espelham as respostas do backend NestJS
// (snake_case = colunas do banco, retornadas diretamente pela API).

export type BriefingType =
  | "photography"
  | "video"
  | "social_media"
  | "marketing"
  | "event"
  | "other";

export type BriefingStatus =
  | "draft"
  | "review"
  | "approved"
  | "in_execution"
  | "completed"
  | "archived";

export type MemberRole = "editor" | "viewer";
export type EffectiveRole = "owner" | "editor" | "viewer";
export type ItemType = "task" | "photo" | "video" | "material" | "note";
export type ItemPriority = "low" | "medium" | "high";
export type ItemStatus = "pending" | "in_progress" | "done" | "skipped";
export type DeliverableStatus = "pending" | "in_production" | "delivered" | "approved";
export type StorageType = "drive" | "dropbox" | "wetransfer" | "onedrive" | "external_hd" | "other";

export interface BriefingContact {
  name: string;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}

export interface BriefingLocation {
  name: string;
  address?: string | null;
  map_url?: string | null;
  notes?: string | null;
}

export interface Briefing {
  id: string;
  owner_id: string;
  title: string;
  client_name: string | null;
  briefing_type: BriefingType;
  status: BriefingStatus;
  objective: string | null;
  target_audience: string | null;
  tone: string | null;
  restrictions: string | null;
  notes: string | null;
  event_date: string | null;
  event_time: string | null;
  contacts: BriefingContact[];
  locations: BriefingLocation[];
  approver_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  version: number;
  ai_generated: boolean;
  source_text: string | null;
  share_token: string | null;
  share_role: MemberRole;
  created_at: string;
  updated_at: string;
}

export interface BriefingListRow extends Briefing {
  my_role?: MemberRole;
  items_total?: number;
  items_done?: number;
  members_count?: number;
}

export interface ProfileSummary {
  id: string;
  display_name: string;
  avatar_url: string | null;
  username: string | null;
  email: string | null;
}

export interface BriefingMember {
  id: string;
  briefing_id: string;
  user_id: string;
  role: MemberRole;
  status: "active" | "removed";
  invited_by: string | null;
  created_at: string;
  profile?: ProfileSummary | null;
}

export interface BriefingSubitem {
  id: string;
  briefing_id: string;
  item_id: string;
  title: string;
  status: "pending" | "done";
  completed_by: string | null;
  completed_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface BriefingItem {
  id: string;
  briefing_id: string;
  section_id: string;
  title: string;
  description: string | null;
  item_type: ItemType;
  priority: ItemPriority;
  /** Obrigatório para toda a equipe: não pode ser pulado e trava a conclusão. */
  is_required: boolean;
  assigned_to: string | null;
  scheduled_time: string | null;
  status: ItemStatus;
  completed_by: string | null;
  completed_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  subitems: BriefingSubitem[];
}

export interface BriefingSection {
  id: string;
  briefing_id: string;
  title: string;
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  items: BriefingItem[];
}

export interface BriefingDeliverable {
  id: string;
  briefing_id: string;
  title: string;
  description: string | null;
  specs: string | null;
  quantity: number;
  due_date: string | null;
  deliver_to: string | null;
  delivery_method: string | null;
  assigned_to: string | null;
  status: DeliverableStatus;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface BriefingLink {
  id: string;
  briefing_id: string;
  item_id: string | null;
  deliverable_id: string | null;
  label: string;
  url: string | null;
  storage_type: StorageType;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface BriefingComment {
  id: string;
  briefing_id: string;
  item_id: string | null;
  author_id: string;
  content: string;
  created_at: string;
  profile?: ProfileSummary | null;
}

export type IncidentSeverity = "low" | "medium" | "high";

export interface BriefingIncident {
  id: string;
  briefing_id: string;
  item_id: string | null;
  author_id: string;
  severity: IncidentSeverity;
  description: string;
  resolved: boolean;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  occurred_at: string;
  created_at: string;
  profile?: ProfileSummary | null;
}

export interface BriefingReadConfirmation {
  id: string;
  briefing_id: string;
  user_id: string;
  version: number;
  confirmed_at: string;
  profile?: ProfileSummary | null;
}

export interface BriefingDetail {
  briefing: Briefing;
  my_role: EffectiveRole;
  sections: BriefingSection[];
  deliverables: BriefingDeliverable[];
  links: BriefingLink[];
  members: BriefingMember[];
  read_confirmations: BriefingReadConfirmation[];
  incidents: BriefingIncident[];
  profiles: Record<string, ProfileSummary>;
}

/** Estrutura devolvida pela rota de IA (mesmo shape do payload de criação). */
export interface GeneratedBriefingStructure {
  title: string;
  briefing_type: BriefingType;
  client_name?: string;
  objective?: string;
  target_audience?: string;
  tone?: string;
  restrictions?: string;
  notes?: string;
  event_date?: string;
  event_time?: string;
  contacts: BriefingContact[];
  locations: BriefingLocation[];
  sections: Array<{
    title: string;
    description?: string;
    items: Array<{
      title: string;
      description?: string;
      item_type: ItemType;
      priority: ItemPriority;
      scheduled_time?: string;
      is_required?: boolean;
      subitems?: Array<{ title: string }>;
    }>;
  }>;
  deliverables: Array<{
    title: string;
    description?: string;
    specs?: string;
    quantity: number;
    due_date?: string;
    deliver_to?: string;
    delivery_method?: string;
  }>;
  ai_generated: boolean;
  source_text: string;
}

/** Visão pública (sem login) do briefing via link compartilhado. */
export interface PublicBriefingView {
  share_role: MemberRole;
  briefing: {
    title: string;
    client_name: string | null;
    briefing_type: BriefingType;
    status: BriefingStatus;
    objective: string | null;
    target_audience: string | null;
    tone: string | null;
    restrictions: string | null;
    notes: string | null;
    event_date: string | null;
    event_time: string | null;
    contacts: BriefingContact[];
    locations: BriefingLocation[];
    version: number;
  };
  sections: Array<{
    id: string;
    title: string;
    description: string | null;
    items: Array<{
      id: string;
      title: string;
      description: string | null;
      item_type: ItemType;
      priority: ItemPriority;
      is_required: boolean;
      scheduled_time: string | null;
      status: ItemStatus;
      subitems: Array<{ id: string; title: string; status: "pending" | "done" }>;
    }>;
  }>;
  deliverables: Array<{
    id: string;
    title: string;
    description: string | null;
    specs: string | null;
    quantity: number;
    due_date: string | null;
    deliver_to: string | null;
    delivery_method: string | null;
    status: DeliverableStatus;
  }>;
  links: Array<{
    id: string;
    item_id: string | null;
    deliverable_id: string | null;
    label: string;
    url: string | null;
    storage_type: StorageType;
    description: string | null;
  }>;
}

/** Uma seção no formato gerado/refinado pela IA. */
export type GeneratedSection = GeneratedBriefingStructure["sections"][number];

export type RefineMode = "detail" | "concise" | "custom";

// ─── Labels e configs de exibição ────────────────────────────────────────────

export const BRIEFING_TYPE_LABELS: Record<BriefingType, string> = {
  photography: "Fotografia",
  video: "Audiovisual",
  social_media: "Social Media",
  marketing: "Marketing",
  event: "Evento",
  other: "Outro",
};

export const BRIEFING_STATUS_CONFIG: Record<
  BriefingStatus,
  { label: string; className: string }
> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  review: {
    label: "Em revisão",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  approved: {
    label: "Aprovado",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  in_execution: {
    label: "Em execução",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  completed: {
    label: "Concluído",
    className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  },
  archived: { label: "Arquivado", className: "bg-muted text-muted-foreground" },
};

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  task: "Tarefa",
  photo: "Foto",
  video: "Vídeo",
  material: "Material",
  note: "Observação",
};

export const PRIORITY_CONFIG: Record<ItemPriority, { label: string; className: string }> = {
  low: { label: "Baixa", className: "bg-muted text-muted-foreground" },
  medium: {
    label: "Média",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  high: {
    label: "Alta",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

export const DELIVERABLE_STATUS_CONFIG: Record<
  DeliverableStatus,
  { label: string; className: string }
> = {
  pending: { label: "Pendente", className: "bg-muted text-muted-foreground" },
  in_production: {
    label: "Em produção",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  delivered: {
    label: "Entregue",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  approved: {
    label: "Aprovado",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
};

export const STORAGE_TYPE_LABELS: Record<StorageType, string> = {
  drive: "Google Drive",
  dropbox: "Dropbox",
  wetransfer: "WeTransfer",
  onedrive: "OneDrive",
  external_hd: "HD Externo",
  other: "Outro",
};

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  editor: "Editor",
  viewer: "Visualizador",
};

export const INCIDENT_SEVERITY_CONFIG: Record<
  IncidentSeverity,
  { label: string; className: string }
> = {
  low: {
    label: "Leve",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  medium: {
    label: "Média",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  high: {
    label: "Grave",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};
