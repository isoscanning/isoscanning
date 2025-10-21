import { Expose, plainToInstance } from "class-transformer";
import { EquipmentProposal } from "../../domain/equipment-proposal.entity.js";

export class ProposalResponseDto {
  @Expose()
  id!: string;

  @Expose()
  equipmentId!: string;

  @Expose()
  equipmentName!: string;

  @Expose()
  buyerId!: string;

  @Expose()
  buyerName!: string;

  @Expose()
  sellerId!: string;

  @Expose()
  message!: string;

  @Expose()
  proposedPrice?: number | null;

  @Expose()
  startDate?: string | null;

  @Expose()
  endDate?: string | null;

  @Expose()
  contactPhone!: string;

  @Expose()
  status!: string;

  static fromEntity(entity: EquipmentProposal): ProposalResponseDto {
    return plainToInstance(ProposalResponseDto, entity.toJSON(), {
      excludeExtraneousValues: true,
    });
  }
}




