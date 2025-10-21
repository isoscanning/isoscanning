import { AggregateRoot } from "../../../shared/domain/aggregate-root.js";

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface BookingProps {
  professionalId: string;
  professionalName: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  serviceType: string;
  location: string;
  notes?: string | null;
  date: string;
  startTime: string;
  status: BookingStatus;
  [key: string]: unknown;
}

export class Booking extends AggregateRoot<BookingProps> {
  private constructor(
    props: BookingProps & { id?: string; createdAt?: Date; updatedAt?: Date }
  ) {
    super(props);
  }

  static create(
    props: BookingProps & { id?: string; createdAt?: Date; updatedAt?: Date }
  ) {
    return new Booking(props);
  }

  updateStatus(status: BookingStatus) {
    this.props.status = status;
    this.updatedAt = new Date();
  }
}
