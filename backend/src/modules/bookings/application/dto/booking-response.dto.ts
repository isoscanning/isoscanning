import { Expose, plainToInstance } from "class-transformer";
import { Booking } from "../../domain/booking.entity.js";

export class BookingResponseDto {
  @Expose()
  id!: string;

  @Expose()
  professionalId!: string;

  @Expose()
  professionalName!: string;

  @Expose()
  clientId!: string;

  @Expose()
  clientName!: string;

  @Expose()
  clientEmail!: string;

  @Expose()
  serviceType!: string;

  @Expose()
  location!: string;

  @Expose()
  notes?: string | null;

  @Expose()
  date!: string;

  @Expose()
  startTime!: string;

  @Expose()
  status!: string;

  static fromEntity(entity: Booking): BookingResponseDto {
    return plainToInstance(BookingResponseDto, entity.toJSON(), {
      excludeExtraneousValues: true,
    });
  }
}





