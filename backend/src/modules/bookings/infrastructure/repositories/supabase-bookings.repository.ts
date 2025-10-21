import { Inject, Injectable, Logger } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "../../../../core/constants/injection-tokens.js";
import { Booking } from "../../domain/booking.entity.js";
import {
  BookingFilters,
  BookingsRepository,
} from "../../domain/booking.repository.js";
import { SupabaseBookingMapper } from "../mappers/supabase-booking.mapper.js";

@Injectable()
export class SupabaseBookingsRepository implements BookingsRepository {
  private readonly logger = new Logger(SupabaseBookingsRepository.name);

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly client: SupabaseClient
  ) {}

  async create(booking: Booking): Promise<Booking> {
    const payload = SupabaseBookingMapper.toPersistence(booking);
    const { data, error } = await this.client
      .from("bookings")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      this.logger.error("Error creating booking", error);
      throw error;
    }

    return SupabaseBookingMapper.toDomain(data as any);
  }

  async update(booking: Booking): Promise<Booking> {
    const payload = SupabaseBookingMapper.toPersistence(booking);
    const { data, error } = await this.client
      .from("bookings")
      .update(payload)
      .eq("id", payload.id)
      .select("*")
      .single();

    if (error) {
      this.logger.error("Error updating booking", error);
      throw error;
    }

    return SupabaseBookingMapper.toDomain(data as any);
  }

  async findById(id: string): Promise<Booking | null> {
    const { data, error } = await this.client
      .from("bookings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      this.logger.error("Error fetching booking", error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return SupabaseBookingMapper.toDomain(data as any);
  }

  async list(
    filters: BookingFilters
  ): Promise<{ data: Booking[]; total: number }> {
    let query = this.client.from("bookings").select("*", { count: "exact" });

    if (filters.professionalId) {
      query = query.eq("professional_id", filters.professionalId);
    }

    if (filters.clientId) {
      query = query.eq("client_id", filters.clientId);
    }

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.from) {
      query = query.gte("date", filters.from);
    }

    if (filters.to) {
      query = query.lte("date", filters.to);
    }

    const { data, error, count } = await query
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
      .range(
        filters.offset ?? 0,
        (filters.offset ?? 0) + (filters.limit ?? 20) - 1
      );

    if (error) {
      this.logger.error("Error listing bookings", error);
      throw error;
    }

    return {
      data: (data ?? []).map((row) =>
        SupabaseBookingMapper.toDomain(row as any)
      ),
      total: count ?? 0,
    };
  }
}
