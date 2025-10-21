import { Module } from "@nestjs/common";
import { AuthController } from "./infrastructure/http/auth.controller.js";
import { SignUpUseCase } from "./application/commands/sign-up.use-case.js";
import { SignInUseCase } from "./application/commands/sign-in.use-case.js";
import { GetCurrentUserUseCase } from "./application/queries/get-current-user.use-case.js";
import { ProfilesModule } from "../profiles/profiles.module.js";

@Module({
  imports: [ProfilesModule],
  controllers: [AuthController],
  providers: [SignUpUseCase, SignInUseCase, GetCurrentUserUseCase],
  exports: [SignUpUseCase, SignInUseCase, GetCurrentUserUseCase],
})
export class AuthModule {}




