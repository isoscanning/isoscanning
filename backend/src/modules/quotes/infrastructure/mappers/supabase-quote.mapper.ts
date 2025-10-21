import {
  QuoteRequest,
  QuoteRequestProps,
} from "../../domain/quote-request.entity.js";

export interface QuoteRow {
  id: string;
  professional_id: string;
  professional_name: string;
  client_id: string;
  client_name: string;
  client_email: string;
  service_type: string;
  service_date: string;
  location: string;
  description: string;
  budget: number | null;
  status: string;
  created_at: string;
  updated_at: string | null;
}

export class SupabaseQuoteMapper {
  static toDomain(row: QuoteRow): QuoteRequest {
    const props: QuoteRequestProps & {
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
      serviceDate: row.service_date,
      location: row.location,
      description: row.description,
      budget: row.budget,
      status: row.status as QuoteRequestProps["status"],
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };

    return QuoteRequest.create(props);
  }

  static toPersistence(quote: QuoteRequest) {
    const json = quote.toJSON();
    return {
      id: json.id as string,
      professional_id: json.professionalId,
      professional_name: json.professionalName,
      client_id: json.clientId,
      client_name: json.clientName,
      client_email: json.clientEmail,
      service_type: json.serviceType,
      service_date: json.serviceDate,
      location: json.location,
      description: json.description,
      budget: json.budget ?? null,
      status: json.status,
      updated_at: new Date().toISOString(),
    };
  }
}





