import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { AvailabilityRepository } from "../../domain/availability.repository.js";
import { AVAILABILITY_REPOSITORY } from "../../availability.di-tokens.js";

interface Input {
  id: string;
  actorId: string;
}

@Injectable()
export class DeleteAvailabilityUseCase implements UseCase<Input, void> {
  constructor(
    @Inject(AVAILABILITY_REPOSITORY)
    private readonly availabilityRepository: AvailabilityRepository
  ) {}

  async execute({ id, actorId }: Input): Promise<void> {
    const slot = await this.availabilityRepository.findById(id);

    if (!slot) {
      throw new NotFoundException("Availability slot not found");
    }

    if ((slot.toJSON().professionalId as string) !== actorId) {
      throw new ForbiddenException(
        "You are not allowed to modify this availability"
      );
    }

    await this.availabilityRepository.delete(id);
  }
}



