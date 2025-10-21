import { Inject, Injectable, Logger } from "@nestjs/common";
import { SUPABASE_CLIENT } from "../../../../core/constants/injection-tokens.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EquipmentProposal } from "../../domain/equipment-proposal.entity.js";
import {
  EquipmentProposalRepository,
  ProposalFilters,
} from "../../domain/equipment-proposal.repository.js";
import { SupabaseProposalMapper } from "../mappers/supabase-proposal.mapper.js";

@Injectable()
export class SupabaseProposalsRepository
  implements EquipmentProposalRepository
{
  private readonly logger = new Logger(SupabaseProposalsRepository.name);

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly client: SupabaseClient
  ) {}

  async create(proposal: EquipmentProposal): Promise<EquipmentProposal> {
    const payload = SupabaseProposalMapper.toPersistence(proposal);
    const { data, error } = await this.client
      .from("equipment_proposals")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      this.logger.error("Error creating proposal", error);
      throw error;
    }

    return SupabaseProposalMapper.toDomain(data as any);
  }

  async update(proposal: EquipmentProposal): Promise<EquipmentProposal> {
    const payload = SupabaseProposalMapper.toPersistence(proposal);
    const { data, error } = await this.client
      .from("equipment_proposals")
      .update(payload)
      .eq("id", payload.id)
      .select("*")
      .single();

    if (error) {
      this.logger.error("Error updating proposal", error);
      throw error;
    }

    return SupabaseProposalMapper.toDomain(data as any);
  }

  async findById(id: string): Promise<EquipmentProposal | null> {
    const { data, error } = await this.client
      .from("equipment_proposals")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      this.logger.error("Error fetching proposal", error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return SupabaseProposalMapper.toDomain(data as any);
  }

  async list(
    filters: ProposalFilters
  ): Promise<{ data: EquipmentProposal[]; total: number }> {
    let query = this.client
      .from("equipment_proposals")
      .select("*", { count: "exact" });

    if (filters.equipmentId) {
      query = query.eq("equipment_id", filters.equipmentId);
    }

    if (filters.buyerId) {
      query = query.eq("buyer_id", filters.buyerId);
    }

    if (filters.sellerId) {
      query = query.eq("seller_id", filters.sellerId);
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
      this.logger.error("Error listing proposals", error);
      throw error;
    }

    return {
      data: (data ?? []).map((row) =>
        SupabaseProposalMapper.toDomain(row as any)
      ),
      total: count ?? 0,
    };
  }
}
