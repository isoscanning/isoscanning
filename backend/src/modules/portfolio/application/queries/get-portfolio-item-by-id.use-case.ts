import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { PortfolioItem } from "../../domain/portfolio-item.entity.js";
import { PortfolioRepository } from "../../domain/portfolio.repository.js";
import { PORTFOLIO_REPOSITORY } from "../../portfolio.di-tokens.js";

@Injectable()
export class GetPortfolioItemByIdUseCase
  implements UseCase<{ id: string }, PortfolioItem>
{
  constructor(
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolioRepository: PortfolioRepository
  ) {}

  async execute({ id }: { id: string }): Promise<PortfolioItem> {
    const item = await this.portfolioRepository.findById(id);

    if (!item) {
      throw new NotFoundException("Portfolio item not found");
    }

    return item;
  }
}





