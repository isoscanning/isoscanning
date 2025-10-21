import { Inject, Injectable } from "@nestjs/common";
import { UseCase } from "../../../../shared/application/use-case.js";
import { EquipmentProposal } from "../../domain/equipment-proposal.entity.js";
import {
  EquipmentProposalRepository,
  ProposalFilters,
} from "../../domain/equipment-proposal.repository.js";
import { PROPOSALS_REPOSITORY } from "../../proposals.di-tokens.js";

interface Output {
  data: EquipmentProposal[];
  total: number;
}

@Injectable()
export class ListProposalsUseCase implements UseCase<ProposalFilters, Output> {
  constructor(
    @Inject(PROPOSALS_REPOSITORY)
    private readonly proposalsRepository: EquipmentProposalRepository
  ) {}

  async execute(filters: ProposalFilters): Promise<Output> {
    return this.proposalsRepository.list(filters);
  }
}




