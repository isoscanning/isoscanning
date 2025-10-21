import { Equipment, EquipmentProps } from "../../domain/equipment.entity.js";

export interface EquipmentRow {
  id: string;
  owner_id: string;
  owner_name: string;
  name: string;
  category: string;
  negotiation_type: string;
  condition: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  price: number | null;
  rent_period: string | null;
  city: string;
  state: string;
  additional_conditions: string | null;
  image_urls: string[] | null;
  is_available: boolean;
  created_at: string;
  updated_at: string | null;
}

export class SupabaseEquipmentMapper {
  static toDomain(row: EquipmentRow): Equipment {
    const props: EquipmentProps & {
      id: string;
      createdAt: Date;
      updatedAt?: Date;
    } = {
      id: row.id,
      ownerId: row.owner_id,
      ownerName: row.owner_name,
      name: row.name,
      category: row.category,
      negotiationType:
        row.negotiation_type as EquipmentProps["negotiationType"],
      condition: row.condition as EquipmentProps["condition"],
      description: row.description,
      brand: row.brand,
      model: row.model,
      price: row.price,
      rentPeriod: row.rent_period as EquipmentProps["rentPeriod"],
      city: row.city,
      state: row.state,
      additionalConditions: row.additional_conditions,
      imageUrls: row.image_urls ?? [],
      isAvailable: row.is_available,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };

    return Equipment.create(props);
  }

  static toPersistence(equipment: Equipment) {
    const json = equipment.toJSON();

    return {
      id: json.id as string,
      owner_id: json.ownerId,
      owner_name: json.ownerName,
      name: json.name,
      category: json.category,
      negotiation_type: json.negotiationType,
      condition: json.condition,
      description: json.description ?? null,
      brand: json.brand ?? null,
      model: json.model ?? null,
      price: json.price ?? null,
      rent_period: json.rentPeriod ?? null,
      city: json.city,
      state: json.state,
      additional_conditions: json.additionalConditions ?? null,
      image_urls: json.imageUrls ?? [],
      is_available: json.isAvailable,
      updated_at: new Date().toISOString(),
    };
  }
}





