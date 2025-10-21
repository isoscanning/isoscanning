import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { EquipmentProposalRepository } from "../../domain/equipment-proposal.repository.js";
import { PROPOSALS_REPOSITORY } from "../../proposals.di-tokens.js";
import { UpdateProposalStatusDto } from "../dto/update-proposal-status.dto.js";
import { EquipmentProposal } from "../../domain/equipment-proposal.entity.js";

interface Input {
  id: string;
  payload: UpdateProposalStatusDto;
  actorId: string;
}

@Injectable()
export class UpdateProposalStatusUseCase
  implements UseCase<Input, EquipmentProposal>
{
  constructor(
    @Inject(PROPOSALS_REPOSITORY)
    private readonly proposalsRepository: EquipmentProposalRepository
  ) {}

  async execute({ id, payload, actorId }: Input): Promise<EquipmentProposal> {
    const proposal = await this.proposalsRepository.findById(id);

    if (!proposal) {
      throw new NotFoundException("Proposal not found");
    }

    const json = proposal.toJSON();
    if (json.sellerId !== actorId && json.buyerId !== actorId) {
      throw new ForbiddenException(
        "You are not allowed to update this proposal"
      );
    }

    // only seller can accept/reject, buyer can cancel
    if (payload.status !== "pending" && json.sellerId !== actorId) {
      throw new ForbiddenException(
        "Only the seller can accept or reject proposals"
      );
    }

    proposal.updateStatus(payload.status);
    return this.proposalsRepository.update(proposal);
  }
}


