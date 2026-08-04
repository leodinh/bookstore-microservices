import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { BooksServiceModule } from './books-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    BooksServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.BOOKS_SERVICE_HOST ?? '127.0.0.1',
        port: Number(process.env.BOOKS_SERVICE_PORT ?? 4002),
      },
    },
  );
  await app.listen();
}

void bootstrap();
