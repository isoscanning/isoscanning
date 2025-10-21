import {
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  artisticName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  specialty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsUrl()
  portfolioLink?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  [key: string]: unknown;
}
