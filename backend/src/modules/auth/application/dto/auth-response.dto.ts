import { Expose, Type } from "class-transformer";
import { ProfileResponseDto } from "../../../profiles/application/dto/profile-response.dto.js";

export class AuthResponseDto {
  @Expose()
  accessToken!: string;

  @Expose()
  refreshToken!: string;

  @Expose()
  expiresIn!: number;

  @Expose()
  tokenType!: string;

  @Expose()
  @Type(() => ProfileResponseDto)
  user!: ProfileResponseDto;
}
