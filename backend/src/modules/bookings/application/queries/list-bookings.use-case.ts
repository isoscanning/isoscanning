import { Inject, Injectable } from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { Booking } from "../../domain/booking.entity.js";
import {
  BookingFilters,
  BookingsRepository,
} from "../../domain/booking.repository.js";
import { BOOKINGS_REPOSITORY } from "../../bookings.di-tokens.js";

interface Output {
  data: Booking[];
  total: number;
}

@Injectable()
export class ListBookingsUseCase implements UseCase<BookingFilters, Output> {
  constructor(
    @Inject(BOOKINGS_REPOSITORY)
    private readonly bookingsRepository: BookingsRepository
  ) {}

  async execute(filters: BookingFilters): Promise<Output> {
    return this.bookingsRepository.list(filters);
  }
}





