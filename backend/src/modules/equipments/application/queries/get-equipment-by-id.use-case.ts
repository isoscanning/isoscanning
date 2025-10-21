import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { Equipment } from "../../domain/equipment.entity.js";
import { EquipmentsRepository } from "../../domain/equipment.repository.js";
import { EQUIPMENTS_REPOSITORY } from "../../equipments.di-tokens.js";

@Injectable()
export class GetEquipmentByIdUseCase
  implements UseCase<{ id: string }, Equipment>
{
  constructor(
    @Inject(EQUIPMENTS_REPOSITORY)
    private readonly equipmentsRepository: EquipmentsRepository
  ) {}

  async execute({ id }: { id: string }): Promise<Equipment> {
    const equipment = await this.equipmentsRepository.findById(id);

    if (!equipment) {
      throw new NotFoundException("Equipment not found");
    }

    return equipment;
  }
}





