import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { SignUpUseCase } from "../../application/commands/sign-up.use-case.js";
import { SignInUseCase } from "../../application/commands/sign-in.use-case.js";
import { GetCurrentUserUseCase } from "../../application/queries/get-current-user.use-case.js";
import { SignUpDto } from "../../application/dto/sign-up.dto.js";
import { SignInDto } from "../../application/dto/sign-in.dto.js";
import { AuthResponseDto } from "../../application/dto/auth-response.dto.js";
import { ProfileResponseDto } from "../../../profiles/application/dto/profile-response.dto.js";
import { SupabaseAuthGuard } from "../../../../core/auth/supabase-auth.guard.js";

@Controller("auth")
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(
    private readonly signUpUseCase: SignUpUseCase,
    private readonly signInUseCase: SignInUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase
  ) {}

  @Post("signup")
  async signUp(@Body() body: SignUpDto): Promise<AuthResponseDto> {
    return this.signUpUseCase.execute(body);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async signIn(@Body() body: SignInDto): Promise<AuthResponseDto> {
    return this.signInUseCase.execute(body);
  }

  @Get("me")
  @UseGuards(SupabaseAuthGuard)
  async me(@Req() req: any): Promise<ProfileResponseDto> {
    return this.getCurrentUserUseCase.execute({ accessToken: req.accessToken });
  }
}

