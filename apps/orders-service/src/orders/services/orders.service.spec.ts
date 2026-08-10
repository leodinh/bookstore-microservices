import { RpcException } from '@nestjs/microservices';
import { MESSAGE_PATTERNS } from '@app/common';
import { of, throwError } from 'rxjs';
import { Book } from '../../../../books-service/src/books/entities/book.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';
import {
  OrdersRepository,
  OrdersTransaction,
} from '../repositories/orders.repository';
import { OrdersService } from './orders.service';

function rejectedValue(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => new Error('Expected the promise to reject.'),
    (error: unknown) => error,
  );
}

describe('OrdersService', () => {
  const userId = '67f76ed1-bdcc-4286-9e3f-123fb4ab571e';
  const bookId = 'd92eb1d3-6ca5-4ae1-a463-1ce744949e95';

  it('returns an order with its item snapshots', async () => {
    const item = {
      bookId,
      bookTitle: 'Historical Title',
      unitPrice: '19.99',
      quantity: 2,
      lineTotal: '39.98',
    } as OrderItem;
    const order = {
      id: 'order-id',
      userId,
      status: OrderStatus.CONFIRMED,
      totalAmount: '39.98',
      items: [item],
      createdAt: new Date('2026-08-10T12:00:00.000Z'),
    } as Order;
    const ordersRepository = {
      findById: jest.fn().mockResolvedValue(order),
    };
    const service = new OrdersService(
      {} as never,
      ordersRepository as unknown as OrdersRepository,
    );

    await expect(service.getOrder(order.id)).resolves.toEqual({
      id: order.id,
      userId,
      status: OrderStatus.CONFIRMED,
      totalAmount: '39.98',
      items: [
        {
          bookId,
          bookTitle: 'Historical Title',
          unitPrice: '19.99',
          quantity: 2,
          lineTotal: '39.98',
        },
      ],
      createdAt: '2026-08-10T12:00:00.000Z',
    });
  });

  it('rejects an unknown order id', async () => {
    const ordersRepository = {
      findById: jest.fn().mockResolvedValue(null),
    };
    const service = new OrdersService(
      {} as never,
      ordersRepository as unknown as OrdersRepository,
    );

    const error = await rejectedValue(service.getOrder('missing-order'));

    expect(error).toBeInstanceOf(RpcException);
    expect((error as RpcException).getError()).toEqual(
      expect.objectContaining({ code: 'ORDER_NOT_FOUND' }),
    );
  });

  it('validates the user before returning their order history', async () => {
    const ordersRepository = {
      findByUserId: jest.fn().mockResolvedValue([]),
    };
    const send = jest.fn().mockReturnValue(of({ id: userId }));
    const service = new OrdersService(
      { send } as never,
      ordersRepository as unknown as OrdersRepository,
    );

    await expect(service.listUserOrders(userId)).resolves.toEqual([]);

    expect(send).toHaveBeenCalledWith(MESSAGE_PATTERNS.users.account.get, {
      id: userId,
    });
    expect(ordersRepository.findByUserId).toHaveBeenCalledWith(userId);
  });

  it('validates the user, merges duplicate items, and creates an exact total', async () => {
    const book = {
      id: bookId,
      title: 'Distributed Systems Fundamentals',
      price: '39.99',
      availableQuantity: 5,
      soldQuantity: 1,
      isActive: true,
    } as Book;
    const transaction: OrdersTransaction = {
      findBooksForUpdate: jest.fn().mockResolvedValue([book]),
      saveBooks: jest.fn().mockResolvedValue(undefined),
      createOrder: jest.fn((input) =>
        Promise.resolve({
          order: {
            id: 'order-id',
            userId: input.userId,
            status: input.status,
            totalAmount: input.totalAmount,
            createdAt: new Date('2026-08-10T12:00:00.000Z'),
          } as Order,
          items: input.items.map(
            (item, index) =>
              ({
                id: `item-${index}`,
                orderId: 'order-id',
                ...item,
              }) as OrderItem,
          ),
        }),
      ),
    };
    const ordersRepository = {
      runInTransaction: jest.fn(
        (operation: (value: OrdersTransaction) => Promise<unknown>) =>
          operation(transaction),
      ),
    };
    const send = jest.fn().mockReturnValue(
      of({
        id: userId,
        firstName: 'Sam',
        lastName: 'Taylor',
        email: 'sam@example.com',
      }),
    );
    const service = new OrdersService(
      { send } as never,
      ordersRepository as unknown as OrdersRepository,
    );

    const result = await service.createOrder({
      userId,
      items: [
        { bookId, quantity: 1 },
        { bookId, quantity: 2 },
      ],
    });

    expect(send).toHaveBeenCalledWith(MESSAGE_PATTERNS.users.account.get, {
      id: userId,
    });
    expect(transaction.findBooksForUpdate).toHaveBeenCalledWith([bookId]);
    expect(book.availableQuantity).toBe(2);
    expect(book.soldQuantity).toBe(4);
    expect(transaction.saveBooks).toHaveBeenCalledWith([book]);
    expect(transaction.createOrder).toHaveBeenCalledWith({
      userId,
      status: OrderStatus.CONFIRMED,
      totalAmount: '119.97',
      items: [
        {
          bookId,
          bookTitle: book.title,
          unitPrice: '39.99',
          quantity: 3,
          lineTotal: '119.97',
        },
      ],
    });
    expect(result).toEqual({
      id: 'order-id',
      userId,
      status: OrderStatus.CONFIRMED,
      totalAmount: '119.97',
      items: [
        {
          bookId,
          bookTitle: book.title,
          unitPrice: '39.99',
          quantity: 3,
          lineTotal: '119.97',
        },
      ],
      createdAt: '2026-08-10T12:00:00.000Z',
    });
  });

  it('rejects insufficient stock before saving anything', async () => {
    const book = {
      id: bookId,
      title: 'Distributed Systems Fundamentals',
      price: '39.99',
      availableQuantity: 1,
      soldQuantity: 0,
      isActive: true,
    } as Book;
    const transaction: OrdersTransaction = {
      findBooksForUpdate: jest.fn().mockResolvedValue([book]),
      saveBooks: jest.fn(),
      createOrder: jest.fn(),
    };
    const ordersRepository = {
      runInTransaction: jest.fn(
        (operation: (value: OrdersTransaction) => Promise<unknown>) =>
          operation(transaction),
      ),
    };
    const service = new OrdersService(
      { send: jest.fn().mockReturnValue(of({ id: userId })) } as never,
      ordersRepository as unknown as OrdersRepository,
    );

    const error = await rejectedValue(
      service.createOrder({
        userId,
        items: [{ bookId, quantity: 2 }],
      }),
    );

    expect(error).toBeInstanceOf(RpcException);
    expect((error as RpcException).getError()).toEqual(
      expect.objectContaining({ code: 'INSUFFICIENT_STOCK' }),
    );
    expect(transaction.saveBooks).not.toHaveBeenCalled();
    expect(transaction.createOrder).not.toHaveBeenCalled();
  });

  it('preserves a structured Users service error and skips the transaction', async () => {
    const usersError = {
      statusCode: 404,
      code: 'USER_NOT_FOUND',
      message: 'The requested user was not found.',
    };
    const ordersRepository = {
      runInTransaction: jest.fn(),
    };
    const service = new OrdersService(
      {
        send: jest.fn().mockReturnValue(throwError(() => usersError)),
      } as never,
      ordersRepository as unknown as OrdersRepository,
    );

    const error = await rejectedValue(
      service.createOrder({ userId, items: [{ bookId, quantity: 1 }] }),
    );

    expect(error).toBeInstanceOf(RpcException);
    expect((error as RpcException).getError()).toEqual(usersError);
    expect(ordersRepository.runInTransaction).not.toHaveBeenCalled();
  });
});
