import { Expose, plainToInstance } from "class-transformer";
import { Availability } from "../../domain/availability.entity.js";

export class AvailabilityResponseDto {
  @Expose()
  id!: string;

  @Expose()
  professionalId!: string;

  @Expose()
  date!: string;

  @Expose()
  startTime!: string;

  @Expose()
  endTime!: string;

  @Expose()
  type!: string;

  @Expose()
  reason?: string | null;

  static fromEntity(entity: Availability): AvailabilityResponseDto {
    return plainToInstance(AvailabilityResponseDto, entity.toJSON(), {
      excludeExtraneousValues: true,
    });
  }
}





