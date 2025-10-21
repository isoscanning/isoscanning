import { Expose, plainToInstance } from "class-transformer";
import { Review } from "../../domain/review.entity.js";

export class ReviewResponseDto {
  @Expose()
  id!: string;

  @Expose()
  professionalId!: string;

  @Expose()
  bookingId!: string;

  @Expose()
  clientId!: string;

  @Expose()
  clientName!: string;

  @Expose()
  rating!: number;

  @Expose()
  comment!: string;

  @Expose()
  createdAt!: Date;

  static fromEntity(entity: Review): ReviewResponseDto {
    return plainToInstance(ReviewResponseDto, entity.toJSON(), {
      excludeExtraneousValues: true,
    });
  }
}





