import { Booking, BookingProps } from "../../domain/booking.entity.js";

export interface BookingRow {
  id: string;
  professional_id: string;
  professional_name: string;
  client_id: string;
  client_name: string;
  client_email: string;
  service_type: string;
  location: string;
  notes: string | null;
  date: string;
  start_time: string;
  status: string;
  created_at: string;
  updated_at: string | null;
}

export class SupabaseBookingMapper {
  static toDomain(row: BookingRow): Booking {
    const props: BookingProps & {
      id: string;
      createdAt: Date;
      updatedAt?: Date;
    } = {
      id: row.id,
      professionalId: row.professional_id,
      professionalName: row.professional_name,
      clientId: row.client_id,
      clientName: row.client_name,
      clientEmail: row.client_email,
      serviceType: row.service_type,
      location: row.location,
      notes: row.notes,
      date: row.date,
      startTime: row.start_time,
      status: row.status as BookingProps["status"],
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };

    return Booking.create(props);
  }

  static toPersistence(booking: Booking) {
    const json = booking.toJSON();
    return {
      id: json.id as string,
      professional_id: json.professionalId,
      professional_name: json.professionalName,
      client_id: json.clientId,
      client_name: json.clientName,
      client_email: json.clientEmail,
      service_type: json.serviceType,
      location: json.location,
      notes: json.notes ?? null,
      date: json.date,
      start_time: json.startTime,
      status: json.status,
      updated_at: new Date().toISOString(),
    };
  }
}





