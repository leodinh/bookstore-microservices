import { RpcValidationPipe } from '@app/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NotificationsServiceModule } from './notifications-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    NotificationsServiceModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [
          process.env.RABBITMQ_URL ??
            'amqp://bookstore:bookstore@127.0.0.1:5672',
        ],
        queue:
          process.env.RABBITMQ_NOTIFICATIONS_QUEUE ?? 'bookstore_notifications',
        queueOptions: { durable: true },
        noAck: false,
        prefetchCount: 10,
      },
    },
  );

  app.useGlobalPipes(new RpcValidationPipe());
  await app.listen();
}

void bootstrap();
