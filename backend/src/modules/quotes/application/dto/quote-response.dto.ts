import { Expose, plainToInstance } from "class-transformer";
import { QuoteRequest } from "../../domain/quote-request.entity.js";

export class QuoteResponseDto {
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
  serviceDate!: string;

  @Expose()
  location!: string;

  @Expose()
  description!: string;

  @Expose()
  budget?: number | null;

  @Expose()
  status!: string;

  static fromEntity(entity: QuoteRequest): QuoteResponseDto {
    return plainToInstance(QuoteResponseDto, entity.toJSON(), {
      excludeExtraneousValues: true,
    });
  }
}





