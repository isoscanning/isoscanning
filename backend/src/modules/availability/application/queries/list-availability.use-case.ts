import { Inject, Injectable } from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { Availability } from "../../domain/availability.entity.js";
import { AvailabilityRepository } from "../../domain/availability.repository.js";
import { AVAILABILITY_REPOSITORY } from "../../availability.di-tokens.js";

interface Input {
  professionalId: string;
  from?: string;
  to?: string;
}

@Injectable()
export class ListAvailabilityUseCase implements UseCase<Input, Availability[]> {
  constructor(
    @Inject(AVAILABILITY_REPOSITORY)
    private readonly availabilityRepository: AvailabilityRepository
  ) {}

  async execute({ professionalId, from, to }: Input): Promise<Availability[]> {
    return this.availabilityRepository.findByProfessional(professionalId, {
      from,
      to,
    });
  }
}





