import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { CreateEquipmentUseCase } from "../../application/commands/create-equipment.use-case.js";
import { UpdateEquipmentUseCase } from "../../application/commands/update-equipment.use-case.js";
import { DeleteEquipmentUseCase } from "../../application/commands/delete-equipment.use-case.js";
import { GetEquipmentByIdUseCase } from "../../application/queries/get-equipment-by-id.use-case.js";
import { SearchEquipmentsUseCase } from "../../application/queries/search-equipments.use-case.js";
import { CreateEquipmentDto } from "../../application/dto/create-equipment.dto.js";
import { EquipmentResponseDto } from "../../application/dto/equipment-response.dto.js";
import { UpdateEquipmentDto } from "../../application/dto/update-equipment.dto.js";
import { SearchEquipmentDto } from "../../application/dto/search-equipment.dto.js";
import { GenerateEquipmentUploadUrlUseCase } from "../../application/commands/generate-equipment-upload-url.use-case.js";
import { SupabaseAuthGuard } from "../../../../core/auth/supabase-auth.guard.js";
import { CurrentUser } from "../../../../core/auth/current-user.decorator.js";

interface SupabaseUserPayload {
  id: string;
  user_metadata?: Record<string, unknown>;
}

@Controller("equipments")
@UseInterceptors(ClassSerializerInterceptor)
export class EquipmentsController {
  constructor(
    private readonly createEquipmentUseCase: CreateEquipmentUseCase,
    private readonly updateEquipmentUseCase: UpdateEquipmentUseCase,
    private readonly deleteEquipmentUseCase: DeleteEquipmentUseCase,
    private readonly getEquipmentByIdUseCase: GetEquipmentByIdUseCase,
    private readonly searchEquipmentsUseCase: SearchEquipmentsUseCase,
    private readonly generateUploadUrlUseCase: GenerateEquipmentUploadUrlUseCase
  ) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  async create(
    @Body() body: CreateEquipmentDto,
    @CurrentUser() user: SupabaseUserPayload
  ): Promise<EquipmentResponseDto> {
    const equipment = await this.createEquipmentUseCase.execute({
      ...body,
      ownerId: user.id,
      actorId: user.id,
    });
    return EquipmentResponseDto.fromEntity(equipment);
  }

  @Get()
  async search(@Query() query: SearchEquipmentDto) {
    const { data, total } = await this.searchEquipmentsUseCase.execute(query);

    return {
      data: data.map((equipment) => EquipmentResponseDto.fromEntity(equipment)),
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  @Get(":id")
  async getById(@Param("id") id: string): Promise<EquipmentResponseDto> {
    const equipment = await this.getEquipmentByIdUseCase.execute({ id });
    return EquipmentResponseDto.fromEntity(equipment);
  }

  @Put(":id")
  @UseGuards(SupabaseAuthGuard)
  async update(
    @Param("id") id: string,
    @Body() body: UpdateEquipmentDto,
    @CurrentUser() user: SupabaseUserPayload
  ): Promise<EquipmentResponseDto> {
    const equipment = await this.updateEquipmentUseCase.execute({
      id,
      payload: body,
      actorId: user.id,
    });
    return EquipmentResponseDto.fromEntity(equipment);
  }

  @Delete(":id")
  @UseGuards(SupabaseAuthGuard)
  async delete(
    @Param("id") id: string,
    @CurrentUser() user: SupabaseUserPayload
  ): Promise<void> {
    await this.deleteEquipmentUseCase.execute({ id, actorId: user.id });
  }

  @Post("upload-url")
  @UseGuards(SupabaseAuthGuard)
  async createUploadUrl(
    @Body() body: { ownerId?: string; fileName: string },
    @CurrentUser() user: SupabaseUserPayload
  ): Promise<{ path: string; uploadUrl: string }> {
    return this.generateUploadUrlUseCase.execute({
      ownerId: user.id,
      actorId: user.id,
      fileName: body.fileName,
    });
  }
}
