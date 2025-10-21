import { Inject, Injectable, ForbiddenException } from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { PortfolioItem } from "../../domain/portfolio-item.entity.js";
import { PortfolioRepository } from "../../domain/portfolio.repository.js";
import { PORTFOLIO_REPOSITORY } from "../../portfolio.di-tokens.js";
import { CreatePortfolioItemDto } from "../dto/create-portfolio-item.dto.js";

interface Input extends CreatePortfolioItemDto {
  actorId: string;
}

@Injectable()
export class CreatePortfolioItemUseCase
  implements UseCase<Input, PortfolioItem>
{
  constructor(
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolioRepository: PortfolioRepository
  ) {}

  async execute(input: Input): Promise<PortfolioItem> {
    if (input.professionalId !== input.actorId) {
      throw new ForbiddenException(
        "You are not allowed to modify this portfolio"
      );
    }

    const item = PortfolioItem.create({
      ...input,
      description: input.description ?? null,
      category: input.category ?? null,
    });

    return this.portfolioRepository.create(item);
  }
}



