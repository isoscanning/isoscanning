import { Inject, Injectable, ForbiddenException } from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { EquipmentProposal } from "../../domain/equipment-proposal.entity.js";
import { EquipmentProposalRepository } from "../../domain/equipment-proposal.repository.js";
import { PROPOSALS_REPOSITORY } from "../../proposals.di-tokens.js";
import { CreateProposalDto } from "../dto/create-proposal.dto.js";

interface Input extends CreateProposalDto {
  actorId: string;
}

@Injectable()
export class CreateProposalUseCase
  implements UseCase<Input, EquipmentProposal>
{
  constructor(
    @Inject(PROPOSALS_REPOSITORY)
    private readonly proposalsRepository: EquipmentProposalRepository
  ) {}

  async execute(input: Input): Promise<EquipmentProposal> {
    if (input.buyerId !== input.actorId) {
      throw new ForbiddenException(
        "You are not allowed to create proposals for other users"
      );
    }

    const proposal = EquipmentProposal.create({
      ...input,
      proposedPrice: input.proposedPrice ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
    });

    return this.proposalsRepository.create(proposal);
  }
}


