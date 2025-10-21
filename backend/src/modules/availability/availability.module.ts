import { Module } from "@nestjs/common";
import { AvailabilityController } from "./infrastructure/http/availability.controller.js";
import { SupabaseAvailabilityRepository } from "./infrastructure/repositories/supabase-availability.repository.js";
import { AVAILABILITY_REPOSITORY } from "./availability.di-tokens.js";
import { CreateAvailabilityUseCase } from "./application/commands/create-availability.use-case.js";
import { DeleteAvailabilityUseCase } from "./application/commands/delete-availability.use-case.js";
import { ListAvailabilityUseCase } from "./application/queries/list-availability.use-case.js";

@Module({
  controllers: [AvailabilityController],
  providers: [
    {
      provide: AVAILABILITY_REPOSITORY,
      useClass: SupabaseAvailabilityRepository,
    },
    CreateAvailabilityUseCase,
    DeleteAvailabilityUseCase,
    ListAvailabilityUseCase,
  ],
  exports: [
    CreateAvailabilityUseCase,
    DeleteAvailabilityUseCase,
    ListAvailabilityUseCase,
  ],
})
export class AvailabilityModule {}





