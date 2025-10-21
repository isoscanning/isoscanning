import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "../constants/injection-tokens.js";

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers["authorization"];

    if (!authorization) {
      throw new UnauthorizedException("Missing authorization header");
    }

    const token = authorization.replace(/Bearer\s+/i, "").trim();

    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    const { data, error } = await this.supabase.auth.getUser(token);

    if (error || !data?.user) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    request.supabaseUser = data.user;
    request.accessToken = token;

    return true;
  }
}
