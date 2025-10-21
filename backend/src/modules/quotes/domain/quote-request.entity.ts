import { AggregateRoot } from "../../../shared/domain/aggregate-root.js";

export type QuoteStatus = "pending" | "answered" | "cancelled";

export interface QuoteRequestProps {
  professionalId: string;
  professionalName: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  serviceType: string;
  serviceDate: string;
  location: string;
  description: string;
  budget?: number | null;
  status: QuoteStatus;
  [key: string]: unknown;
}

export class QuoteRequest extends AggregateRoot<QuoteRequestProps> {
  private constructor(
    props: QuoteRequestProps & {
      id?: string;
      createdAt?: Date;
      updatedAt?: Date;
    }
  ) {
    super(props);
  }

  static create(
    props: QuoteRequestProps & {
      id?: string;
      createdAt?: Date;
      updatedAt?: Date;
    }
  ) {
    return new QuoteRequest(props);
  }

  updateStatus(status: QuoteStatus) {
    this.props.status = status;
    this.updatedAt = new Date();
  }
}
