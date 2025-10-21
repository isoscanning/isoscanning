import { Inject, Injectable, Logger } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "../../../../core/constants/injection-tokens.js";
import { Review } from "../../domain/review.entity.js";
import {
  ReviewFilters,
  ReviewsRepository,
} from "../../domain/review.repository.js";
import { SupabaseReviewMapper } from "../mappers/supabase-review.mapper.js";

@Injectable()
export class SupabaseReviewsRepository implements ReviewsRepository {
  private readonly logger = new Logger(SupabaseReviewsRepository.name);

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly client: SupabaseClient
  ) {}

  async create(review: Review): Promise<Review> {
    const payload = SupabaseReviewMapper.toPersistence(review);
    const { data, error } = await this.client
      .from("reviews")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      this.logger.error("Error creating review", error);
      throw error;
    }

    return SupabaseReviewMapper.toDomain(data as any);
  }

  async findByBooking(bookingId: string): Promise<Review | null> {
    const { data, error } = await this.client
      .from("reviews")
      .select("*")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (error) {
      this.logger.error("Error fetching review", error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return SupabaseReviewMapper.toDomain(data as any);
  }

  async list(
    filters: ReviewFilters
  ): Promise<{ data: Review[]; total: number }> {
    let query = this.client.from("reviews").select("*", { count: "exact" });

    if (filters.professionalId) {
      query = query.eq("professional_id", filters.professionalId);
    }

    if (filters.bookingId) {
      query = query.eq("booking_id", filters.bookingId);
    }

    if (filters.clientId) {
      query = query.eq("client_id", filters.clientId);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(
        filters.offset ?? 0,
        (filters.offset ?? 0) + (filters.limit ?? 20) - 1
      );

    if (error) {
      this.logger.error("Error listing reviews", error);
      throw error;
    }

    return {
      data: (data ?? []).map((row) =>
        SupabaseReviewMapper.toDomain(row as any)
      ),
      total: count ?? 0,
    };
  }
}
