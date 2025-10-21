import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { CreateQuoteUseCase } from "../../application/commands/create-quote.use-case.js";
import { UpdateQuoteStatusUseCase } from "../../application/commands/update-quote-status.use-case.js";
import { ListQuotesUseCase } from "../../application/queries/list-quotes.use-case.js";
import { GetQuoteByIdUseCase } from "../../application/queries/get-quote-by-id.use-case.js";
import { CreateQuoteDto } from "../../application/dto/create-quote.dto.js";
import { UpdateQuoteStatusDto } from "../../application/dto/update-quote-status.dto.js";
import { ListQuotesDto } from "../../application/dto/list-quotes.dto.js";
import { QuoteResponseDto } from "../../application/dto/quote-response.dto.js";
import { SupabaseAuthGuard } from "../../../../core/auth/supabase-auth.guard.js";
import { CurrentUser } from "../../../../core/auth/current-user.decorator.js";

interface SupabaseUserPayload {
  id: string;
}

@Controller("quotes")
@UseInterceptors(ClassSerializerInterceptor)
export class QuotesController {
  constructor(
    private readonly createQuoteUseCase: CreateQuoteUseCase,
    private readonly updateQuoteStatusUseCase: UpdateQuoteStatusUseCase,
    private readonly listQuotesUseCase: ListQuotesUseCase,
    private readonly getQuoteByIdUseCase: GetQuoteByIdUseCase
  ) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  async create(
    @Body() body: CreateQuoteDto,
    @CurrentUser() user: SupabaseUserPayload
  ): Promise<QuoteResponseDto> {
    const quote = await this.createQuoteUseCase.execute({
      ...body,
      clientId: user.id,
      actorId: user.id,
    });
    return QuoteResponseDto.fromEntity(quote);
  }

  @Get()
  @UseGuards(SupabaseAuthGuard)
  async list(
    @Query() query: ListQuotesDto,
    @CurrentUser() user: SupabaseUserPayload
  ) {
    const filters = { ...query };
    if (!filters.clientId && !filters.professionalId) {
      filters.clientId = user.id;
    } else if (
      filters.clientId &&
      filters.clientId !== user.id &&
      filters.professionalId !== user.id
    ) {
      filters.clientId = user.id;
    }

    const { data, total } = await this.listQuotesUseCase.execute(filters);
    return {
      data: data.map((quote) => QuoteResponseDto.fromEntity(quote)),
      total,
      limit: filters.limit,
      offset: filters.offset,
    };
  }

  @Get(":id")
  @UseGuards(SupabaseAuthGuard)
  async getById(
    @Param("id") id: string,
    @CurrentUser() user: SupabaseUserPayload
  ): Promise<QuoteResponseDto> {
    const quote = await this.getQuoteByIdUseCase.execute({
      id,
      actorId: user.id,
    });
    return QuoteResponseDto.fromEntity(quote);
  }

  @Patch(":id/status")
  @UseGuards(SupabaseAuthGuard)
  async updateStatus(
    @Param("id") id: string,
    @Body() body: UpdateQuoteStatusDto,
    @CurrentUser() user: SupabaseUserPayload
  ): Promise<QuoteResponseDto> {
    const quote = await this.updateQuoteStatusUseCase.execute({
      id,
      payload: body,
      actorId: user.id,
    });
    return QuoteResponseDto.fromEntity(quote);
  }
}



