import { AggregateRoot } from "../../../shared/domain/aggregate-root.js";

export type ProposalStatus = "pending" | "accepted" | "rejected";

export interface EquipmentProposalProps {
  equipmentId: string;
  equipmentName: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  message: string;
  proposedPrice?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  contactPhone: string;
  status: ProposalStatus;
  [key: string]: unknown;
}

export class EquipmentProposal extends AggregateRoot<EquipmentProposalProps> {
  private constructor(
    props: EquipmentProposalProps & {
      id?: string;
      createdAt?: Date;
      updatedAt?: Date;
    }
  ) {
    super(props);
  }

  static create(
    props: EquipmentProposalProps & {
      id?: string;
      createdAt?: Date;
      updatedAt?: Date;
    }
  ) {
    return new EquipmentProposal(props);
  }

  updateStatus(status: ProposalStatus) {
    this.props.status = status;
    this.updatedAt = new Date();
  }
}
