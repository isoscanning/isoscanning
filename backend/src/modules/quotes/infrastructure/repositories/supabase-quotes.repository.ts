import { Inject, Injectable, Logger } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "../../../../core/constants/injection-tokens.js";
import { QuoteRequest } from "../../domain/quote-request.entity.js";
import {
  QuoteFilters,
  QuoteRequestRepository,
} from "../../domain/quote-request.repository.js";
import { SupabaseQuoteMapper } from "../mappers/supabase-quote.mapper.js";

@Injectable()
export class SupabaseQuotesRepository implements QuoteRequestRepository {
  private readonly logger = new Logger(SupabaseQuotesRepository.name);

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly client: SupabaseClient
  ) {}

  async create(quote: QuoteRequest): Promise<QuoteRequest> {
    const payload = SupabaseQuoteMapper.toPersistence(quote);
    const { data, error } = await this.client
      .from("quote_requests")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      this.logger.error("Error creating quote request", error);
      throw error;
    }

    return SupabaseQuoteMapper.toDomain(data as any);
  }

  async update(quote: QuoteRequest): Promise<QuoteRequest> {
    const payload = SupabaseQuoteMapper.toPersistence(quote);
    const { data, error } = await this.client
      .from("quote_requests")
      .update(payload)
      .eq("id", payload.id)
      .select("*")
      .single();

    if (error) {
      this.logger.error("Error updating quote request", error);
      throw error;
    }

    return SupabaseQuoteMapper.toDomain(data as any);
  }

  async findById(id: string): Promise<QuoteRequest | null> {
    const { data, error } = await this.client
      .from("quote_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      this.logger.error("Error fetching quote request", error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return SupabaseQuoteMapper.toDomain(data as any);
  }

  async list(
    filters: QuoteFilters
  ): Promise<{ data: QuoteRequest[]; total: number }> {
    let query = this.client
      .from("quote_requests")
      .select("*", { count: "exact" });

    if (filters.professionalId) {
      query = query.eq("professional_id", filters.professionalId);
    }

    if (filters.clientId) {
      query = query.eq("client_id", filters.clientId);
    }

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(
        filters.offset ?? 0,
        (filters.offset ?? 0) + (filters.limit ?? 20) - 1
      );

    if (error) {
      this.logger.error("Error listing quote requests", error);
      throw error;
    }

    return {
      data: (data ?? []).map((row) => SupabaseQuoteMapper.toDomain(row as any)),
      total: count ?? 0,
    };
  }
}
