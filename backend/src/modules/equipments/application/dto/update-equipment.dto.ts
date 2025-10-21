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

export class UpdateEquipmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(["sale", "rent", "free"])
  negotiationType?: "sale" | "rent" | "free";

  @IsOptional()
  @IsEnum(["new", "refurbished", "used"])
  condition?: "new" | "refurbished" | "used";

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
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : value))
  @IsNumber()
  @Min(0)
  price?: number;

  @ValidateIf((o) => o.negotiationType === "rent")
  @IsOptional()
  @IsEnum(["day", "week", "month"])
  rentPeriod?: "day" | "week" | "month";

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  additionalConditions?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  [key: string]: unknown;
}
