import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateBookingDto {
  @IsString()
  professionalId!: string;

  @IsString()
  professionalName!: string;

  @IsString()
  clientId!: string;

  @IsString()
  clientName!: string;

  @IsEmail()
  clientEmail!: string;

  @IsString()
  serviceType!: string;

  @IsString()
  location!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsDateString()
  date!: string;

  @IsString()
  startTime!: string;

  @IsEnum(["pending", "confirmed", "completed", "cancelled"])
  status!: "pending" | "confirmed" | "completed" | "cancelled";
}





