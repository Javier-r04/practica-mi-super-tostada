import "reflect-metadata";
import { loadEnv } from "./config/env";
import { NestFactory } from "@nestjs/core";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  await app.listen(env.API_PORT);
}

bootstrap().catch((err: unknown) => {
  console.error("Fatal bootstrap error", err);
  process.exit(1);
});
