import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { GetProfileByIdUseCase } from "../../application/queries/get-profile-by-id.use-case.js";
import { SearchProfilesUseCase } from "../../application/queries/search-profiles.use-case.js";
import { UpdateProfileUseCase } from "../../application/commands/update-profile.use-case.js";
import { ProfileResponseDto } from "../../application/dto/profile-response.dto.js";
import { SearchProfilesDto } from "../../application/dto/search-profiles.dto.js";
import { UpdateProfileDto } from "../../application/dto/update-profile.dto.js";
import { SupabaseAuthGuard } from "../../../../core/auth/supabase-auth.guard.js";
import { CurrentUser } from "../../../../core/auth/current-user.decorator.js";

interface SupabaseUserPayload {
  id: string;
}

@Controller("profiles")
@UseInterceptors(ClassSerializerInterceptor)
export class ProfilesController {
  constructor(
    private readonly getProfileByIdUseCase: GetProfileByIdUseCase,
    private readonly searchProfilesUseCase: SearchProfilesUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase
  ) {}

  @Get(":id")
  async getProfile(@Param("id") id: string): Promise<ProfileResponseDto> {
    const profile = await this.getProfileByIdUseCase.execute({ id });

    return ProfileResponseDto.fromEntity(profile);
  }

  @Get()
  async search(@Query() query: SearchProfilesDto) {
    const { data, total } = await this.searchProfilesUseCase.execute(query);

    return {
      data: data.map((profile) => ProfileResponseDto.fromEntity(profile)),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  @UseGuards(SupabaseAuthGuard)
  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() body: UpdateProfileDto,
    @CurrentUser() user: SupabaseUserPayload
  ): Promise<ProfileResponseDto> {
    if (user.id !== id) {
      throw new ForbiddenException("You can only update your own profile");
    }

    const profile = await this.updateProfileUseCase.execute({
      id,
      payload: body,
    });
    return ProfileResponseDto.fromEntity(profile);
  }
}


