import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { QuoteRequest } from "../../domain/quote-request.entity.js";
import { QuoteRequestRepository } from "../../domain/quote-request.repository.js";
import { QUOTES_REPOSITORY } from "../../quotes.di-tokens.js";

interface Input {
  id: string;
  actorId?: string;
}

@Injectable()
export class GetQuoteByIdUseCase implements UseCase<Input, QuoteRequest> {
  constructor(
    @Inject(QUOTES_REPOSITORY)
    private readonly quotesRepository: QuoteRequestRepository
  ) {}

  async execute({ id, actorId }: Input): Promise<QuoteRequest> {
    const quote = await this.quotesRepository.findById(id);

    if (!quote) {
      throw new NotFoundException("Quote request not found");
    }

    if (actorId) {
      const json = quote.toJSON();
      if (json.professionalId !== actorId && json.clientId !== actorId) {
        throw new ForbiddenException("You are not allowed to view this quote");
      }
    }

    return quote;
  }
}



