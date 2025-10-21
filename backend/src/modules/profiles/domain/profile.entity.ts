import { AggregateRoot } from "../../../shared/domain/aggregate-root.js";

export type UserType = "client" | "professional";

export interface ProfileProps {
  userType: UserType;
  displayName: string;
  artisticName?: string | null;
  specialty?: string | null;
  description?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  portfolioLink?: string | null;
  avatarUrl?: string | null;
  averageRating?: number | null;
  totalReviews?: number | null;
  isActive: boolean;
  [key: string]: unknown;
}

export class Profile extends AggregateRoot<ProfileProps> {
  private constructor(
    props: ProfileProps & { id?: string; createdAt?: Date; updatedAt?: Date }
  ) {
    super(props);
  }

  static create(
    props: ProfileProps & { id?: string; createdAt?: Date; updatedAt?: Date }
  ): Profile {
    return new Profile(props);
  }

  get userType() {
    return this.props.userType;
  }

  get displayName() {
    return this.props.displayName;
  }

  get artisticName() {
    return this.props.artisticName ?? null;
  }

  get city() {
    return this.props.city ?? null;
  }

  get state() {
    return this.props.state ?? null;
  }

  get isActive() {
    return this.props.isActive;
  }

  update(
    props: Partial<Omit<ProfileProps, "userType">> & { displayName?: string }
  ) {
    this.props = { ...this.props, ...props };
    this.updatedAt = new Date();
  }
}
