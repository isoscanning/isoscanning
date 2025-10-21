import { Module } from "@nestjs/common";
import { PortfolioController } from "./infrastructure/http/portfolio.controller.js";
import { SupabasePortfolioRepository } from "./infrastructure/repositories/supabase-portfolio.repository.js";
import { PORTFOLIO_REPOSITORY } from "./portfolio.di-tokens.js";
import { CreatePortfolioItemUseCase } from "./application/commands/create-portfolio-item.use-case.js";
import { UpdatePortfolioItemUseCase } from "./application/commands/update-portfolio-item.use-case.js";
import { DeletePortfolioItemUseCase } from "./application/commands/delete-portfolio-item.use-case.js";
import { ListPortfolioUseCase } from "./application/queries/list-portfolio.use-case.js";
import { GetPortfolioItemByIdUseCase } from "./application/queries/get-portfolio-item-by-id.use-case.js";

@Module({
  controllers: [PortfolioController],
  providers: [
    { provide: PORTFOLIO_REPOSITORY, useClass: SupabasePortfolioRepository },
    CreatePortfolioItemUseCase,
    UpdatePortfolioItemUseCase,
    DeletePortfolioItemUseCase,
    ListPortfolioUseCase,
    GetPortfolioItemByIdUseCase,
  ],
  exports: [
    CreatePortfolioItemUseCase,
    UpdatePortfolioItemUseCase,
    DeletePortfolioItemUseCase,
    ListPortfolioUseCase,
    GetPortfolioItemByIdUseCase,
  ],
})
export class PortfolioModule {}




