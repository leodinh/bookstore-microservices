import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Book } from '../apps/books-service/src/books/entities/book.entity';
import { OrderItem } from '../apps/orders-service/src/orders/entities/order-item.entity';
import { Order } from '../apps/orders-service/src/orders/entities/order.entity';
import { OutboxEvent } from '../apps/orders-service/src/orders/entities/outbox-event.entity';
import { Notification } from '../apps/notifications-service/src/notifications/entities/notification.entity';
import { User } from '../apps/users-service/src/users/entities/user.entity';

export default new DataSource({
  type: 'postgres',
  url:
    process.env.DATABASE_URL ??
    'postgresql://bookstore:bookstore@127.0.0.1:5433/bookstore',
  entities: [User, Book, Order, OrderItem, OutboxEvent, Notification],
  migrations: ['database/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
});
