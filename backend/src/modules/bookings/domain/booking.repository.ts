import { Booking, BookingStatus } from "./booking.entity.js";

export interface BookingFilters {
  professionalId?: string;
  clientId?: string;
  status?: BookingStatus;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface BookingsRepository {
  create(booking: Booking): Promise<Booking>;
  update(booking: Booking): Promise<Booking>;
  findById(id: string): Promise<Booking | null>;
  list(filters: BookingFilters): Promise<{ data: Booking[]; total: number }>;
}





