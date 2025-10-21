import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { QuoteRequestRepository } from "../../domain/quote-request.repository.js";
import { QUOTES_REPOSITORY } from "../../quotes.di-tokens.js";
import { UpdateQuoteStatusDto } from "../dto/update-quote-status.dto.js";
import { QuoteRequest } from "../../domain/quote-request.entity.js";

interface Input {
  id: string;
  payload: UpdateQuoteStatusDto;
  actorId: string;
}

@Injectable()
export class UpdateQuoteStatusUseCase implements UseCase<Input, QuoteRequest> {
  constructor(
    @Inject(QUOTES_REPOSITORY)
    private readonly quotesRepository: QuoteRequestRepository
  ) {}

  async execute({ id, payload, actorId }: Input): Promise<QuoteRequest> {
    const quote = await this.quotesRepository.findById(id);

    if (!quote) {
      throw new NotFoundException("Quote request not found");
    }

    const json = quote.toJSON();
    if (json.professionalId !== actorId && json.clientId !== actorId) {
      throw new ForbiddenException("You are not allowed to update this quote");
    }

    quote.updateStatus(payload.status);
    return this.quotesRepository.update(quote);
  }
}



