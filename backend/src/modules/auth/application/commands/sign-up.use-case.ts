import {
  Inject,
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "../../../../core/constants/injection-tokens.js";
import { UseCase } from "../../../../shared/application/use-case.js";
import { SignUpDto } from "../dto/sign-up.dto.js";
import { ProfilesRepository } from "../../../profiles/domain/profile.repository.js";
import { PROFILES_REPOSITORY } from "../../../profiles/profiles.di-tokens.js";
import { Profile } from "../../../profiles/domain/profile.entity.js";
import { AuthResponseDto } from "../dto/auth-response.dto.js";
import { ProfileResponseDto } from "../../../profiles/application/dto/profile-response.dto.js";

@Injectable()
export class SignUpUseCase implements UseCase<SignUpDto, AuthResponseDto> {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
    @Inject(PROFILES_REPOSITORY)
    private readonly profilesRepository: ProfilesRepository
  ) {}

  async execute(input: SignUpDto): Promise<AuthResponseDto> {
    const { email, password, userType, displayName, phone, city, state } =
      input;

    // Check if user already exists by attempting to get the user by email
    const { data: existingUsers } = await this.supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    const userExists = existingUsers?.users?.some(
      (user) => user.email === email
    );

    if (userExists) {
      throw new ConflictException("Email already registered");
    }

    const { data: createData, error: createError } =
      await this.supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          userType,
          displayName,
        },
      });

    if (createError || !createData?.user) {
      throw new InternalServerErrorException(
        createError?.message ?? "Unable to create user"
      );
    }

    const userId = createData.user.id;

    try {
      const profile = Profile.create({
        id: userId,
        userType,
        displayName,
        artisticName: null,
        specialty: null,
        description: null,
        city: city ?? null,
        state: state ?? null,
        phone: phone ?? null,
        portfolioLink: null,
        averageRating: null,
        totalReviews: null,
        isActive: true,
      });

      await this.profilesRepository.create(profile);

      const { data: sessionData, error: sessionError } =
        await this.supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (sessionError || !sessionData.session) {
        throw new InternalServerErrorException(
          sessionError?.message ?? "Unable to create session"
        );
      }

      const { session } = sessionData;

      return {
        accessToken: session.access_token,
        refreshToken: session.refresh_token ?? "",
        expiresIn: session.expires_in ?? 3600,
        tokenType: session.token_type,
        user: ProfileResponseDto.fromEntity(profile),
      };
    } catch (error) {
      // Rollback: Delete the user from Supabase if profile creation fails
      console.error(
        "[SignUpUseCase] Profile creation failed, rolling back user creation:",
        error
      );

      try {
        await this.supabase.auth.admin.deleteUser(userId);
        console.log(
          "[SignUpUseCase] User rollback successful for userId:",
          userId
        );
      } catch (rollbackError) {
        console.error(
          "[SignUpUseCase] Failed to rollback user creation:",
          rollbackError
        );
      }

      // Re-throw the original error
      throw error;
    }
  }
}
