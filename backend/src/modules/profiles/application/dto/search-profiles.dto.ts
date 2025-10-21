import { Transform } from "class-transformer";
import { IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class SearchProfilesDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  userType?: "client" | "professional";

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @Min(0)
  minRating?: number;

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
