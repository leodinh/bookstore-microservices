import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RpcLoggingInterceptor } from '@app/common';
import { Book } from '../../books-service/src/books/entities/book.entity';
import { User } from '../../users-service/src/users/entities/user.entity';
import { OrdersController } from './orders/controllers/orders.controller';
import { Order } from './orders/entities/order.entity';
import { OrderItem } from './orders/entities/order-item.entity';
import { OrdersRepository } from './orders/repositories/orders.repository';
import { OrdersService } from './orders/services/orders.service';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([User, Book, Order, OrderItem]),
    ClientsModule.register([
      {
        name: 'USERS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.USERS_SERVICE_HOST ?? '127.0.0.1',
          port: Number(process.env.USERS_SERVICE_PORT ?? 4001),
        },
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersRepository,
    { provide: APP_INTERCEPTOR, useClass: RpcLoggingInterceptor },
  ],
})
export class OrdersServiceModule {}
