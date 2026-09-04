/**
 * ESPELHO de `isoscanning-backend/src/modules/notifications/domain/notification-links.ts`.
 *
 * O sino navega para a mesma URL que o push (FCM/WhatsApp) abre. Alterou lá?
 * Altere aqui. Tipos desconhecidos (backend mais novo que o front) caem em
 * `/dashboard` em vez de não fazer nada.
 */

export const NOTIFICATION_TYPES = [
  "job_match",
  "equipment_match",
  "review_received",
  "system",
  "post_review_needed",
  "post_approved",
  "post_rejected",
  "post_comment",
  "post_published",
  "team_invite",
  "billing_confirmed",
  "billing_overdue",
  "billing_cancelled",
  "trial_ending",
  "subscription_expired",
  "referral_signup",
  "referral_reward",
  "referral_discount_applied",
  "referral_bonus_applied",
  "application_received",
  "application_status",
  "job_offer_status",
  "proposal_received",
  "proposal_status",
  "booking_created",
  "booking_status",
  "quote_received",
  "quote_status",
  "budget_proposal_approved",
  "budget_proposal_rejected",
  "negotiation_candidate",
  "negotiation_employer",
  "contract_received",
  "contract_signed",
  "contract_rejected",
  "contract_cancelled",
  "contract_completed",
  "contract_expired",
  "contract_reminder",
  "contract_terminated",
  "review_request",
  "community_comment",
  "community_reply",
  "community_like",
  "briefing_day_before",
  "briefing_confirm_reminder",
  "briefing_deliverable_due",
  "briefing_invite",
  "briefing_comment",
  "briefing_item_assigned",
  "briefing_approval_requested",
  "briefing_approved",
  "briefing_new_version",
  "briefing_completed",
  "briefing_archived",
  "briefing_member_removed",
  "briefing_execution_started",
  "briefing_incident",
  "finance_record_created",
  "finance_recurring_created",
  "finance_overdue",
  "finance_nf_pending",
  "finance_das_due",
  "finance_dasn_due",
  "finance_mei_threshold",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

type Resolver = (referenceId?: string | null) => string;

function smPostUrl(ref?: string | null): string {
  if (!ref) return "/dashboard/social-media";
  const [scheduleId, postId] = ref.split("|");
  return postId ? `/dashboard/social-media/${scheduleId}?post=${postId}` : `/dashboard/social-media/${scheduleId}`;
}
const contractUrl: Resolver = (id) => (id ? `/dashboard/contratos/${id}` : "/dashboard/contratos");
const briefingUrl: Resolver = (id) => (id ? `/dashboard/briefing-pro/${id}` : "/dashboard/briefing-pro");
const briefingExecUrl: Resolver = (id) => (id ? `/dashboard/briefing-pro/${id}/execucao` : "/dashboard/briefing-pro");
const candidaturaUrl: Resolver = (id) => (id ? `/dashboard/candidaturas?candidatura=${id}` : "/dashboard/candidaturas");
const communityUrl: Resolver = (ref) => (ref ? `/c/${ref}` : "/comunidade");
const financeRecordUrl: Resolver = (id) => (id ? `/dashboard/financeiro?lancamento=${id}` : "/dashboard/financeiro");
const budgetQuoteUrl: Resolver = (id) =>
  id ? `/dashboard/calculadora-orcamento/orcamentos/${id}` : "/dashboard/calculadora-orcamento";

const CLICK_URLS: Record<NotificationType, Resolver> = {
  job_match: (id) => (id ? `/vagas/${id}` : "/vagas"),
  equipment_match: (id) => (id ? `/equipamentos/${id}` : "/equipamentos"),
  review_received: () => "/dashboard/avaliacoes",
  system: () => "/dashboard",

  post_review_needed: smPostUrl,
  post_approved: smPostUrl,
  post_rejected: smPostUrl,
  post_comment: smPostUrl,
  post_published: smPostUrl,
  team_invite: (ref) => (ref ? `/dashboard/social-media/${ref}/team` : "/dashboard/social-media"),

  billing_confirmed: () => "/dashboard/assinatura",
  billing_overdue: () => "/dashboard/assinatura",
  billing_cancelled: () => "/dashboard/assinatura",
  trial_ending: () => "/precos",
  subscription_expired: () => "/precos",

  referral_signup: () => "/dashboard/indicacoes",
  referral_reward: () => "/dashboard/indicacoes",
  referral_discount_applied: () => "/dashboard/assinatura",
  referral_bonus_applied: () => "/dashboard/assinatura",

  application_received: (id) => (id ? `/dashboard/vagas/${id}/candidatos` : "/dashboard/vagas"),
  application_status: candidaturaUrl,
  job_offer_status: candidaturaUrl,

  proposal_received: () => "/dashboard/propostas?tab=received",
  proposal_status: () => "/dashboard/propostas?tab=sent",

  booking_created: () => "/dashboard/solicitacoes?tab=agendamentos",
  booking_status: () => "/dashboard/solicitacoes?tab=agendamentos",
  quote_received: () => "/dashboard/solicitacoes?tab=recebidos",
  quote_status: () => "/dashboard/solicitacoes?tab=orcamentos",

  budget_proposal_approved: budgetQuoteUrl,
  budget_proposal_rejected: budgetQuoteUrl,

  negotiation_candidate: candidaturaUrl,
  negotiation_employer: (ref) => {
    if (!ref) return "/dashboard/vagas";
    const [jobOfferId, applicationId] = ref.split(":");
    return `/dashboard/vagas/${jobOfferId}/candidatos${applicationId ? `?candidatura=${applicationId}` : ""}`;
  },

  contract_received: contractUrl,
  contract_signed: contractUrl,
  contract_rejected: contractUrl,
  contract_cancelled: contractUrl,
  contract_completed: contractUrl,
  contract_expired: contractUrl,
  contract_reminder: contractUrl,
  contract_terminated: contractUrl,
  review_request: (ref) => {
    if (!ref) return "/dashboard/contratos";
    const [professionalId, contractId] = ref.split(":");
    return `/profissionais/${professionalId}?avaliar=1${contractId ? `&contrato=${contractId}` : ""}`;
  },

  community_comment: communityUrl,
  community_reply: communityUrl,
  community_like: communityUrl,

  briefing_day_before: briefingUrl,
  briefing_confirm_reminder: briefingUrl,
  briefing_deliverable_due: briefingUrl,
  briefing_invite: briefingUrl,
  briefing_comment: briefingUrl,
  briefing_item_assigned: briefingUrl,
  briefing_approval_requested: briefingUrl,
  briefing_approved: briefingUrl,
  briefing_new_version: briefingUrl,
  briefing_completed: briefingUrl,
  briefing_archived: briefingUrl,
  briefing_member_removed: () => "/dashboard/briefing-pro",
  briefing_execution_started: briefingExecUrl,
  briefing_incident: briefingExecUrl,

  finance_record_created: financeRecordUrl,
  finance_recurring_created: financeRecordUrl,
  finance_overdue: () => "/dashboard/financeiro?filtro=vencidos",
  finance_nf_pending: () => "/dashboard/financeiro?filtro=nf",
  finance_das_due: () => "/dashboard/financeiro?painel=anual",
  finance_dasn_due: () => "/dashboard/financeiro?painel=anual",
  finance_mei_threshold: () => "/dashboard/financeiro?painel=anual",
};

export function notificationClickUrl(type: string, referenceId?: string | null): string {
  const resolver = CLICK_URLS[type as NotificationType] ?? CLICK_URLS.system;
  return resolver(referenceId);
}

/** Tom visual do toast/ícone: bom (verde), neutro (azul), atenção (âmbar), ruim (vermelho). */
export type NotificationTone = "success" | "info" | "warning" | "error";

export interface NotificationMeta {
  /** Título curto do toast em tempo real (o título da notificação vira descrição). */
  toast: string;
  tone: NotificationTone;
  /** Agrupador exibido como filtro na página de histórico. */
  group: "trabalho" | "contratos" | "financeiro" | "caixa" | "social" | "briefing" | "comunidade" | "sistema";
}

export const NOTIFICATION_META: Record<NotificationType, NotificationMeta> = {
  job_match: { toast: "Uma vaga deu match com você!", tone: "info", group: "trabalho" },
  equipment_match: { toast: "Equipamento encontrado!", tone: "info", group: "trabalho" },
  review_received: { toast: "Nova avaliação recebida!", tone: "success", group: "trabalho" },
  system: { toast: "Aviso da plataforma", tone: "info", group: "sistema" },

  post_review_needed: { toast: "Post aguarda aprovação", tone: "warning", group: "social" },
  post_approved: { toast: "Post aprovado ✓", tone: "success", group: "social" },
  post_rejected: { toast: "Post rejeitado", tone: "error", group: "social" },
  post_comment: { toast: "Novo comentário no post", tone: "info", group: "social" },
  post_published: { toast: "Post publicado!", tone: "success", group: "social" },
  team_invite: { toast: "Você foi convidado para um cronograma", tone: "info", group: "social" },

  billing_confirmed: { toast: "Pagamento confirmado!", tone: "success", group: "financeiro" },
  billing_overdue: { toast: "Atenção: fatura em atraso", tone: "error", group: "financeiro" },
  billing_cancelled: { toast: "Assinatura encerrada", tone: "warning", group: "financeiro" },
  trial_ending: { toast: "Seu teste do Pro está acabando", tone: "warning", group: "financeiro" },
  subscription_expired: { toast: "Sua assinatura venceu", tone: "error", group: "financeiro" },

  referral_signup: { toast: "Alguém entrou com o seu código!", tone: "success", group: "financeiro" },
  referral_reward: { toast: "Você ganhou desconto por indicação!", tone: "success", group: "financeiro" },
  referral_discount_applied: { toast: "Desconto aplicado na fatura", tone: "success", group: "financeiro" },
  referral_bonus_applied: { toast: "Bônus de indicação aplicado", tone: "success", group: "financeiro" },

  application_received: { toast: "Novidade nas candidaturas da sua vaga", tone: "info", group: "trabalho" },
  application_status: { toast: "Atualização da sua candidatura", tone: "info", group: "trabalho" },
  job_offer_status: { toast: "A vaga mudou de situação", tone: "warning", group: "trabalho" },
  proposal_received: { toast: "Nova proposta recebida!", tone: "info", group: "trabalho" },
  proposal_status: { toast: "Atualização da sua proposta", tone: "info", group: "trabalho" },
  booking_created: { toast: "Nova solicitação de agendamento!", tone: "info", group: "trabalho" },
  booking_status: { toast: "Atualização de agendamento", tone: "info", group: "trabalho" },
  quote_received: { toast: "Novo pedido de orçamento!", tone: "info", group: "trabalho" },
  quote_status: { toast: "Atualização do seu orçamento", tone: "info", group: "trabalho" },
  budget_proposal_approved: { toast: "Proposta aprovada pelo cliente! 🎉", tone: "success", group: "trabalho" },
  budget_proposal_rejected: { toast: "Proposta recusada pelo cliente", tone: "warning", group: "trabalho" },
  negotiation_candidate: { toast: "Novidade na sua negociação", tone: "info", group: "trabalho" },
  negotiation_employer: { toast: "Novidade na negociação da vaga", tone: "info", group: "trabalho" },

  contract_received: { toast: "Contrato recebido para assinatura", tone: "warning", group: "contratos" },
  contract_signed: { toast: "Contrato assinado", tone: "success", group: "contratos" },
  contract_rejected: { toast: "Contrato recusado", tone: "error", group: "contratos" },
  contract_cancelled: { toast: "Contrato cancelado", tone: "warning", group: "contratos" },
  contract_completed: { toast: "Serviço concluído", tone: "success", group: "contratos" },
  contract_expired: { toast: "Prazo de assinatura vencido", tone: "error", group: "contratos" },
  contract_reminder: { toast: "Assinatura pendente", tone: "warning", group: "contratos" },
  contract_terminated: { toast: "Contrato encerrado (distrato)", tone: "warning", group: "contratos" },
  review_request: { toast: "Avalie o profissional", tone: "info", group: "contratos" },

  community_comment: { toast: "Novo comentário no seu post", tone: "info", group: "comunidade" },
  community_reply: { toast: "Responderam seu comentário", tone: "info", group: "comunidade" },
  community_like: { toast: "Curtiram sua publicação", tone: "success", group: "comunidade" },

  briefing_day_before: { toast: "Amanhã é dia de execução!", tone: "warning", group: "briefing" },
  briefing_confirm_reminder: { toast: "Confirme a leitura do briefing", tone: "warning", group: "briefing" },
  briefing_deliverable_due: { toast: "Entregável vence amanhã", tone: "warning", group: "briefing" },
  briefing_invite: { toast: "Você entrou em um briefing!", tone: "info", group: "briefing" },
  briefing_comment: { toast: "Novo comentário no briefing", tone: "info", group: "briefing" },
  briefing_item_assigned: { toast: "Item atribuído a você", tone: "info", group: "briefing" },
  briefing_approval_requested: { toast: "Briefing aguardando aprovação", tone: "warning", group: "briefing" },
  briefing_approved: { toast: "Briefing aprovado ✓", tone: "success", group: "briefing" },
  briefing_new_version: { toast: "Briefing atualizado — confirme a leitura", tone: "warning", group: "briefing" },
  briefing_completed: { toast: "Briefing concluído ✓", tone: "success", group: "briefing" },
  briefing_archived: { toast: "Briefing arquivado", tone: "info", group: "briefing" },
  briefing_member_removed: { toast: "Você saiu de um briefing", tone: "warning", group: "briefing" },
  briefing_execution_started: { toast: "Execução iniciada!", tone: "info", group: "briefing" },
  briefing_incident: { toast: "Intercorrência registrada", tone: "error", group: "briefing" },

  finance_record_created: { toast: "Contrato entrou no seu financeiro", tone: "success", group: "caixa" },
  finance_recurring_created: { toast: "Lançamento do mês criado", tone: "info", group: "caixa" },
  finance_overdue: { toast: "Recebimento vencido", tone: "error", group: "caixa" },
  finance_nf_pending: { toast: "Nota fiscal a emitir", tone: "warning", group: "caixa" },
  finance_das_due: { toast: "DAS do MEI vence em breve", tone: "warning", group: "caixa" },
  finance_dasn_due: { toast: "Declaração anual do MEI", tone: "warning", group: "caixa" },
  finance_mei_threshold: { toast: "Atenção ao teto do MEI", tone: "warning", group: "caixa" },
};

export function notificationMeta(type: string): NotificationMeta {
  return NOTIFICATION_META[type as NotificationType] ?? { toast: "Nova notificação", tone: "info", group: "sistema" };
}

export const NOTIFICATION_GROUP_LABELS: Record<NotificationMeta["group"], string> = {
  trabalho: "Trabalho",
  contratos: "Contratos",
  financeiro: "Plano e pagamentos",
  caixa: "Financeiro",
  social: "Social media",
  briefing: "Briefing",
  comunidade: "Comunidade",
  sistema: "Sistema",
};
