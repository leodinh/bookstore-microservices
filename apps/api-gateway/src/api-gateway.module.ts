import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ThrottlerModule } from '@nestjs/throttler';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import {
  createGatewayResilienceConfig,
  GATEWAY_RESILIENCE_CONFIG,
} from './config/gateway-resilience.config';
import { GatewayThrottlerGuard } from './guards/gateway-throttler.guard';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { GatewayRouteRegistry } from './routing/gateway-route.registry';

const resilienceConfig = createGatewayResilienceConfig();

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: resilienceConfig.throttleTtlMs,
          limit: resilienceConfig.throttleLimit,
        },
      ],
    }),
    ClientsModule.register([
      {
        name: 'BOOKS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.BOOKS_SERVICE_HOST ?? '127.0.0.1',
          port: Number(process.env.BOOKS_SERVICE_PORT ?? 4002),
        },
      },
      {
        name: 'USERS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.USERS_SERVICE_HOST ?? '127.0.0.1',
          port: Number(process.env.USERS_SERVICE_PORT ?? 4001),
        },
      },
      {
        name: 'ORDERS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.ORDERS_SERVICE_HOST ?? '127.0.0.1',
          port: Number(process.env.ORDERS_SERVICE_PORT ?? 4003),
        },
      },
    ]),
  ],
  controllers: [ApiGatewayController],
  providers: [
    ApiGatewayService,
    GatewayRouteRegistry,
    {
      provide: GATEWAY_RESILIENCE_CONFIG,
      useValue: resilienceConfig,
    },
    {
      provide: APP_GUARD,
      useClass: GatewayThrottlerGuard,
    },
  ],
})
export class ApiGatewayModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
