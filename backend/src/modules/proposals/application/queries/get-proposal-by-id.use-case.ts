import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { EquipmentProposal } from "../../domain/equipment-proposal.entity.js";
import { EquipmentProposalRepository } from "../../domain/equipment-proposal.repository.js";
import { PROPOSALS_REPOSITORY } from "../../proposals.di-tokens.js";

interface Input {
  id: string;
  actorId?: string;
}

@Injectable()
export class GetProposalByIdUseCase
  implements UseCase<Input, EquipmentProposal>
{
  constructor(
    @Inject(PROPOSALS_REPOSITORY)
    private readonly proposalsRepository: EquipmentProposalRepository
  ) {}

  async execute({ id, actorId }: Input): Promise<EquipmentProposal> {
    const proposal = await this.proposalsRepository.findById(id);

    if (!proposal) {
      throw new NotFoundException("Proposal not found");
    }

    if (actorId) {
      const json = proposal.toJSON();
      if (json.buyerId !== actorId && json.sellerId !== actorId) {
        throw new ForbiddenException(
          "You are not allowed to view this proposal"
        );
      }
    }

    return proposal;
  }
}


