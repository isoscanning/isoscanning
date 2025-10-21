import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from "class-validator";

export class SignUpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(8, 64)
  password!: string;

  @IsString()
  @MaxLength(120)
  displayName!: string;

  @IsEnum(["client", "professional"])
  userType!: "client" | "professional";

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;
}





