import { Inject, Injectable, Logger } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "../../../../core/constants/injection-tokens.js";
import { PortfolioItem } from "../../domain/portfolio-item.entity.js";
import { PortfolioRepository } from "../../domain/portfolio.repository.js";
import { SupabasePortfolioMapper } from "../mappers/supabase-portfolio.mapper.js";

@Injectable()
export class SupabasePortfolioRepository implements PortfolioRepository {
  private readonly logger = new Logger(SupabasePortfolioRepository.name);

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly client: SupabaseClient
  ) {}

  async create(item: PortfolioItem): Promise<PortfolioItem> {
    const payload = SupabasePortfolioMapper.toPersistence(item);
    const { data, error } = await this.client
      .from("portfolio_items")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      this.logger.error("Error creating portfolio item", error);
      throw error;
    }

    return SupabasePortfolioMapper.toDomain(data as any);
  }

  async update(item: PortfolioItem): Promise<PortfolioItem> {
    const payload = SupabasePortfolioMapper.toPersistence(item);
    const { data, error } = await this.client
      .from("portfolio_items")
      .update(payload)
      .eq("id", payload.id)
      .select("*")
      .single();

    if (error) {
      this.logger.error("Error updating portfolio item", error);
      throw error;
    }

    return SupabasePortfolioMapper.toDomain(data as any);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from("portfolio_items")
      .delete()
      .eq("id", id);
    if (error) {
      this.logger.error("Error deleting portfolio item", error);
      throw error;
    }
  }

  async findById(id: string): Promise<PortfolioItem | null> {
    const { data, error } = await this.client
      .from("portfolio_items")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      this.logger.error("Error fetching portfolio item", error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return SupabasePortfolioMapper.toDomain(data as any);
  }

  async listByProfessional(professionalId: string): Promise<PortfolioItem[]> {
    const { data, error } = await this.client
      .from("portfolio_items")
      .select("*")
      .eq("professional_id", professionalId)
      .order("order", { ascending: true });

    if (error) {
      this.logger.error("Error listing portfolio items", error);
      throw error;
    }

    return (data ?? []).map((row) =>
      SupabasePortfolioMapper.toDomain(row as any)
    );
  }
}
