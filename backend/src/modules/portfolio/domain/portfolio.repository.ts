import { PortfolioItem } from "./portfolio-item.entity.js";

export interface PortfolioRepository {
  create(item: PortfolioItem): Promise<PortfolioItem>;
  update(item: PortfolioItem): Promise<PortfolioItem>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<PortfolioItem | null>;
  listByProfessional(professionalId: string): Promise<PortfolioItem[]>;
}





