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
import { CreateBookingUseCase } from "../../application/commands/create-booking.use-case.js";
import { UpdateBookingStatusUseCase } from "../../application/commands/update-booking-status.use-case.js";
import { ListBookingsUseCase } from "../../application/queries/list-bookings.use-case.js";
import { GetBookingByIdUseCase } from "../../application/queries/get-booking-by-id.use-case.js";
import { CreateBookingDto } from "../../application/dto/create-booking.dto.js";
import { UpdateBookingStatusDto } from "../../application/dto/update-booking-status.dto.js";
import { ListBookingsDto } from "../../application/dto/list-bookings.dto.js";
import { BookingResponseDto } from "../../application/dto/booking-response.dto.js";
import { SupabaseAuthGuard } from "../../../../core/auth/supabase-auth.guard.js";
import { CurrentUser } from "../../../../core/auth/current-user.decorator.js";

interface SupabaseUserPayload {
  id: string;
}

@Controller("bookings")
@UseInterceptors(ClassSerializerInterceptor)
export class BookingsController {
  constructor(
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly updateBookingStatusUseCase: UpdateBookingStatusUseCase,
    private readonly listBookingsUseCase: ListBookingsUseCase,
    private readonly getBookingByIdUseCase: GetBookingByIdUseCase
  ) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  async create(
    @Body() body: CreateBookingDto,
    @CurrentUser() user: SupabaseUserPayload
  ): Promise<BookingResponseDto> {
    const booking = await this.createBookingUseCase.execute({
      ...body,
      clientId: user.id,
      actorId: user.id,
    });
    return BookingResponseDto.fromEntity(booking);
  }

  @Get()
  @UseGuards(SupabaseAuthGuard)
  async list(
    @Query() query: ListBookingsDto,
    @CurrentUser() user: SupabaseUserPayload
  ) {
    const filters = {
      ...query,
      clientId: query.clientId ?? undefined,
      professionalId: query.professionalId ?? undefined,
    };

    if (!filters.clientId && !filters.professionalId) {
      // default to client bookings
      filters.clientId = user.id;
    } else if (
      filters.clientId &&
      filters.clientId !== user.id &&
      filters.professionalId !== user.id
    ) {
      filters.clientId = user.id;
    }

    const { data, total } = await this.listBookingsUseCase.execute(filters);
    return {
      data: data.map((booking) => BookingResponseDto.fromEntity(booking)),
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
  ): Promise<BookingResponseDto> {
    const booking = await this.getBookingByIdUseCase.execute({
      id,
      actorId: user.id,
    });
    return BookingResponseDto.fromEntity(booking);
  }

  @Patch(":id/status")
  @UseGuards(SupabaseAuthGuard)
  async updateStatus(
    @Param("id") id: string,
    @Body() body: UpdateBookingStatusDto,
    @CurrentUser() user: SupabaseUserPayload
  ): Promise<BookingResponseDto> {
    const booking = await this.updateBookingStatusUseCase.execute({
      id,
      payload: body,
      actorId: user.id,
    });
    return BookingResponseDto.fromEntity(booking);
  }
}



