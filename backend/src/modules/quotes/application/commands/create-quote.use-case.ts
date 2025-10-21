import { Inject, Injectable, ForbiddenException } from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { QuoteRequest } from "../../domain/quote-request.entity.js";
import { QuoteRequestRepository } from "../../domain/quote-request.repository.js";
import { QUOTES_REPOSITORY } from "../../quotes.di-tokens.js";
import { CreateQuoteDto } from "../dto/create-quote.dto.js";

interface Input extends CreateQuoteDto {
  actorId: string;
}

@Injectable()
export class CreateQuoteUseCase implements UseCase<Input, QuoteRequest> {
  constructor(
    @Inject(QUOTES_REPOSITORY)
    private readonly quotesRepository: QuoteRequestRepository
  ) {}

  async execute(input: Input): Promise<QuoteRequest> {
    if (input.clientId !== input.actorId) {
      throw new ForbiddenException(
        "You are not allowed to create quotes for other users"
      );
    }

    const quote = QuoteRequest.create({
      ...input,
      budget: input.budget ?? null,
    });

    return this.quotesRepository.create(quote);
  }
}


