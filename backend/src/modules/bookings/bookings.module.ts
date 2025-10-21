import { Module } from "@nestjs/common";
import { BookingsController } from "./infrastructure/http/bookings.controller.js";
import { SupabaseBookingsRepository } from "./infrastructure/repositories/supabase-bookings.repository.js";
import { BOOKINGS_REPOSITORY } from "./bookings.di-tokens.js";
import { CreateBookingUseCase } from "./application/commands/create-booking.use-case.js";
import { UpdateBookingStatusUseCase } from "./application/commands/update-booking-status.use-case.js";
import { ListBookingsUseCase } from "./application/queries/list-bookings.use-case.js";
import { GetBookingByIdUseCase } from "./application/queries/get-booking-by-id.use-case.js";

@Module({
  controllers: [BookingsController],
  providers: [
    { provide: BOOKINGS_REPOSITORY, useClass: SupabaseBookingsRepository },
    CreateBookingUseCase,
    UpdateBookingStatusUseCase,
    ListBookingsUseCase,
    GetBookingByIdUseCase,
  ],
  exports: [
    CreateBookingUseCase,
    UpdateBookingStatusUseCase,
    ListBookingsUseCase,
    GetBookingByIdUseCase,
  ],
})
export class BookingsModule {}





