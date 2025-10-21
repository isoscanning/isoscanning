import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { CreateProposalUseCase } from "../../application/commands/create-proposal.use-case.js";
import { UpdateProposalStatusUseCase } from "../../application/commands/update-proposal-status.use-case.js";
import { ListProposalsUseCase } from "../../application/queries/list-proposals.use-case.js";
import { GetProposalByIdUseCase } from "../../application/queries/get-proposal-by-id.use-case.js";
import { CreateProposalDto } from "../../application/dto/create-proposal.dto.js";
import { UpdateProposalStatusDto } from "../../application/dto/update-proposal-status.dto.js";
import { ListProposalsDto } from "../../application/dto/list-proposals.dto.js";
import { ProposalResponseDto } from "../../application/dto/proposal-response.dto.js";
import { SupabaseAuthGuard } from "../../../../core/auth/supabase-auth.guard.js";
import { CurrentUser } from "../../../../core/auth/current-user.decorator.js";

interface SupabaseUserPayload {
  id: string;
}

@Controller("proposals")
@UseInterceptors(ClassSerializerInterceptor)
export class ProposalsController {
  constructor(
    private readonly createProposalUseCase: CreateProposalUseCase,
    private readonly updateProposalStatusUseCase: UpdateProposalStatusUseCase,
    private readonly listProposalsUseCase: ListProposalsUseCase,
    private readonly getProposalByIdUseCase: GetProposalByIdUseCase
  ) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  async create(
    @Body() body: CreateProposalDto,
    @CurrentUser() user: SupabaseUserPayload
  ): Promise<ProposalResponseDto> {
    const proposal = await this.createProposalUseCase.execute({
      ...body,
      buyerId: user.id,
      actorId: user.id,
    });
    return ProposalResponseDto.fromEntity(proposal);
  }

  @Get()
  @UseGuards(SupabaseAuthGuard)
  async list(
    @Query() query: ListProposalsDto,
    @CurrentUser() user: SupabaseUserPayload
  ) {
    const filters = { ...query };
    if (!filters.buyerId && !filters.sellerId) {
      filters.buyerId = user.id;
    } else if (
      filters.buyerId &&
      filters.buyerId !== user.id &&
      filters.sellerId !== user.id
    ) {
      filters.buyerId = user.id;
    }

    const { data, total } = await this.listProposalsUseCase.execute(filters);
    return {
      data: data.map((proposal) => ProposalResponseDto.fromEntity(proposal)),
      total,
      limit: filters.limit,
      offset: filters.offset,
    };
  }

  @Get(":id")
  @UseGuards(SupabaseAuthGuard)
  async getById(
    @Param("id") id: string,
    @CurrentUser() user: SupabaseUserPayload
  ): Promise<ProposalResponseDto> {
    const proposal = await this.getProposalByIdUseCase.execute({
      id,
      actorId: user.id,
    });
    return ProposalResponseDto.fromEntity(proposal);
  }

  @Patch(":id/status")
  @UseGuards(SupabaseAuthGuard)
  async updateStatus(
    @Param("id") id: string,
    @Body() body: UpdateProposalStatusDto,
    @CurrentUser() user: SupabaseUserPayload
  ): Promise<ProposalResponseDto> {
    const proposal = await this.updateProposalStatusUseCase.execute({
      id,
      payload: body,
      actorId: user.id,
    });
    return ProposalResponseDto.fromEntity(proposal);
  }
}


