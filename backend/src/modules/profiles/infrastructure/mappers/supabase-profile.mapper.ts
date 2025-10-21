import { Profile, ProfileProps } from "../../domain/profile.entity.js";

export interface ProfileRow {
  id: string;
  user_type: string;
  display_name: string;
  artistic_name: string | null;
  specialty: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  portfolio_link: string | null;
  average_rating: number | null;
  total_reviews: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export class SupabaseProfileMapper {
  static toDomain(row: ProfileRow): Profile {
    const props: ProfileProps & {
      id: string;
      createdAt: Date;
      updatedAt?: Date;
    } = {
      id: row.id,
      userType: row.user_type as ProfileProps["userType"],
      displayName: row.display_name,
      artisticName: row.artistic_name,
      specialty: row.specialty,
      description: row.description,
      city: row.city,
      state: row.state,
      phone: row.phone,
      portfolioLink: row.portfolio_link,
      averageRating: row.average_rating,
      totalReviews: row.total_reviews,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };

    return Profile.create(props);
  }

  static toPersistence(profile: Profile) {
    const data = profile.toJSON();

    return {
      id: data.id as string,
      user_type: data.userType,
      display_name: data.displayName,
      artistic_name: data.artisticName ?? null,
      specialty: data.specialty ?? null,
      description: data.description ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      phone: data.phone ?? null,
      portfolio_link: data.portfolioLink ?? null,
      average_rating: data.averageRating ?? null,
      total_reviews: data.totalReviews ?? null,
      is_active: data.isActive,
      updated_at: new Date().toISOString(),
    };
  }
}




