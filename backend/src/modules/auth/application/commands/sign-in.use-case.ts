import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "../../../../core/constants/injection-tokens.js";
import { UseCase } from "../../../../shared/application/use-case.js";
import { SignInDto } from "../dto/sign-in.dto.js";
import { ProfilesRepository } from "../../../profiles/domain/profile.repository.js";
import { PROFILES_REPOSITORY } from "../../../profiles/profiles.di-tokens.js";
import { AuthResponseDto } from "../dto/auth-response.dto.js";
import { Profile } from "../../../profiles/domain/profile.entity.js";
import { ProfileResponseDto } from "../../../profiles/application/dto/profile-response.dto.js";

@Injectable()
export class SignInUseCase implements UseCase<SignInDto, AuthResponseDto> {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
    @Inject(PROFILES_REPOSITORY)
    private readonly profilesRepository: ProfilesRepository
  ) {}

  async execute({ email, password }: SignInDto): Promise<AuthResponseDto> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const profile = await this.profilesRepository.findById(data.user.id);

    const profileEntity: Profile =
      profile ??
      Profile.create({
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

    if (!profile) {
      await this.profilesRepository.create(profileEntity);
    }

    const { session } = data;

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token ?? "",
      expiresIn: session.expires_in ?? 3600,
      tokenType: session.token_type,
      user: ProfileResponseDto.fromEntity(profileEntity),
    };
  }
}
