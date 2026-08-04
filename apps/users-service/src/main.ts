import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { UsersServiceModule } from './users-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    UsersServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.USERS_SERVICE_HOST ?? '127.0.0.1',
        port: Number(process.env.USERS_SERVICE_PORT ?? 4001),
      },
    },
  );
  await app.listen();
}

void bootstrap();
