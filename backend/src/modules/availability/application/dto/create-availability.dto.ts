import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

export class CreateAvailabilityDto {
  @IsString()
  professionalId!: string;

  @IsDateString()
  date!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string;

  @IsEnum(["available", "blocked"])
  type!: "available" | "blocked";

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}





