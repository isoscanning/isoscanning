import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { BookingsRepository } from "../../domain/booking.repository.js";
import { BOOKINGS_REPOSITORY } from "../../bookings.di-tokens.js";
import { UpdateBookingStatusDto } from "../dto/update-booking-status.dto.js";
import { Booking } from "../../domain/booking.entity.js";

interface Input {
  id: string;
  payload: UpdateBookingStatusDto;
  actorId: string;
}

@Injectable()
export class UpdateBookingStatusUseCase implements UseCase<Input, Booking> {
  constructor(
    @Inject(BOOKINGS_REPOSITORY)
    private readonly bookingsRepository: BookingsRepository
  ) {}

  async execute({ id, payload, actorId }: Input): Promise<Booking> {
    const booking = await this.bookingsRepository.findById(id);

    if (!booking) {
      throw new NotFoundException("Booking not found");
    }

    const json = booking.toJSON();
    if (json.professionalId !== actorId && json.clientId !== actorId) {
      throw new ForbiddenException(
        "You are not allowed to update this booking"
      );
    }

    booking.updateStatus(payload.status);
    return this.bookingsRepository.update(booking);
  }
}



