import { Inject, Injectable } from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { Review } from "../../domain/review.entity.js";
import {
  ReviewFilters,
  ReviewsRepository,
} from "../../domain/review.repository.js";
import { REVIEWS_REPOSITORY } from "../../reviews.di-tokens.js";

interface Output {
  data: Review[];
  total: number;
}

@Injectable()
export class ListReviewsUseCase implements UseCase<ReviewFilters, Output> {
  constructor(
    @Inject(REVIEWS_REPOSITORY)
    private readonly reviewsRepository: ReviewsRepository
  ) {}

  async execute(filters: ReviewFilters): Promise<Output> {
    return this.reviewsRepository.list(filters);
  }
}





