import {
  EquipmentProposal,
  ProposalStatus,
} from "./equipment-proposal.entity.js";

export interface ProposalFilters {
  equipmentId?: string;
  buyerId?: string;
  sellerId?: string;
  status?: ProposalStatus;
  limit?: number;
  offset?: number;
}

export interface EquipmentProposalRepository {
  create(proposal: EquipmentProposal): Promise<EquipmentProposal>;
  update(proposal: EquipmentProposal): Promise<EquipmentProposal>;
  findById(id: string): Promise<EquipmentProposal | null>;
  list(
    filters: ProposalFilters
  ): Promise<{ data: EquipmentProposal[]; total: number }>;
}




