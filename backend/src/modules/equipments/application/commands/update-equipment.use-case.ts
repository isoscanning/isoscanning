import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { EquipmentsRepository } from "../../domain/equipment.repository.js";
import { EQUIPMENTS_REPOSITORY } from "../../equipments.di-tokens.js";
import { UpdateEquipmentDto } from "../dto/update-equipment.dto.js";
import { Equipment } from "../../domain/equipment.entity.js";

interface Input {
  id: string;
  payload: UpdateEquipmentDto;
  actorId: string;
}

@Injectable()
export class UpdateEquipmentUseCase implements UseCase<Input, Equipment> {
  constructor(
    @Inject(EQUIPMENTS_REPOSITORY)
    private readonly equipmentsRepository: EquipmentsRepository
  ) {}

  async execute({ id, payload, actorId }: Input): Promise<Equipment> {
    const equipment = await this.equipmentsRepository.findById(id);

    if (!equipment) {
      throw new NotFoundException("Equipment not found");
    }

    const ownerId = equipment.toJSON().ownerId as string;
    if (ownerId !== actorId) {
      throw new ForbiddenException(
        "You are not allowed to update this equipment"
      );
    }

    equipment.update(payload);

    return this.equipmentsRepository.update(equipment);
  }
}



