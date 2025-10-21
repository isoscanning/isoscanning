import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { CreateReviewUseCase } from "../../application/commands/create-review.use-case.js";
import { ListReviewsUseCase } from "../../application/queries/list-reviews.use-case.js";
import { CreateReviewDto } from "../../application/dto/create-review.dto.js";
import { ListReviewsDto } from "../../application/dto/list-reviews.dto.js";
import { ReviewResponseDto } from "../../application/dto/review-response.dto.js";
import { SupabaseAuthGuard } from "../../../../core/auth/supabase-auth.guard.js";
import { CurrentUser } from "../../../../core/auth/current-user.decorator.js";

interface SupabaseUserPayload {
  id: string;
}

@Controller("reviews")
@UseInterceptors(ClassSerializerInterceptor)
export class ReviewsController {
  constructor(
    private readonly createReviewUseCase: CreateReviewUseCase,
    private readonly listReviewsUseCase: ListReviewsUseCase
  ) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  async create(
    @Body() body: CreateReviewDto,
    @CurrentUser() user: SupabaseUserPayload
  ): Promise<ReviewResponseDto> {
    const review = await this.createReviewUseCase.execute({
      ...body,
      clientId: user.id,
      actorId: user.id,
    });
    return ReviewResponseDto.fromEntity(review);
  }

  @Get()
  async list(@Query() query: ListReviewsDto) {
    const { data, total } = await this.listReviewsUseCase.execute(query);
    return {
      data: data.map((review) => ReviewResponseDto.fromEntity(review)),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }
}



