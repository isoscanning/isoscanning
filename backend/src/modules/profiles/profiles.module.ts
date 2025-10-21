import { Module } from "@nestjs/common";
import { GetProfileByIdUseCase } from "./application/queries/get-profile-by-id.use-case.js";
import { SearchProfilesUseCase } from "./application/queries/search-profiles.use-case.js";
import { UpdateProfileUseCase } from "./application/commands/update-profile.use-case.js";
import { ProfilesController } from "./infrastructure/http/profiles.controller.js";
import { PROFILES_REPOSITORY } from "./profiles.di-tokens.js";
import { SupabaseProfilesRepository } from "./infrastructure/repositories/supabase-profiles.repository.js";

@Module({
  controllers: [ProfilesController],
  providers: [
    { provide: PROFILES_REPOSITORY, useClass: SupabaseProfilesRepository },
    GetProfileByIdUseCase,
    SearchProfilesUseCase,
    UpdateProfileUseCase,
  ],
  exports: [
    PROFILES_REPOSITORY,
    GetProfileByIdUseCase,
    SearchProfilesUseCase,
    UpdateProfileUseCase,
  ],
})
export class ProfilesModule {}


