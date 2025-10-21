import { Review, ReviewProps } from "../../domain/review.entity.js";

export interface ReviewRow {
  id: string;
  professional_id: string;
  booking_id: string;
  client_id: string;
  client_name: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string | null;
}

export class SupabaseReviewMapper {
  static toDomain(row: ReviewRow): Review {
    const props: ReviewProps & {
      id: string;
      createdAt: Date;
      updatedAt?: Date;
    } = {
      id: row.id,
      professionalId: row.professional_id,
      bookingId: row.booking_id,
      clientId: row.client_id,
      clientName: row.client_name,
      rating: row.rating,
      comment: row.comment,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };

    return Review.create(props);
  }

  static toPersistence(review: Review) {
    const json = review.toJSON();
    return {
      id: json.id as string,
      professional_id: json.professionalId,
      booking_id: json.bookingId,
      client_id: json.clientId,
      client_name: json.clientName,
      rating: json.rating,
      comment: json.comment,
      updated_at: new Date().toISOString(),
    };
  }
}





