import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { EquipmentsRepository } from "../../domain/equipment.repository.js";
import { EQUIPMENTS_REPOSITORY } from "../../equipments.di-tokens.js";

interface Input {
  id: string;
  actorId: string;
}

@Injectable()
export class DeleteEquipmentUseCase implements UseCase<Input, void> {
  constructor(
    @Inject(EQUIPMENTS_REPOSITORY)
    private readonly equipmentsRepository: EquipmentsRepository
  ) {}

  async execute({ id, actorId }: Input): Promise<void> {
    const equipment = await this.equipmentsRepository.findById(id);

    if (!equipment) {
      throw new NotFoundException("Equipment not found");
    }

    const ownerId = equipment.toJSON().ownerId as string;
    if (ownerId !== actorId) {
      throw new ForbiddenException(
        "You are not allowed to delete this equipment"
      );
    }

    await this.equipmentsRepository.delete(id);
  }
}



