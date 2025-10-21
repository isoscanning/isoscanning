import { Expose, plainToInstance } from "class-transformer";
import { Profile } from "../../domain/profile.entity.js";

export class ProfileResponseDto {
  @Expose()
  id!: string;

  @Expose()
  userType!: string;

  @Expose()
  displayName!: string;

  @Expose()
  artisticName?: string | null;

  @Expose()
  specialty?: string | null;

  @Expose()
  description?: string | null;

  @Expose()
  city?: string | null;

  @Expose()
  state?: string | null;

  @Expose()
  phone?: string | null;

  @Expose()
  portfolioLink?: string | null;

  @Expose()
  avatarUrl?: string | null;

  @Expose()
  averageRating?: number | null;

  @Expose()
  totalReviews?: number | null;

  @Expose()
  isActive!: boolean;

  static fromEntity(entity: Profile): ProfileResponseDto {
    return plainToInstance(ProfileResponseDto, entity.toJSON(), {
      excludeExtraneousValues: true,
    });
  }
}




