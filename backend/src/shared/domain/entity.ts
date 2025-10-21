import { randomUUID } from "crypto";

export abstract class Entity<Props extends Record<string, unknown>> {
  protected readonly _id: string;
  protected props: Props;
  protected readonly createdAt: Date;
  protected updatedAt: Date | null;

  protected constructor(
    props: Props & { id?: string; createdAt?: Date; updatedAt?: Date }
  ) {
    const { id, createdAt, updatedAt, ...rest } = props;

    this._id = id ?? randomUUID();
    this.props = rest as Props;
    this.createdAt = createdAt ?? new Date();
    this.updatedAt = updatedAt ?? null;
  }

  get id(): string {
    return this._id;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      ...this.props,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}


