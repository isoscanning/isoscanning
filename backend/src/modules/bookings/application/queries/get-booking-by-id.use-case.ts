import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { Booking } from "../../domain/booking.entity.js";
import { BookingsRepository } from "../../domain/booking.repository.js";
import { BOOKINGS_REPOSITORY } from "../../bookings.di-tokens.js";

interface Input {
  id: string;
  actorId?: string;
}

@Injectable()
export class GetBookingByIdUseCase implements UseCase<Input, Booking> {
  constructor(
    @Inject(BOOKINGS_REPOSITORY)
    private readonly bookingsRepository: BookingsRepository
  ) {}

  async execute({ id, actorId }: Input): Promise<Booking> {
    const booking = await this.bookingsRepository.findById(id);

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    if (actorId) {
      const json = booking.toJSON();
      if (json.professionalId !== actorId && json.clientId !== actorId) {
        throw new ForbiddenException(
          "You are not allowed to view this booking"
        );
      }
    }

    return booking;
  }
}



