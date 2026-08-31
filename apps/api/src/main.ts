import "reflect-metadata";
import cookieParser from "cookie-parser";
import { loadEnv } from "./config/env";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  app.useLogger(app.get(Logger));
  app.use(cookieParser());
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }
  await app.listen(env.API_PORT, "0.0.0.0");
}

bootstrap().catch((err: unknown) => {
  console.error("Fatal bootstrap error", err);
  process.exit(1);
});
