import { Inject, Injectable } from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { PortfolioItem } from "../../domain/portfolio-item.entity.js";
import { PortfolioRepository } from "../../domain/portfolio.repository.js";
import { PORTFOLIO_REPOSITORY } from "../../portfolio.di-tokens.js";

@Injectable()
export class ListPortfolioUseCase
  implements UseCase<{ professionalId: string }, PortfolioItem[]>
{
  constructor(
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolioRepository: PortfolioRepository
  ) {}

  async execute({
    professionalId,
  }: {
    professionalId: string;
  }): Promise<PortfolioItem[]> {
    return this.portfolioRepository.listByProfessional(professionalId);
  }
}





