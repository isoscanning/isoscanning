import { Global, Module } from "@nestjs/common";
import { SupabaseModule } from "./supabase/supabase.module.js";
import { SupabaseAuthGuard } from "./auth/supabase-auth.guard.js";

@Global()
@Module({
  imports: [SupabaseModule],
  providers: [SupabaseAuthGuard],
  exports: [SupabaseAuthGuard],
})
export class CoreModule {}



