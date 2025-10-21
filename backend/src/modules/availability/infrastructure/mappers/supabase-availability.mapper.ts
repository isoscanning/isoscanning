import {
  Availability,
  AvailabilityProps,
} from "../../domain/availability.entity.js";

export interface AvailabilityRow {
  id: string;
  professional_id: string;
  date: string;
  start_time: string;
  end_time: string;
  type: string;
  reason: string | null;
  created_at: string;
  updated_at: string | null;
}

export class SupabaseAvailabilityMapper {
  static toDomain(row: AvailabilityRow): Availability {
    const props: AvailabilityProps & {
      id: string;
      createdAt: Date;
      updatedAt?: Date;
    } = {
      id: row.id,
      professionalId: row.professional_id,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      type: row.type as AvailabilityProps["type"],
      reason: row.reason,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };

    return Availability.create(props);
  }

  static toPersistence(slot: Availability) {
    const json = slot.toJSON();
    return {
      id: json.id as string,
      professional_id: json.professionalId,
      date: json.date,
      start_time: json.startTime,
      end_time: json.endTime,
      type: json.type,
      reason: json.reason ?? null,
      updated_at: new Date().toISOString(),
    };
  }
}





