import apiClient from './api-service';

export type FinancialRecordType = 'income' | 'expense';
export type FinancialSource = 'internal' | 'external';
export type FinancialStatus = 'pending' | 'received' | 'cancelled';
export type NfStatus = 'not_applicable' | 'pending' | 'issued';
export type TaxRegime = 'mei' | 'simples' | 'other';

export const FINANCIAL_CATEGORIES = [
  'servico', 'produto', 'aluguel_equipamento',
  'equipamento', 'deslocamento', 'software', 'freelancer', 'imposto', 'aluguel', 'marketing', 'alimentacao', 'outros',
] as const;
export type FinancialCategory = (typeof FINANCIAL_CATEGORIES)[number];

export interface FinancialRecord {
  id: string;
  professionalId: string;
  type: FinancialRecordType;
  title: string;
  description: string | null;
  amount: number;
  /** AAAA-MM-DD (competência). */
  date: string;
  dueDate: string | null;
  receivedAt: string | null;
  clientName: string | null;
  category: FinancialCategory | null;
  source: FinancialSource;
  status: FinancialStatus;
  requiresNf: boolean;
  nfStatus: NfStatus;
  nfDetails: string | null;
  nfNumber: string | null;
  nfIssuedAt: string | null;
  contractId: string | null;
  recurrenceId: string | null;
  recurrenceActive: boolean;
  /** Calculado no backend: pendente com vencimento antes de hoje. */
  overdue: boolean;
  hasNfFile: boolean;
  // ─── Empresa (SQL 82) ─────────────────────────────────────────────
  /** null = financeiro pessoal; preenchido = financeiro da empresa. */
  companyId: string | null;
  projectId: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialRecordInput {
  type?: FinancialRecordType;
  title: string;
  description?: string | null;
  amount: number;
  date: string;
  dueDate?: string | null;
  receivedAt?: string | null;
  clientName?: string | null;
  category?: FinancialCategory | null;
  source: FinancialSource;
  status: FinancialStatus;
  requiresNf: boolean;
  nfStatus?: NfStatus;
  nfDetails?: string | null;
  nfNumber?: string | null;
  nfIssuedAt?: string | null;
  contractId?: string | null;
  recurring?: boolean;
  /** Empresa; ausente = pessoal. */
  companyId?: string | null;
  projectId?: string | null;
}

export type FinancialRecordPatch = Partial<FinancialRecordInput>;

export interface FinancialRecordFilters {
  companyId?: string;
  projectId?: string;
  month?: number;
  year?: number;
  type?: FinancialRecordType;
  status?: FinancialStatus;
  source?: FinancialSource;
  requiresNf?: boolean;
  nfStatus?: NfStatus;
  overdue?: boolean;
  search?: string;
  clientName?: string;
  sort?: 'date' | 'amount';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface FinanceMonthSummary {
  received: number;
  pending: number;
  overdue: number;
  overdueCount: number;
  cancelled: number;
  expensesPaid: number;
  expensesPending: number;
  nfPendingCount: number;
  nfPendingAmount: number;
  nfIssued: number;
  count: number;
}

export interface FinanceYearSummary {
  received: number;
  pending: number;
  /** Receita bruta = recebido + a receber (sem cancelados). Base do teto do MEI. */
  gross: number;
  overdue: number;
  cancelled: number;
  nfIssued: number;
  nfPendingCount: number;
  expensesPaid: number;
  expensesPending: number;
  count: number;
}

export interface FinanceMonthPoint {
  month: number;
  received: number;
  pending: number;
  expenses: number;
}

export interface FinanceClientPoint {
  client: string;
  received: number;
  pending: number;
  count: number;
}

export interface FinanceProjectPoint {
  projectId: string | null;
  received: number;
  pending: number;
  expenses: number;
  count: number;
}

export interface FinanceLimits {
  meiLimit: number;
  meiTolerance: number;
  simplesLimit: number;
  dasDueDay: number;
}

export interface FinanceSettings {
  professionalId: string;
  /** Presente quando as configurações são da empresa. */
  companyId?: string;
  taxRegime: TaxRegime;
  simplesRate: number;
  meiOpenedAt: string | null;
  dasReminder: boolean;
}

export type CompanyRole = 'admin' | 'editor' | 'viewer';

export interface FinanceDashboard {
  year: number;
  month: number;
  monthly: FinanceMonthSummary;
  annual: FinanceYearSummary;
  months: FinanceMonthPoint[];
  clients: FinanceClientPoint[];
  projects: FinanceProjectPoint[];
  firstYear: number;
  limits: FinanceLimits;
  settings: FinanceSettings;
  /** Escopo resolvido pelo backend (null = pessoal). */
  companyId: string | null;
  projectId: string | null;
  role: CompanyRole | null;
  canEdit: boolean;
}

export type BulkAction = 'mark_received' | 'mark_nf_issued' | 'cancel' | 'delete';

/** Escopo das chamadas: sem companyId = financeiro pessoal. */
export interface FinanceScopeParams {
  companyId?: string | null;
  projectId?: string | null;
}

function scopeParams(scope?: FinanceScopeParams): Record<string, string> {
  const out: Record<string, string> = {};
  if (scope?.companyId) out.companyId = scope.companyId;
  if (scope?.projectId) out.projectId = scope.projectId;
  return out;
}

export const fetchFinancialRecords = async (filters: FinancialRecordFilters = {}): Promise<FinancialRecord[]> => {
  const { data } = await apiClient.get('/finances', { params: filters });
  return data;
};

export const fetchFinancialRecord = async (id: string): Promise<FinancialRecord> => {
  const { data } = await apiClient.get(`/finances/${id}`);
  return data;
};

export const fetchFinanceDashboard = async (year: number, month: number, scope?: FinanceScopeParams): Promise<FinanceDashboard> => {
  const { data } = await apiClient.get('/finances/dashboard', { params: { year, month, ...scopeParams(scope) } });
  return data;
};

export const fetchFinanceClients = async (scope?: FinanceScopeParams): Promise<string[]> => {
  const { data } = await apiClient.get('/finances/clients', { params: scopeParams(scope) });
  return data;
};

export const fetchFinanceSettings = async (scope?: FinanceScopeParams): Promise<FinanceSettings> => {
  const { data } = await apiClient.get('/finances/settings', { params: scopeParams(scope) });
  return data;
};

export const updateFinanceSettings = async (
  patch: Partial<Omit<FinanceSettings, 'professionalId' | 'companyId'>>,
  scope?: FinanceScopeParams
): Promise<FinanceSettings> => {
  const { data } = await apiClient.put('/finances/settings', { ...patch, ...(scope?.companyId ? { companyId: scope.companyId } : {}) });
  return data;
};

export const createFinancialRecord = async (record: FinancialRecordInput): Promise<FinancialRecord> => {
  const { data } = await apiClient.post('/finances', record);
  return data;
};

export const updateFinancialRecord = async (id: string, patch: FinancialRecordPatch): Promise<FinancialRecord> => {
  const { data } = await apiClient.put(`/finances/${id}`, patch);
  return data;
};

export const deleteFinancialRecord = async (id: string): Promise<void> => {
  await apiClient.delete(`/finances/${id}`);
};

export const bulkUpdateFinancialRecords = async (
  ids: string[],
  action: BulkAction,
  scope?: FinanceScopeParams
): Promise<{ updated: number; skipped: number }> => {
  const { data } = await apiClient.post('/finances/bulk', { ids, action, ...(scope?.companyId ? { companyId: scope.companyId } : {}) });
  return data;
};

export const uploadNfFile = async (id: string, file: File): Promise<{ record: FinancialRecord; url: string }> => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post(`/finances/${id}/nf-file`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const fetchNfFileUrl = async (id: string): Promise<string | null> => {
  const { data } = await apiClient.get(`/finances/${id}/nf-file`);
  return data?.url ?? null;
};

export const deleteNfFile = async (id: string): Promise<FinancialRecord> => {
  const { data } = await apiClient.delete(`/finances/${id}/nf-file`);
  return data;
};

// ─── Empresas: cadastro, pessoas, times e projetos (SQL 82) ─────────────────

export type TeamAccess = 'none' | 'view' | 'edit';
export type ProjectStatus = 'active' | 'completed' | 'archived';
export type ProjectVisibility = 'company' | 'restricted';

export interface Company {
  id: string;
  owner_id: string;
  name: string;
  legal_name: string | null;
  cnpj: string | null;
  description: string | null;
  color: string;
  tax_regime: TaxRegime;
  simples_rate: number;
  mei_opened_at: string | null;
  das_reminder: boolean;
  /** Acesso padrão ao financeiro para membros ativos dos times da empresa. */
  team_access: TeamAccess;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceProfileSummary {
  id: string;
  display_name: string;
  avatar_url: string | null;
  username: string | null;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: CompanyRole;
  invited_by: string | null;
  created_at: string;
  profile: FinanceProfileSummary | null;
}

export interface CompanyTeamSummary {
  id: string;
  name: string;
  color: string;
  archived_at: string | null;
  members_count: number;
}

export interface CompanyListRow {
  company: Company;
  role: CompanyRole;
  teams_count: number;
}

export interface CompanyDetail {
  company: Company;
  role: CompanyRole;
  isOwner: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  members: CompanyMember[];
  /** Membros dos times da empresa ainda sem acesso nomeado (para o admin escolher). */
  team_members: FinanceProfileSummary[];
  teams: CompanyTeamSummary[];
  projects_count: number;
  records_count: number;
}

export interface FinanceProjectTotals {
  received: number;
  pending: number;
  overdue: number;
  expensesPaid: number;
  expensesPending: number;
  count: number;
}

export interface FinanceProject {
  id: string;
  company_id: string;
  team_id: string | null;
  name: string;
  description: string | null;
  client_name: string | null;
  color: string;
  status: ProjectStatus;
  budget_amount: number | null;
  planned_cost: number | null;
  start_date: string | null;
  end_date: string | null;
  job_offer_id: string | null;
  visibility: ProjectVisibility;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  totals: FinanceProjectTotals;
  members: Array<{ project_id: string; user_id: string; can_edit: boolean; profile: FinanceProfileSummary | null }>;
  can_edit: boolean;
}

export interface FinanceProjectInput {
  name: string;
  description?: string | null;
  client_name?: string | null;
  color?: string;
  status?: ProjectStatus;
  budget_amount?: number | null;
  planned_cost?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  team_id?: string | null;
  job_offer_id?: string | null;
  visibility?: ProjectVisibility;
  import_job_costs?: boolean;
}

export interface CompanyInput {
  name: string;
  legal_name?: string | null;
  cnpj?: string | null;
  description?: string | null;
  color?: string;
  tax_regime?: TaxRegime;
}

export type CompanyPatch = Partial<
  Pick<Company, 'name' | 'legal_name' | 'cnpj' | 'description' | 'color' | 'tax_regime' | 'simples_rate' | 'mei_opened_at' | 'das_reminder' | 'team_access'>
>;

/** Aba Financeiro do time: empresa do time (se houver e se o usuário puder vê-la). */
export type TeamFinanceView =
  | { company: Company; role: CompanyRole; projects: FinanceProject[] }
  | { company: null; team_company_id: string | null; can_link: boolean };

export const companiesService = {
  async listMine(): Promise<CompanyListRow[]> {
    const { data } = await apiClient.get('/companies');
    return data;
  },
  /** Empresas que o usuário administra (para ligar um time). */
  async listAdministered(): Promise<Company[]> {
    const { data } = await apiClient.get('/companies/administered');
    return data;
  },
  async create(input: CompanyInput): Promise<Company> {
    const { data } = await apiClient.post('/companies', input);
    return data;
  },
  async forTeam(teamId: string): Promise<TeamFinanceView> {
    const { data } = await apiClient.get(`/companies/by-team/${teamId}`);
    return data;
  },
  async projectForJob(jobId: string): Promise<FinanceProject | null> {
    const { data } = await apiClient.get(`/companies/by-job/${jobId}`);
    return data ?? null;
  },
  async getDetail(companyId: string): Promise<CompanyDetail> {
    const { data } = await apiClient.get(`/companies/${companyId}`);
    return data;
  },
  async update(companyId: string, patch: CompanyPatch): Promise<Company> {
    const { data } = await apiClient.patch(`/companies/${companyId}`, patch);
    return data;
  },
  async remove(companyId: string): Promise<void> {
    await apiClient.delete(`/companies/${companyId}`);
  },
  async archive(companyId: string): Promise<Company> {
    const { data } = await apiClient.post(`/companies/${companyId}/archive`);
    return data;
  },
  async unarchive(companyId: string): Promise<Company> {
    const { data } = await apiClient.post(`/companies/${companyId}/unarchive`);
    return data;
  },
  async searchCandidates(companyId: string, q: string): Promise<FinanceProfileSummary[]> {
    const { data } = await apiClient.get(`/companies/${companyId}/members/search`, { params: { q } });
    return data;
  },
  async addMember(companyId: string, userId: string, role: CompanyRole): Promise<CompanyMember> {
    const { data } = await apiClient.post(`/companies/${companyId}/members`, { user_id: userId, role });
    return data;
  },
  async updateMember(companyId: string, userId: string, role: CompanyRole): Promise<void> {
    await apiClient.patch(`/companies/${companyId}/members/${userId}`, { role });
  },
  async removeMember(companyId: string, userId: string): Promise<void> {
    await apiClient.delete(`/companies/${companyId}/members/${userId}`);
  },
  async listProjects(companyId: string): Promise<FinanceProject[]> {
    const { data } = await apiClient.get(`/companies/${companyId}/projects`);
    return data;
  },
  async createProject(companyId: string, input: FinanceProjectInput): Promise<FinanceProject> {
    const { data } = await apiClient.post(`/companies/${companyId}/projects`, input);
    return data;
  },
  async getProject(projectId: string): Promise<FinanceProject> {
    const { data } = await apiClient.get(`/companies/projects/${projectId}`);
    return data;
  },
  async updateProject(projectId: string, input: Partial<FinanceProjectInput>): Promise<FinanceProject> {
    const { data } = await apiClient.patch(`/companies/projects/${projectId}`, input);
    return data;
  },
  async deleteProject(projectId: string): Promise<void> {
    await apiClient.delete(`/companies/projects/${projectId}`);
  },
  async setProjectMember(projectId: string, userId: string, canEdit: boolean): Promise<FinanceProject> {
    const { data } = await apiClient.post(`/companies/projects/${projectId}/members`, { user_id: userId, can_edit: canEdit });
    return data;
  },
  async removeProjectMember(projectId: string, userId: string): Promise<FinanceProject> {
    const { data } = await apiClient.delete(`/companies/projects/${projectId}/members/${userId}`);
    return data;
  },
};

export const COMPANY_ROLE_LABELS: Record<CompanyRole, string> = {
  admin: 'Administrador',
  editor: 'Edita lançamentos',
  viewer: 'Só visualiza',
};

export const TEAM_ACCESS_LABELS: Record<TeamAccess, { label: string; hint: string }> = {
  none: { label: 'Ninguém dos times', hint: 'Só o dono e as pessoas nomeadas acessam o financeiro.' },
  view: { label: 'Membros dos times visualizam', hint: 'Membros ativos dos times da empresa veem os números, sem editar.' },
  edit: { label: 'Membros dos times editam', hint: 'Membros ativos dos times da empresa lançam e editam.' },
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Em andamento',
  completed: 'Concluído',
  archived: 'Arquivado',
};

export const COMPANY_COLORS = ['#0f766e', '#0ea5e9', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#eab308', '#6366f1'];

/** "12345678000199" → "12.345.678/0001-99". */
export function formatCnpj(value: string | null | undefined): string {
  const d = (value ?? '').replace(/\D/g, '');
  if (d.length !== 14) return value ?? '';
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

// ─── Escopo escolhido pelo usuário (Pessoal | Empresa X) ─────────────────────

const SCOPE_KEY = 'financeScope';

/** Empresa lembrada no navegador (null = pessoal). */
export function readSavedFinanceScope(): string | null {
  try {
    return localStorage.getItem(SCOPE_KEY);
  } catch {
    return null;
  }
}

export function saveFinanceScope(companyId: string | null): void {
  try {
    if (companyId) localStorage.setItem(SCOPE_KEY, companyId);
    else localStorage.removeItem(SCOPE_KEY);
  } catch {
    /* storage indisponível */
  }
}
