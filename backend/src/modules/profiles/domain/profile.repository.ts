import { Profile } from "./profile.entity.js";

export interface SearchProfilesFilters {
  query?: string;
  userType?: "client" | "professional";
  specialty?: string;
  state?: string;
  city?: string;
  minRating?: number;
  limit?: number;
  offset?: number;
}

export interface ProfilesRepository {
  create(profile: Profile): Promise<Profile>;
  findById(id: string): Promise<Profile | null>;
  search(
    filters: SearchProfilesFilters
  ): Promise<{ data: Profile[]; total: number }>;
  update(profile: Profile): Promise<Profile>;
}
