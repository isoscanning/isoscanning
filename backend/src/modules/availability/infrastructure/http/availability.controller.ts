import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { CreateAvailabilityUseCase } from "../../application/commands/create-availability.use-case.js";
import { DeleteAvailabilityUseCase } from "../../application/commands/delete-availability.use-case.js";
import { ListAvailabilityUseCase } from "../../application/queries/list-availability.use-case.js";
import { CreateAvailabilityDto } from "../../application/dto/create-availability.dto.js";
import { ListAvailabilityDto } from "../../application/dto/list-availability.dto.js";
import { AvailabilityResponseDto } from "../../application/dto/availability-response.dto.js";
import { SupabaseAuthGuard } from "../../../../core/auth/supabase-auth.guard.js";
import { CurrentUser } from "../../../../core/auth/current-user.decorator.js";

interface SupabaseUserPayload {
  id: string;
}

@Controller("availability")
@UseInterceptors(ClassSerializerInterceptor)
export class AvailabilityController {
  constructor(
    private readonly createAvailabilityUseCase: CreateAvailabilityUseCase,
    private readonly deleteAvailabilityUseCase: DeleteAvailabilityUseCase,
    private readonly listAvailabilityUseCase: ListAvailabilityUseCase
  ) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  async create(
    @Body() body: CreateAvailabilityDto,
    @CurrentUser() user: SupabaseUserPayload
  ): Promise<AvailabilityResponseDto> {
    const slot = await this.createAvailabilityUseCase.execute({
      ...body,
      professionalId: user.id,
      actorId: user.id,
    });
    return AvailabilityResponseDto.fromEntity(slot);
  }

  @Get()
  async list(@Query() query: ListAvailabilityDto) {
    const slots = await this.listAvailabilityUseCase.execute(query);
    return slots.map((slot) => AvailabilityResponseDto.fromEntity(slot));
  }

  @Delete(":id")
  @UseGuards(SupabaseAuthGuard)
  async delete(
    @Param("id") id: string,
    @CurrentUser() user: SupabaseUserPayload
  ): Promise<void> {
    await this.deleteAvailabilityUseCase.execute({ id, actorId: user.id });
  }
}



