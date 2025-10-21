import { Equipment } from "./equipment.entity.js";

export interface EquipmentSearchFilters {
  query?: string;
  category?: string;
  negotiationType?: string;
  state?: string;
  city?: string;
  ownerId?: string;
  availableOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface EquipmentsRepository {
  create(equipment: Equipment): Promise<Equipment>;
  update(equipment: Equipment): Promise<Equipment>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Equipment | null>;
  search(
    filters: EquipmentSearchFilters
  ): Promise<{ data: Equipment[]; total: number }>;
}
