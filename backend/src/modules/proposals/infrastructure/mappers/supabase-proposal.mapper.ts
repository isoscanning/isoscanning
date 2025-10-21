import {
  EquipmentProposal,
  EquipmentProposalProps,
} from "../../domain/equipment-proposal.entity.js";

export interface ProposalRow {
  id: string;
  equipment_id: string;
  equipment_name: string;
  buyer_id: string;
  buyer_name: string;
  seller_id: string;
  message: string;
  proposed_price: number | null;
  start_date: string | null;
  end_date: string | null;
  contact_phone: string;
  status: string;
  created_at: string;
  updated_at: string | null;
}

export class SupabaseProposalMapper {
  static toDomain(row: ProposalRow): EquipmentProposal {
    const props: EquipmentProposalProps & {
      id: string;
      createdAt: Date;
      updatedAt?: Date;
    } = {
      id: row.id,
      equipmentId: row.equipment_id,
      equipmentName: row.equipment_name,
      buyerId: row.buyer_id,
      buyerName: row.buyer_name,
      sellerId: row.seller_id,
      message: row.message,
      proposedPrice: row.proposed_price,
      startDate: row.start_date,
      endDate: row.end_date,
      contactPhone: row.contact_phone,
      status: row.status as EquipmentProposalProps["status"],
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };

    return EquipmentProposal.create(props);
  }

  static toPersistence(proposal: EquipmentProposal) {
    const json = proposal.toJSON();
    return {
      id: json.id as string,
      equipment_id: json.equipmentId,
      equipment_name: json.equipmentName,
      buyer_id: json.buyerId,
      buyer_name: json.buyerName,
      seller_id: json.sellerId,
      message: json.message,
      proposed_price: json.proposedPrice ?? null,
      start_date: json.startDate ?? null,
      end_date: json.endDate ?? null,
      contact_phone: json.contactPhone,
      status: json.status,
      updated_at: new Date().toISOString(),
    };
  }
}




