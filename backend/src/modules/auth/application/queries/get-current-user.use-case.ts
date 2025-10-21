import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "../../../../core/constants/injection-tokens.js";
import { UseCase } from "../../../../shared/application/use-case.js";
import { ProfilesRepository } from "../../../profiles/domain/profile.repository.js";
import { PROFILES_REPOSITORY } from "../../../profiles/profiles.di-tokens.js";
import { ProfileResponseDto } from "../../../profiles/application/dto/profile-response.dto.js";
import { Profile } from "../../../profiles/domain/profile.entity.js";

@Injectable()
export class GetCurrentUserUseCase
  implements UseCase<{ accessToken: string }, ProfileResponseDto>
{
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
    @Inject(PROFILES_REPOSITORY)
    private readonly profilesRepository: ProfilesRepository
  ) {}

  async execute({
    accessToken,
  }: {
    accessToken: string;
  }): Promise<ProfileResponseDto> {
    const { data, error } = await this.supabase.auth.getUser(accessToken);

    if (error || !data?.user) {
      throw new UnauthorizedException("Invalid access token");
    }

    const profile = await this.profilesRepository.findById(data.user.id);

    if (!profile) {
      const profileEntity = Profile.create({
        id: data.user.id,
        userType:
          (data.user.user_metadata?.userType as "client" | "professional") ??
          "client",
        displayName:
          data.user.user_metadata?.displayName ?? data.user.email ?? "User",
        artisticName: null,
        specialty: null,
        description: null,
        city: null,
        state: null,
        phone: null,
        portfolioLink: null,
        averageRating: null,
        totalReviews: null,
        isActive: true,
      });

      await this.profilesRepository.create(profileEntity);
      return ProfileResponseDto.fromEntity(profileEntity);
    }

    return ProfileResponseDto.fromEntity(profile);
  }
}
