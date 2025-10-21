import { Entity } from "./entity.js";

export abstract class AggregateRoot<
  Props extends Record<string, unknown>
> extends Entity<Props> {}




