import { AggregateRoot } from "../../../shared/domain/aggregate-root.js";

export type AvailabilityType = "available" | "blocked";

export interface AvailabilityProps {
  professionalId: string;
  date: string; // ISO date (YYYY-MM-DD)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  type: AvailabilityType;
  reason?: string | null;
  [key: string]: unknown;
}

export class Availability extends AggregateRoot<AvailabilityProps> {
  private constructor(
    props: AvailabilityProps & {
      id?: string;
      createdAt?: Date;
      updatedAt?: Date;
    }
  ) {
    super(props);
  }

  static create(
    props: AvailabilityProps & {
      id?: string;
      createdAt?: Date;
      updatedAt?: Date;
    }
  ) {
    return new Availability(props);
  }
}

