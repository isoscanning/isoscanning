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
import { CreatePortfolioItemUseCase } from "../../application/commands/create-portfolio-item.use-case.js";
import { UpdatePortfolioItemUseCase } from "../../application/commands/update-portfolio-item.use-case.js";
import { DeletePortfolioItemUseCase } from "../../application/commands/delete-portfolio-item.use-case.js";
import { ListPortfolioUseCase } from "../../application/queries/list-portfolio.use-case.js";
import { GetPortfolioItemByIdUseCase } from "../../application/queries/get-portfolio-item-by-id.use-case.js";
import { CreatePortfolioItemDto } from "../../application/dto/create-portfolio-item.dto.js";
import { UpdatePortfolioItemDto } from "../../application/dto/update-portfolio-item.dto.js";
import { PortfolioItemResponseDto } from "../../application/dto/portfolio-item-response.dto.js";
import { SupabaseAuthGuard } from "../../../../core/auth/supabase-auth.guard.js";
import { CurrentUser } from "../../../../core/auth/current-user.decorator.js";

interface SupabaseUserPayload {
  id: string;
}

@Controller("portfolio")
@UseInterceptors(ClassSerializerInterceptor)
export class PortfolioController {
  constructor(
    private readonly createPortfolioItemUseCase: CreatePortfolioItemUseCase,
    private readonly updatePortfolioItemUseCase: UpdatePortfolioItemUseCase,
    private readonly deletePortfolioItemUseCase: DeletePortfolioItemUseCase,
    private readonly listPortfolioUseCase: ListPortfolioUseCase,
    private readonly getPortfolioItemByIdUseCase: GetPortfolioItemByIdUseCase
  ) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  async create(
    @Body() body: CreatePortfolioItemDto,
    @CurrentUser() user: SupabaseUserPayload
  ): Promise<PortfolioItemResponseDto> {
    const item = await this.createPortfolioItemUseCase.execute({
      ...body,
      professionalId: user.id,
      actorId: user.id,
    });
    return PortfolioItemResponseDto.fromEntity(item);
  }

  @Get()
  async list(@Query("professionalId") professionalId: string) {
    if (!professionalId) {
      return {
        data: [],
        total: 0,
        limit: 20,
        offset: 0,
      };
    }

    const items = await this.listPortfolioUseCase.execute({ professionalId });
    return {
      data: items.map((item) => PortfolioItemResponseDto.fromEntity(item)),
      total: items.length,
      limit: items.length,
      offset: 0,
    };
  }

  @Get(":id")
  async getById(@Param("id") id: string): Promise<PortfolioItemResponseDto> {
    const item = await this.getPortfolioItemByIdUseCase.execute({ id });
    return PortfolioItemResponseDto.fromEntity(item);
  }

  @UseGuards(SupabaseAuthGuard)
  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() body: UpdatePortfolioItemDto,
    @CurrentUser() user: SupabaseUserPayload
  ): Promise<PortfolioItemResponseDto> {
    const item = await this.updatePortfolioItemUseCase.execute({
      id,
      payload: body,
      actorId: user.id,
    });
    return PortfolioItemResponseDto.fromEntity(item);
  }

  @Delete(":id")
  @UseGuards(SupabaseAuthGuard)
  async delete(
    @Param("id") id: string,
    @CurrentUser() user: SupabaseUserPayload
  ): Promise<void> {
    await this.deletePortfolioItemUseCase.execute({ id, actorId: user.id });
  }
}
