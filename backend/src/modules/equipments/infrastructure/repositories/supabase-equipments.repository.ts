import { Inject, Injectable, Logger } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "../../../../core/constants/injection-tokens.js";
import { Equipment } from "../../domain/equipment.entity.js";
import {
  EquipmentSearchFilters,
  EquipmentsRepository,
} from "../../domain/equipment.repository.js";
import { SupabaseEquipmentMapper } from "../mappers/supabase-equipment.mapper.js";

@Injectable()
export class SupabaseEquipmentsRepository implements EquipmentsRepository {
  private readonly logger = new Logger(SupabaseEquipmentsRepository.name);

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly client: SupabaseClient
  ) {}

  async create(equipment: Equipment): Promise<Equipment> {
    const payload = SupabaseEquipmentMapper.toPersistence(equipment);
    const { data, error } = await this.client
      .from("equipments")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      this.logger.error("Error creating equipment", error);
      throw error;
    }

    return SupabaseEquipmentMapper.toDomain(data as any);
  }

  async update(equipment: Equipment): Promise<Equipment> {
    const payload = SupabaseEquipmentMapper.toPersistence(equipment);
    const { data, error } = await this.client
      .from("equipments")
      .update(payload)
      .eq("id", payload.id)
      .select("*")
      .single();

    if (error) {
      this.logger.error("Error updating equipment", error);
      throw error;
    }

    return SupabaseEquipmentMapper.toDomain(data as any);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from("equipments")
      .delete()
      .eq("id", id);

    if (error) {
      this.logger.error("Error deleting equipment", error);
      throw error;
    }
  }

  async findById(id: string): Promise<Equipment | null> {
    const { data, error } = await this.client
      .from("equipments")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      this.logger.error("Error fetching equipment", error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return SupabaseEquipmentMapper.toDomain(data as any);
  }

  async search(
    filters: EquipmentSearchFilters
  ): Promise<{ data: Equipment[]; total: number }> {
    let query = this.client.from("equipments").select("*", { count: "exact" });

    if (filters.availableOnly) {
      query = query.eq("is_available", true);
    }

    if (filters.ownerId) {
      query = query.eq("owner_id", filters.ownerId);
    }

    if (filters.query) {
      query = query.or(
        `name.ilike.%${filters.query}%,category.ilike.%${filters.query}%`
      );
    }

    if (filters.category) {
      query = query.eq("category", filters.category);
    }

    if (filters.negotiationType) {
      query = query.eq("negotiation_type", filters.negotiationType);
    }

    if (filters.state) {
      query = query.eq("state", filters.state);
    }

    if (filters.city) {
      query = query.eq("city", filters.city);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(
        filters.offset ?? 0,
        (filters.offset ?? 0) + (filters.limit ?? 20) - 1
      );

    if (error) {
      this.logger.error("Error searching equipments", error);
      throw error;
    }

    return {
      data: (data ?? []).map((row) =>
        SupabaseEquipmentMapper.toDomain(row as any)
      ),
      total: count ?? 0,
    };
  }
}
