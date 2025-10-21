import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { PortfolioRepository } from "../../domain/portfolio.repository.js";
import { PORTFOLIO_REPOSITORY } from "../../portfolio.di-tokens.js";
import { UpdatePortfolioItemDto } from "../dto/update-portfolio-item.dto.js";
import { PortfolioItem } from "../../domain/portfolio-item.entity.js";

interface Input {
  id: string;
  payload: UpdatePortfolioItemDto;
  actorId: string;
}

@Injectable()
export class UpdatePortfolioItemUseCase
  implements UseCase<Input, PortfolioItem>
{
  constructor(
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolioRepository: PortfolioRepository
  ) {}

  async execute({ id, payload, actorId }: Input): Promise<PortfolioItem> {
    const item = await this.portfolioRepository.findById(id);

    if (!item) {
      throw new NotFoundException("Portfolio item not found");
    }

    if ((item.toJSON().professionalId as string) !== actorId) {
      throw new ForbiddenException(
        "You are not allowed to update this portfolio item"
      );
    }

    item.update(payload);
    return this.portfolioRepository.update(item);
  }
}



