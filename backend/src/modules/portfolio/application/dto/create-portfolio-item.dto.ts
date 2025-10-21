import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreatePortfolioItemDto {
  @IsString()
  professionalId!: string;

  @IsString()
  @MaxLength(150)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsArray()
  @IsString({ each: true })
  imageUrls!: string[];

  @IsNumber()
  @Min(0)
  order!: number;
}





