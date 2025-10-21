import { Inject, Injectable, Logger } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "../../../../core/constants/injection-tokens.js";
import { Availability } from "../../domain/availability.entity.js";
import { AvailabilityRepository } from "../../domain/availability.repository.js";
import { SupabaseAvailabilityMapper } from "../mappers/supabase-availability.mapper.js";

@Injectable()
export class SupabaseAvailabilityRepository implements AvailabilityRepository {
  private readonly logger = new Logger(SupabaseAvailabilityRepository.name);

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly client: SupabaseClient
  ) {}

  async create(slot: Availability): Promise<Availability> {
    const payload = SupabaseAvailabilityMapper.toPersistence(slot);
    const { data, error } = await this.client
      .from("availability")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      this.logger.error("Error creating availability slot", error);
      throw error;
    }

    return SupabaseAvailabilityMapper.toDomain(data as any);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from("availability")
      .delete()
      .eq("id", id);
    if (error) {
      this.logger.error("Error deleting availability slot", error);
      throw error;
    }
  }

  async findById(id: string): Promise<Availability | null> {
    const { data, error } = await this.client
      .from("availability")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      this.logger.error("Error fetching availability slot", error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return SupabaseAvailabilityMapper.toDomain(data as any);
  }

  async findByProfessional(
    professionalId: string,
    dateRange?: { from?: string; to?: string }
  ): Promise<Availability[]> {
    let query = this.client
      .from("availability")
      .select("*")
      .eq("professional_id", professionalId);

    if (dateRange?.from) {
      query = query.gte("date", dateRange.from);
    }

    if (dateRange?.to) {
      query = query.lte("date", dateRange.to);
    }

    const { data, error } = await query
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      this.logger.error("Error listing availability slots", error);
      throw error;
    }

    return (data ?? []).map((row) =>
      SupabaseAvailabilityMapper.toDomain(row as any)
    );
  }
}
