import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { Profile } from "../../domain/profile.entity.js";
import { ProfilesRepository } from "../../domain/profile.repository.js";
import { PROFILES_REPOSITORY } from "../../profiles.di-tokens.js";

interface Input {
  id: string;
}

@Injectable()
export class GetProfileByIdUseCase implements UseCase<Input, Profile> {
  constructor(
    @Inject(PROFILES_REPOSITORY)
    private readonly profilesRepository: ProfilesRepository
  ) {}

  async execute({ id }: Input): Promise<Profile> {
    const profile = await this.profilesRepository.findById(id);

    if (!profile) {
      throw new NotFoundException("Profile not found");
    }

    return profile;
  }
}




