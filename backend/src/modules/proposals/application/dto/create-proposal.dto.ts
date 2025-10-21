import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateProposalDto {
  @IsString()
  equipmentId!: string;

  @IsString()
  equipmentName!: string;

  @IsString()
  buyerId!: string;

  @IsString()
  buyerName!: string;

  @IsString()
  sellerId!: string;

  @IsString()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsNumber()
  proposedPrice?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsString()
  @MaxLength(20)
  contactPhone!: string;

  @IsEnum(["pending", "accepted", "rejected"])
  status!: "pending" | "accepted" | "rejected";
}




