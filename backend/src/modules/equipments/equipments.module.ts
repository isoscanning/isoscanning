import { Module } from "@nestjs/common";
import { EquipmentsController } from "./infrastructure/http/equipments.controller.js";
import { SupabaseEquipmentsRepository } from "./infrastructure/repositories/supabase-equipments.repository.js";
import { EQUIPMENTS_REPOSITORY } from "./equipments.di-tokens.js";
import { CreateEquipmentUseCase } from "./application/commands/create-equipment.use-case.js";
import { UpdateEquipmentUseCase } from "./application/commands/update-equipment.use-case.js";
import { DeleteEquipmentUseCase } from "./application/commands/delete-equipment.use-case.js";
import { GetEquipmentByIdUseCase } from "./application/queries/get-equipment-by-id.use-case.js";
import { SearchEquipmentsUseCase } from "./application/queries/search-equipments.use-case.js";
import { GenerateEquipmentUploadUrlUseCase } from "./application/commands/generate-equipment-upload-url.use-case.js";

@Module({
  controllers: [EquipmentsController],
  providers: [
    { provide: EQUIPMENTS_REPOSITORY, useClass: SupabaseEquipmentsRepository },
    CreateEquipmentUseCase,
    UpdateEquipmentUseCase,
    DeleteEquipmentUseCase,
    GetEquipmentByIdUseCase,
    SearchEquipmentsUseCase,
    GenerateEquipmentUploadUrlUseCase,
  ],
  exports: [
    CreateEquipmentUseCase,
    UpdateEquipmentUseCase,
    DeleteEquipmentUseCase,
    GetEquipmentByIdUseCase,
    SearchEquipmentsUseCase,
  ],
})
export class EquipmentsModule {}





