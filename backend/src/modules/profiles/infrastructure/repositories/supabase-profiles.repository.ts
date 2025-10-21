import { Inject, Injectable, Logger } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "../../../../core/constants/injection-tokens.js";
import { Profile } from "../../domain/profile.entity.js";
import {
  ProfilesRepository,
  SearchProfilesFilters,
} from "../../domain/profile.repository.js";
import { SupabaseProfileMapper } from "../mappers/supabase-profile.mapper.js";

@Injectable()
export class SupabaseProfilesRepository implements ProfilesRepository {
  private readonly logger = new Logger(SupabaseProfilesRepository.name);

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly client: SupabaseClient
  ) {}

  async create(profile: Profile): Promise<Profile> {
    const payload = SupabaseProfileMapper.toPersistence(profile);
    const { data, error } = await this.client
      .from("profiles")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      this.logger.error("Error creating profile", error);
      throw error;
    }

    return SupabaseProfileMapper.toDomain(data as any);
  }

  async findById(id: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("*")
      .eq("id", id)
      .limit(1)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error fetching profile ${id}`, error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return SupabaseProfileMapper.toDomain(data as any);
  }

  async search(
    filters: SearchProfilesFilters
  ): Promise<{ data: Profile[]; total: number }> {
    let query = this.client
      .from("profiles")
      .select("*", { count: "exact" })
      .eq("is_active", true);

    if (filters.userType) {
      query = query.eq("user_type", filters.userType);
    }

    if (filters.query) {
      query = query.or(
        `display_name.ilike.%${filters.query}%,artistic_name.ilike.%${filters.query}%`
      );
    }

    if (filters.specialty) {
      query = query.eq("specialty", filters.specialty);
    }

    if (filters.state) {
      query = query.eq("state", filters.state);
    }

    if (filters.city) {
      query = query.eq("city", filters.city);
    }

    if (typeof filters.minRating === "number") {
      query = query.gte("average_rating", filters.minRating);
    }

    const { data, error, count } = await query
      .order("average_rating", { ascending: false, nullsFirst: true })
      .range(
        filters.offset ?? 0,
        (filters.offset ?? 0) + (filters.limit ?? 20) - 1
      );

    if (error) {
      this.logger.error("Error searching profiles", error);
      throw error;
    }

    return {
      data: (data ?? []).map((row) =>
        SupabaseProfileMapper.toDomain(row as any)
      ),
      total: count ?? 0,
    };
  }

  async update(profile: Profile): Promise<Profile> {
    const payload = SupabaseProfileMapper.toPersistence(profile);

    const { data, error } = await this.client
      .from("profiles")
      .update(payload)
      .eq("id", payload.id)
      .select("*")
      .single();

    if (error) {
      this.logger.error("Error updating profile", error);
      throw error;
    }

    return SupabaseProfileMapper.toDomain(data as any);
  }
}
