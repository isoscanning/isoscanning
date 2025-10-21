import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { PortfolioRepository } from "../../domain/portfolio.repository.js";
import { PORTFOLIO_REPOSITORY } from "../../portfolio.di-tokens.js";

@Injectable()
export class DeletePortfolioItemUseCase
  implements UseCase<{ id: string; actorId: string }, void>
{
  constructor(
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolioRepository: PortfolioRepository
  ) {}

  async execute({
    id,
    actorId,
  }: {
    id: string;
    actorId: string;
  }): Promise<void> {
    const item = await this.portfolioRepository.findById(id);
    if (!item) {
      throw new NotFoundException("Portfolio item not found");
    }

    if ((item.toJSON().professionalId as string) !== actorId) {
      throw new ForbiddenException(
        "You are not allowed to delete this portfolio item"
      );
    }

    await this.portfolioRepository.delete(id);
  }
}



