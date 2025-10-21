import { Transform } from "class-transformer";
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class ListProposalsDto {
  @IsOptional()
  @IsString()
  equipmentId?: string;

  @IsOptional()
  @IsString()
  buyerId?: string;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsEnum(["pending", "accepted", "rejected"])
  status?: "pending" | "accepted" | "rejected";

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




