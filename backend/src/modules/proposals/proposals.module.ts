import { Module } from "@nestjs/common";
import { ProposalsController } from "./infrastructure/http/proposals.controller.js";
import { SupabaseProposalsRepository } from "./infrastructure/repositories/supabase-proposals.repository.js";
import { PROPOSALS_REPOSITORY } from "./proposals.di-tokens.js";
import { CreateProposalUseCase } from "./application/commands/create-proposal.use-case.js";
import { UpdateProposalStatusUseCase } from "./application/commands/update-proposal-status.use-case.js";
import { ListProposalsUseCase } from "./application/queries/list-proposals.use-case.js";
import { GetProposalByIdUseCase } from "./application/queries/get-proposal-by-id.use-case.js";

@Module({
  controllers: [ProposalsController],
  providers: [
    { provide: PROPOSALS_REPOSITORY, useClass: SupabaseProposalsRepository },
    CreateProposalUseCase,
    UpdateProposalStatusUseCase,
    ListProposalsUseCase,
    GetProposalByIdUseCase,
  ],
  exports: [
    CreateProposalUseCase,
    UpdateProposalStatusUseCase,
    ListProposalsUseCase,
    GetProposalByIdUseCase,
  ],
})
export class ProposalsModule {}




