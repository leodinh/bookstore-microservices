import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Book } from '../../../../books-service/src/books/entities/book.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';

export interface NewOrderItemRecord {
  bookId: string;
  bookTitle: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface NewOrderRecord {
  userId: string;
  status: OrderStatus;
  totalAmount: string;
  items: NewOrderItemRecord[];
}

export interface SavedOrderRecord {
  order: Order;
  items: OrderItem[];
}

export interface OrdersTransaction {
  findBooksForUpdate: (bookIds: string[]) => Promise<Book[]>;
  saveBooks: (books: Book[]) => Promise<void>;
  createOrder: (input: NewOrderRecord) => Promise<SavedOrderRecord>;
}

@Injectable()
export class OrdersRepository {
  constructor(private readonly dataSource: DataSource) {}

  runInTransaction<T>(
    operation: (transaction: OrdersTransaction) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction((manager) =>
      operation(this.createTransaction(manager)),
    );
  }

  private createTransaction(manager: EntityManager): OrdersTransaction {
    const booksRepository = manager.getRepository(Book);
    const ordersRepository = manager.getRepository(Order);
    const orderItemsRepository = manager.getRepository(OrderItem);

    return {
      findBooksForUpdate: (bookIds) => {
        if (bookIds.length === 0) {
          return Promise.resolve([]);
        }

        return booksRepository
          .createQueryBuilder('book')
          .where('book.id IN (:...bookIds)', { bookIds })
          .orderBy('book.id', 'ASC')
          .setLock('pessimistic_write')
          .getMany();
      },
      saveBooks: async (books) => {
        await booksRepository.save(books);
      },
      createOrder: async (input) => {
        const order = await ordersRepository.save(
          ordersRepository.create({
            userId: input.userId,
            status: input.status,
            totalAmount: input.totalAmount,
          }),
        );
        const items = await orderItemsRepository.save(
          orderItemsRepository.create(
            input.items.map((item) => ({
              ...item,
              orderId: order.id,
            })),
          ),
        );

        return { order, items };
      },
    };
  }
}
