import { Transform } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import {
  EquipmentCondition,
  NegotiationType,
} from "../../domain/equipment.entity.js";

export class CreateEquipmentDto {
  @IsString()
  ownerId!: string;

  @IsString()
  ownerName!: string;

  @IsString()
  @MaxLength(150)
  name!: string;

  @IsString()
  category!: string;

  @IsEnum(["sale", "rent", "free"])
  negotiationType!: NegotiationType;

  @IsEnum(["new", "refurbished", "used"])
  condition!: EquipmentCondition;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @ValidateIf((o) => o.negotiationType !== "free")
  @IsNumber()
  @Transform(({ value }) => (value !== undefined ? Number(value) : value))
  @Min(0)
  price?: number;

  @ValidateIf((o) => o.negotiationType === "rent")
  @IsEnum(["day", "week", "month"])
  rentPeriod?: "day" | "week" | "month";

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  @IsOptional()
  @IsString()
  additionalConditions?: string;

  @IsArray()
  @IsString({ each: true })
  imageUrls!: string[];

  @IsBoolean()
  isAvailable!: boolean;
}





