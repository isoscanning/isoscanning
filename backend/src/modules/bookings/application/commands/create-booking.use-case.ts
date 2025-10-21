import { Inject, Injectable, ForbiddenException } from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { Booking } from "../../domain/booking.entity.js";
import { BookingsRepository } from "../../domain/booking.repository.js";
import { BOOKINGS_REPOSITORY } from "../../bookings.di-tokens.js";
import { CreateBookingDto } from "../dto/create-booking.dto.js";

interface Input extends CreateBookingDto {
  actorId: string;
}

@Injectable()
export class CreateBookingUseCase implements UseCase<Input, Booking> {
  constructor(
    @Inject(BOOKINGS_REPOSITORY)
    private readonly bookingsRepository: BookingsRepository
  ) {}

  async execute(input: Input): Promise<Booking> {
    if (input.clientId !== input.actorId) {
      throw new ForbiddenException(
        "You are not allowed to create bookings for other clients"
      );
    }

    const booking = Booking.create({
      ...input,
      notes: input.notes ?? null,
    });

    return this.bookingsRepository.create(booking);
  }
}



