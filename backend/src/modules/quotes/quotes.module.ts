import { Module } from "@nestjs/common";
import { QuotesController } from "./infrastructure/http/quotes.controller.js";
import { SupabaseQuotesRepository } from "./infrastructure/repositories/supabase-quotes.repository.js";
import { QUOTES_REPOSITORY } from "./quotes.di-tokens.js";
import { CreateQuoteUseCase } from "./application/commands/create-quote.use-case.js";
import { UpdateQuoteStatusUseCase } from "./application/commands/update-quote-status.use-case.js";
import { ListQuotesUseCase } from "./application/queries/list-quotes.use-case.js";
import { GetQuoteByIdUseCase } from "./application/queries/get-quote-by-id.use-case.js";

@Module({
  controllers: [QuotesController],
  providers: [
    { provide: QUOTES_REPOSITORY, useClass: SupabaseQuotesRepository },
    CreateQuoteUseCase,
    UpdateQuoteStatusUseCase,
    ListQuotesUseCase,
    GetQuoteByIdUseCase,
  ],
  exports: [
    CreateQuoteUseCase,
    UpdateQuoteStatusUseCase,
    ListQuotesUseCase,
    GetQuoteByIdUseCase,
  ],
})
export class QuotesModule {}





