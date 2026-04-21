import apiClient from './api-service';

export interface FinancialRecord {
  id: string;
  professionalId: string;
  title: string;
  description: string | null;
  amount: number;
  date: string;
  source: 'internal' | 'external';
  status: 'pending' | 'received' | 'cancelled';
  requiresNf: boolean;
  nfStatus: 'not_applicable' | 'pending' | 'issued';
  nfDetails: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialSummary {
  monthlyRevenue: number;
  pendingToReceive: number;
  totalInvoiced: number;
  pendingNfCount: number;
}

export interface AnnualSummary {
  totalAnnualInvoiced: number;
  meiNfIssuedAmount: number;
  meiLimitRemaining: number;
}

export const fetchFinancialRecords = async (filters: { month?: number, year?: number, requiresNf?: boolean, nfStatus?: string }): Promise<FinancialRecord[]> => {
  const { data } = await apiClient.get('/finances', { params: filters });
  return data;
};

export const fetchFinancialSummary = async (month: number, year: number): Promise<FinancialSummary> => {
  const { data } = await apiClient.get('/finances/summary', { params: { month, year } });
  return data;
};

export const createFinancialRecord = async (record: Partial<FinancialRecord>): Promise<FinancialRecord> => {
  const { data } = await apiClient.post('/finances', record);
  return data;
};

export const updateFinancialRecord = async (id: string, record: Partial<FinancialRecord>): Promise<FinancialRecord> => {
  const { data } = await apiClient.put(`/finances/${id}`, record);
  return data;
};

export const deleteFinancialRecord = async (id: string): Promise<void> => {
  await apiClient.delete(`/finances/${id}`);
};

export const fetchAnnualSummary = async (year: number): Promise<AnnualSummary> => {
  const { data } = await apiClient.get('/finances/annual-summary', { params: { year } });
  return data;
};
