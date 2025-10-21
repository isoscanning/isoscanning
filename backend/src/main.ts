import "reflect-metadata";
import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
} from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const reflector = app.get(Reflector);
  const port = configService.get<number>("PORT", 4000);

  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));
  app.setGlobalPrefix("api");

  await app.listen(port);

  const logger = new Logger("Bootstrap");
  logger.log(`HTTP server running on http://localhost:${port}/api`);
}

void bootstrap();

