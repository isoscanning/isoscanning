import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateQuoteDto {
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

  @IsDateString()
  serviceDate!: string;

  @IsString()
  location!: string;

  @IsString()
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsEnum(["pending", "answered", "cancelled"])
  status!: "pending" | "answered" | "cancelled";
}





