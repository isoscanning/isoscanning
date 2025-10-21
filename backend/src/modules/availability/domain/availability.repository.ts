import { Availability } from "./availability.entity.js";

export interface AvailabilityRepository {
  create(slot: Availability): Promise<Availability>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Availability | null>;
  findByProfessional(
    professionalId: string,
    dateRange?: { from?: string; to?: string }
  ): Promise<Availability[]>;
}



