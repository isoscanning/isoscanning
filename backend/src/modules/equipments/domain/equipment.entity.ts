import { AggregateRoot } from "../../../shared/domain/aggregate-root.js";

export type NegotiationType = "sale" | "rent" | "free";
export type EquipmentCondition = "new" | "refurbished" | "used";

export interface EquipmentProps {
  ownerId: string;
  ownerName: string;
  name: string;
  category: string;
  negotiationType: NegotiationType;
  condition: EquipmentCondition;
  description?: string | null;
  brand?: string | null;
  model?: string | null;
  price?: number | null;
  rentPeriod?: "day" | "week" | "month" | null;
  city: string;
  state: string;
  additionalConditions?: string | null;
  imageUrls: string[];
  isAvailable: boolean;
  [key: string]: unknown;
}

export class Equipment extends AggregateRoot<EquipmentProps> {
  private constructor(
    props: EquipmentProps & { id?: string; createdAt?: Date; updatedAt?: Date }
  ) {
    super(props);
  }

  static create(
    props: EquipmentProps & { id?: string; createdAt?: Date; updatedAt?: Date }
  ) {
    return new Equipment(props);
  }

  update(props: Partial<EquipmentProps>) {
    this.props = { ...this.props, ...props };
    this.updatedAt = new Date();
  }

  markUnavailable() {
    this.props.isAvailable = false;
    this.updatedAt = new Date();
  }

  addImages(urls: string[]) {
    this.props.imageUrls = [...this.props.imageUrls, ...urls];
    this.updatedAt = new Date();
  }
}
