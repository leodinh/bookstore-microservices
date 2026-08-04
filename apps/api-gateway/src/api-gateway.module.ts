import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'BOOKS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.BOOKS_SERVICE_HOST ?? '127.0.0.1',
          port: Number(process.env.BOOKS_SERVICE_PORT ?? 4002),
        },
      },
    ]),
  ],
  controllers: [ApiGatewayController],
  providers: [ApiGatewayService],
})
export class ApiGatewayModule {}
