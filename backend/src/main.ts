import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
  });

  const port = Number(process.env.PORT) || 4001;

  await app.listen(port);

  console.log(
    `🚀 Backend ejecutándose en http://localhost:${port}`,
  );
}

bootstrap().catch((error: unknown) => {
  console.error('No se pudo iniciar el backend', error);
  process.exitCode = 1;
});