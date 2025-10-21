import { AggregateRoot } from "../../../shared/domain/aggregate-root.js";

export interface PortfolioItemProps {
  professionalId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  imageUrls: string[];
  order: number;
  [key: string]: unknown;
}

export class PortfolioItem extends AggregateRoot<PortfolioItemProps> {
  private constructor(
    props: PortfolioItemProps & {
      id?: string;
      createdAt?: Date;
      updatedAt?: Date;
    }
  ) {
    super(props);
  }

  static create(
    props: PortfolioItemProps & {
      id?: string;
      createdAt?: Date;
      updatedAt?: Date;
    }
  ) {
    return new PortfolioItem(props);
  }

  update(props: Partial<PortfolioItemProps>) {
    this.props = { ...this.props, ...props };
    this.updatedAt = new Date();
  }
}
