import { Review } from "./review.entity.js";

export interface ReviewFilters {
  professionalId?: string;
  bookingId?: string;
  clientId?: string;
  limit?: number;
  offset?: number;
}

export interface ReviewsRepository {
  create(review: Review): Promise<Review>;
  findByBooking(bookingId: string): Promise<Review | null>;
  list(filters: ReviewFilters): Promise<{ data: Review[]; total: number }>;
}




