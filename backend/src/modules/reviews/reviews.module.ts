import { Module } from "@nestjs/common";
import { ReviewsController } from "./infrastructure/http/reviews.controller.js";
import { SupabaseReviewsRepository } from "./infrastructure/repositories/supabase-reviews.repository.js";
import { REVIEWS_REPOSITORY } from "./reviews.di-tokens.js";
import { CreateReviewUseCase } from "./application/commands/create-review.use-case.js";
import { ListReviewsUseCase } from "./application/queries/list-reviews.use-case.js";

@Module({
  controllers: [ReviewsController],
  providers: [
    { provide: REVIEWS_REPOSITORY, useClass: SupabaseReviewsRepository },
    CreateReviewUseCase,
    ListReviewsUseCase,
  ],
  exports: [CreateReviewUseCase, ListReviewsUseCase],
})
export class ReviewsModule {}





