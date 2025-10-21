import { QuoteRequest, QuoteStatus } from "./quote-request.entity.js";

export interface QuoteFilters {
  professionalId?: string;
  clientId?: string;
  status?: QuoteStatus;
  limit?: number;
  offset?: number;
}

export interface QuoteRequestRepository {
  create(quote: QuoteRequest): Promise<QuoteRequest>;
  update(quote: QuoteRequest): Promise<QuoteRequest>;
  findById(id: string): Promise<QuoteRequest | null>;
  list(filters: QuoteFilters): Promise<{ data: QuoteRequest[]; total: number }>;
}





