import { Transform } from "class-transformer";
import { IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class ListReviewsDto {
  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

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





