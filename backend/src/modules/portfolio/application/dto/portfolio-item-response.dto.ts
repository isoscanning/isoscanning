import { Expose, plainToInstance } from "class-transformer";
import { PortfolioItem } from "../../domain/portfolio-item.entity.js";

export class PortfolioItemResponseDto {
  @Expose()
  id!: string;

  @Expose()
  professionalId!: string;

  @Expose()
  title!: string;

  @Expose()
  description?: string | null;

  @Expose()
  category?: string | null;

  @Expose()
  imageUrls!: string[];

  @Expose()
  order!: number;

  static fromEntity(entity: PortfolioItem): PortfolioItemResponseDto {
    return plainToInstance(PortfolioItemResponseDto, entity.toJSON(), {
      excludeExtraneousValues: true,
    });
  }
}





