import { IsDateString, IsOptional, IsString } from "class-validator";

export class ListAvailabilityDto {
  @IsString()
  professionalId!: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}





