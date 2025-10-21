import { Inject, Injectable, ForbiddenException } from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { Equipment } from "../../domain/equipment.entity.js";
import { EquipmentsRepository } from "../../domain/equipment.repository.js";
import { EQUIPMENTS_REPOSITORY } from "../../equipments.di-tokens.js";
import { CreateEquipmentDto } from "../dto/create-equipment.dto.js";

interface Input extends CreateEquipmentDto {
  actorId: string;
}

@Injectable()
export class CreateEquipmentUseCase implements UseCase<Input, Equipment> {
  constructor(
    @Inject(EQUIPMENTS_REPOSITORY)
    private readonly equipmentsRepository: EquipmentsRepository
  ) {}

  async execute(input: Input): Promise<Equipment> {
    if (input.ownerId !== input.actorId) {
      throw new ForbiddenException(
        "You are not allowed to register equipments for other users"
      );
    }

    const equipment = Equipment.create({
      ...input,
      description: input.description ?? null,
      brand: input.brand ?? null,
      model: input.model ?? null,
      price: input.price ?? null,
      rentPeriod: input.rentPeriod ?? null,
      additionalConditions: input.additionalConditions ?? null,
    });

    return this.equipmentsRepository.create(equipment);
  }
}

