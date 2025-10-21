import {
  Inject,
  Injectable,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { Review } from "../../domain/review.entity.js";
import { ReviewsRepository } from "../../domain/review.repository.js";
import { REVIEWS_REPOSITORY } from "../../reviews.di-tokens.js";
import { CreateReviewDto } from "../dto/create-review.dto.js";

interface Input extends CreateReviewDto {
  actorId: string;
}

@Injectable()
export class CreateReviewUseCase implements UseCase<Input, Review> {
  constructor(
    @Inject(REVIEWS_REPOSITORY)
    private readonly reviewsRepository: ReviewsRepository
  ) {}

  async execute(input: Input): Promise<Review> {
    if (input.clientId !== input.actorId) {
      throw new ForbiddenException("You can only review bookings you created");
    }

    const existing = await this.reviewsRepository.findByBooking(
      input.bookingId
    );
    if (existing) {
      throw new ConflictException("Booking already reviewed");
    }

    const review = Review.create({
      ...input,
      comment: input.comment ?? "",
    });

    return this.reviewsRepository.create(review);
  }
}



