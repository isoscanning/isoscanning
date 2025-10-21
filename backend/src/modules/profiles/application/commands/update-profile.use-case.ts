import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { Profile } from "../../domain/profile.entity.js";
import { ProfilesRepository } from "../../domain/profile.repository.js";
import { PROFILES_REPOSITORY } from "../../profiles.di-tokens.js";
import { UpdateProfileDto } from "../dto/update-profile.dto.js";

interface Input {
  id: string;
  payload: UpdateProfileDto;
}

@Injectable()
export class UpdateProfileUseCase implements UseCase<Input, Profile> {
  constructor(
    @Inject(PROFILES_REPOSITORY)
    private readonly profilesRepository: ProfilesRepository
  ) {}

  async execute({ id, payload }: Input): Promise<Profile> {
    const profile = await this.profilesRepository.findById(id);

    if (!profile) {
      throw new NotFoundException("Profile not found");
    }

    profile.update(payload);

    return this.profilesRepository.update(profile);
  }
}




