import { Global, Module } from "@nestjs/common";
import { SupabaseProvider } from "./supabase.provider.js";

@Global()
@Module({
  providers: [SupabaseProvider],
  exports: [SupabaseProvider],
})
export class SupabaseModule {}




