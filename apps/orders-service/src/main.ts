import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { RpcValidationPipe } from '@app/common';
import { OrdersServiceModule } from './orders-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    OrdersServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: process.env.ORDERS_SERVICE_HOST ?? '127.0.0.1',
        port: Number(process.env.ORDERS_SERVICE_PORT ?? 4003),
      },
    },
  );
  app.useGlobalPipes(new RpcValidationPipe());
  await app.listen();
}

void bootstrap();
