import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateReviewDto {
  @IsString()
  professionalId!: string;

  @IsString()
  bookingId!: string;

  @IsString()
  clientId!: string;

  @IsString()
  clientName!: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}




