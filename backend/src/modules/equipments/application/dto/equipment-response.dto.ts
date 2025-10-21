import { Expose, plainToInstance } from "class-transformer";
import { Equipment } from "../../domain/equipment.entity.js";

export class EquipmentResponseDto {
  @Expose()
  id!: string;

  @Expose()
  ownerId!: string;

  @Expose()
  ownerName!: string;

  @Expose()
  name!: string;

  @Expose()
  category!: string;

  @Expose()
  negotiationType!: string;

  @Expose()
  condition!: string;

  @Expose()
  description?: string | null;

  @Expose()
  brand?: string | null;

  @Expose()
  model?: string | null;

  @Expose()
  price?: number | null;

  @Expose()
  rentPeriod?: string | null;

  @Expose()
  city!: string;

  @Expose()
  state!: string;

  @Expose()
  additionalConditions?: string | null;

  @Expose()
  imageUrls!: string[];

  @Expose()
  isAvailable!: boolean;

  static fromEntity(entity: Equipment): EquipmentResponseDto {
    return plainToInstance(EquipmentResponseDto, entity.toJSON(), {
      excludeExtraneousValues: true,
    });
  }
}





