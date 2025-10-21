import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { z } from "zod";
import { CoreModule } from "./core/core.module.js";
import { ModulesModule } from "./modules/modules.module.js";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  GA_MEASUREMENT_ID: z.string().optional(),
  GA_API_SECRET: z.string().optional(),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => EnvSchema.parse(config),
    }),
    CoreModule,
    ModulesModule,
  ],
})
export class AppModule {}

