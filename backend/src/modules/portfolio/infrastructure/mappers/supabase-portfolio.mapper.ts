import {
  PortfolioItem,
  PortfolioItemProps,
} from "../../domain/portfolio-item.entity.js";

export interface PortfolioRow {
  id: string;
  professional_id: string;
  title: string;
  description: string | null;
  category: string | null;
  image_urls: string[] | null;
  order: number;
  created_at: string;
  updated_at: string | null;
}

export class SupabasePortfolioMapper {
  static toDomain(row: PortfolioRow): PortfolioItem {
    const props: PortfolioItemProps & {
      id: string;
      createdAt: Date;
      updatedAt?: Date;
    } = {
      id: row.id,
      professionalId: row.professional_id,
      title: row.title,
      description: row.description,
      category: row.category,
      imageUrls: row.image_urls ?? [],
      order: row.order,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };

    return PortfolioItem.create(props);
  }

  static toPersistence(item: PortfolioItem) {
    const json = item.toJSON();
    return {
      id: json.id as string,
      professional_id: json.professionalId,
      title: json.title,
      description: json.description ?? null,
      category: json.category ?? null,
      image_urls: json.imageUrls ?? [],
      order: json.order,
      updated_at: new Date().toISOString(),
    };
  }
}
