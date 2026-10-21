import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix("api");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Comma-separated so the demo can be opened from more than one origin at once (e.g. localhost + a LAN IP).
  const allowedOrigins = config
    .getOrThrow<string>("FRONTEND_URL")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
  });

  const port = config.getOrThrow<number>("PORT");
  await app.listen(port);
  console.log(
    `EventPulse backend listening on ${config.getOrThrow<string>("EVENTPULSE_BACKEND_URL")}`,
  );
}
bootstrap();
