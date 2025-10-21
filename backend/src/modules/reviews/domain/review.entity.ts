import { AggregateRoot } from "../../../shared/domain/aggregate-root.js";

export interface ReviewProps {
  professionalId: string;
  bookingId: string;
  clientId: string;
  clientName: string;
  rating: number;
  comment: string;
  [key: string]: unknown;
}

export class Review extends AggregateRoot<ReviewProps> {
  private constructor(
    props: ReviewProps & { id?: string; createdAt?: Date; updatedAt?: Date }
  ) {
    super(props);
  }

  static create(
    props: ReviewProps & { id?: string; createdAt?: Date; updatedAt?: Date }
  ) {
    return new Review(props);
  }
}
