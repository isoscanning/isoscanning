import { Inject, Injectable } from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { Equipment } from "../../domain/equipment.entity.js";
import {
  EquipmentSearchFilters,
  EquipmentsRepository,
} from "../../domain/equipment.repository.js";
import { EQUIPMENTS_REPOSITORY } from "../../equipments.di-tokens.js";

interface Output {
  data: Equipment[];
  total: number;
}

@Injectable()
export class SearchEquipmentsUseCase
  implements UseCase<EquipmentSearchFilters, Output>
{
  constructor(
    @Inject(EQUIPMENTS_REPOSITORY)
    private readonly equipmentsRepository: EquipmentsRepository
  ) {}

  async execute(filters: EquipmentSearchFilters): Promise<Output> {
    return this.equipmentsRepository.search(filters);
  }
}





