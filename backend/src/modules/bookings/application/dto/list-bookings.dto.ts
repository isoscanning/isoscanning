import { Transform } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class ListBookingsDto {
  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsEnum(["pending", "confirmed", "completed", "cancelled"])
  status?: "pending" | "confirmed" | "completed" | "cancelled";

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

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





