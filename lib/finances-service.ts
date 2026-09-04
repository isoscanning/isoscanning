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
}

export type FinancialRecordPatch = Partial<FinancialRecordInput>;

export interface FinancialRecordFilters {
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

export interface FinanceLimits {
  meiLimit: number;
  meiTolerance: number;
  simplesLimit: number;
  dasDueDay: number;
}

export interface FinanceSettings {
  professionalId: string;
  taxRegime: TaxRegime;
  simplesRate: number;
  meiOpenedAt: string | null;
  dasReminder: boolean;
}

export interface FinanceDashboard {
  year: number;
  month: number;
  monthly: FinanceMonthSummary;
  annual: FinanceYearSummary;
  months: FinanceMonthPoint[];
  clients: FinanceClientPoint[];
  firstYear: number;
  limits: FinanceLimits;
  settings: FinanceSettings;
}

export type BulkAction = 'mark_received' | 'mark_nf_issued' | 'cancel' | 'delete';

export const fetchFinancialRecords = async (filters: FinancialRecordFilters = {}): Promise<FinancialRecord[]> => {
  const { data } = await apiClient.get('/finances', { params: filters });
  return data;
};

export const fetchFinancialRecord = async (id: string): Promise<FinancialRecord> => {
  const { data } = await apiClient.get(`/finances/${id}`);
  return data;
};

export const fetchFinanceDashboard = async (year: number, month: number): Promise<FinanceDashboard> => {
  const { data } = await apiClient.get('/finances/dashboard', { params: { year, month } });
  return data;
};

export const fetchFinanceClients = async (): Promise<string[]> => {
  const { data } = await apiClient.get('/finances/clients');
  return data;
};

export const fetchFinanceSettings = async (): Promise<FinanceSettings> => {
  const { data } = await apiClient.get('/finances/settings');
  return data;
};

export const updateFinanceSettings = async (patch: Partial<Omit<FinanceSettings, 'professionalId'>>): Promise<FinanceSettings> => {
  const { data } = await apiClient.put('/finances/settings', patch);
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

export const bulkUpdateFinancialRecords = async (ids: string[], action: BulkAction): Promise<{ updated: number; skipped: number }> => {
  const { data } = await apiClient.post('/finances/bulk', { ids, action });
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
