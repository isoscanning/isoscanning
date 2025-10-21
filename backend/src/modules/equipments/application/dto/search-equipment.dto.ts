import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class SearchEquipmentDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(["sale", "rent", "free"])
  negotiationType?: "sale" | "rent" | "free";

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value !== undefined ? value === "true" || value === true : true
  )
  @IsBoolean()
  availableOnly = true;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 20))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 0))
  @IsNumber()
  @Min(0)
  offset = 0;
}





