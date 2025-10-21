import { Inject, Injectable, ForbiddenException } from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { Availability } from "../../domain/availability.entity.js";
import { AvailabilityRepository } from "../../domain/availability.repository.js";
import { AVAILABILITY_REPOSITORY } from "../../availability.di-tokens.js";
import { CreateAvailabilityDto } from "../dto/create-availability.dto.js";

interface Input extends CreateAvailabilityDto {
  actorId: string;
}

@Injectable()
export class CreateAvailabilityUseCase implements UseCase<Input, Availability> {
  constructor(
    @Inject(AVAILABILITY_REPOSITORY)
    private readonly availabilityRepository: AvailabilityRepository
  ) {}

  async execute(input: Input): Promise<Availability> {
    if (input.professionalId !== input.actorId) {
      throw new ForbiddenException(
        "You are not allowed to modify this availability"
      );
    }

    const availability = Availability.create({
      professionalId: input.professionalId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      type: input.type,
      reason: input.reason ?? null,
    });

    return this.availabilityRepository.create(availability);
  }
}



