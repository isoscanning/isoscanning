import { Inject, Injectable } from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { Profile } from "../../domain/profile.entity.js";
import {
  ProfilesRepository,
  SearchProfilesFilters,
} from "../../domain/profile.repository.js";
import { PROFILES_REPOSITORY } from "../../profiles.di-tokens.js";

interface Output {
  data: Profile[];
  total: number;
}

@Injectable()
export class SearchProfilesUseCase
  implements UseCase<SearchProfilesFilters, Output>
{
  constructor(
    @Inject(PROFILES_REPOSITORY)
    private readonly profilesRepository: ProfilesRepository
  ) {}

  async execute(filters: SearchProfilesFilters): Promise<Output> {
    return this.profilesRepository.search(filters);
  }
}




