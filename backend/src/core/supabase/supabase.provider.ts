import { ConfigService } from "@nestjs/config";
import { Provider } from "@nestjs/common";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CLIENT } from "../constants/injection-tokens.js";

export const SupabaseProvider: Provider = {
  provide: SUPABASE_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const url = configService.getOrThrow<string>("SUPABASE_URL");
    const serviceKey = configService.getOrThrow<string>(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    return createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  },
};
