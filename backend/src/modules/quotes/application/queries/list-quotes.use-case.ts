import { Inject, Injectable } from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { QuoteRequest } from "../../domain/quote-request.entity.js";
import {
  QuoteFilters,
  QuoteRequestRepository,
} from "../../domain/quote-request.repository.js";
import { QUOTES_REPOSITORY } from "../../quotes.di-tokens.js";

interface Output {
  data: QuoteRequest[];
  total: number;
}

@Injectable()
export class ListQuotesUseCase implements UseCase<QuoteFilters, Output> {
  constructor(
    @Inject(QUOTES_REPOSITORY)
    private readonly quotesRepository: QuoteRequestRepository
  ) {}

  async execute(filters: QuoteFilters): Promise<Output> {
    return this.quotesRepository.list(filters);
  }
}





