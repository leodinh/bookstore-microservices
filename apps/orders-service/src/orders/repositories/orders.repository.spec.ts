import { Book } from '../../../../books-service/src/books/entities/book.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { OrdersRepository } from './orders.repository';

describe('OrdersRepository', () => {
  it('loads one order with its item snapshots', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const dataSource = {
      getRepository: jest.fn().mockReturnValue({ findOne }),
    };
    const repository = new OrdersRepository(dataSource as never);

    await repository.findById('order-id');

    expect(findOne).toHaveBeenCalledWith({
      where: { id: 'order-id' },
      relations: { items: true },
    });
  });

  it('loads a user order history newest first', async () => {
    const find = jest.fn().mockResolvedValue([]);
    const dataSource = {
      getRepository: jest.fn().mockReturnValue({ find }),
    };
    const repository = new OrdersRepository(dataSource as never);

    await repository.findByUserId('user-id');

    expect(find).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });
  });

  it('loads an order by idempotency key with its item snapshots', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const dataSource = {
      getRepository: jest.fn().mockReturnValue({ findOne }),
    };
    const repository = new OrdersRepository(dataSource as never);

    await repository.findByIdempotencyKey('request-key');

    expect(findOne).toHaveBeenCalledWith({
      where: { idempotencyKey: 'request-key' },
      relations: { items: true },
    });
  });

  it('uses a write lock and saves the order inside one transaction', async () => {
    const book = { id: 'book-id' } as Book;
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([book]),
    };
    const booksRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      save: jest.fn().mockResolvedValue([book]),
    };
    const order = {
      id: 'order-id',
      userId: 'user-id',
      status: OrderStatus.CONFIRMED,
      totalAmount: '19.99',
    };
    const ordersRepository = {
      create: jest.fn().mockReturnValue(order),
      save: jest.fn().mockResolvedValue(order),
    };
    const orderItems = [{ id: 'item-id', orderId: order.id }];
    const orderItemsRepository = {
      create: jest.fn().mockReturnValue(orderItems),
      save: jest.fn().mockResolvedValue(orderItems),
    };
    const outboxEvent = { id: 'event-id' };
    const outboxEventsRepository = {
      create: jest.fn().mockReturnValue(outboxEvent),
      save: jest.fn().mockResolvedValue(outboxEvent),
    };
    const manager = {
      getRepository: jest
        .fn()
        .mockReturnValueOnce(booksRepository)
        .mockReturnValueOnce(ordersRepository)
        .mockReturnValueOnce(orderItemsRepository)
        .mockReturnValueOnce(outboxEventsRepository),
    };
    const dataSource = {
      transaction: jest.fn((operation: (value: unknown) => unknown) =>
        operation(manager),
      ),
    };
    const repository = new OrdersRepository(dataSource as never);
    const input = {
      userId: 'user-id',
      idempotencyKey: 'request-key',
      requestHash: 'a'.repeat(64),
      status: OrderStatus.CONFIRMED,
      totalAmount: '19.99',
      items: [
        {
          bookId: 'book-id',
          bookTitle: 'A Book',
          unitPrice: '19.99',
          quantity: 1,
          lineTotal: '19.99',
        },
      ],
    };
    const outboxInput = {
      id: 'event-id',
      eventType: 'orders.order.created',
      aggregateType: 'order',
      aggregateId: order.id,
      payload: { eventId: 'event-id', orderId: order.id },
      occurredAt: new Date('2026-08-12T12:00:00.000Z'),
    };

    const result = await repository.runInTransaction(async (transaction) => {
      const lockedBooks = await transaction.findBooksForUpdate(['book-id']);
      await transaction.saveBooks(lockedBooks);
      const saved = await transaction.createOrder(input);
      await transaction.saveOutboxEvent(outboxInput);
      return saved;
    });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'book.id IN (:...bookIds)',
      { bookIds: ['book-id'] },
    );
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('book.id', 'ASC');
    expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(booksRepository.save).toHaveBeenCalledWith([book]);
    expect(ordersRepository.create).toHaveBeenCalledWith({
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      requestHash: input.requestHash,
      status: input.status,
      totalAmount: input.totalAmount,
    });
    expect(orderItemsRepository.create).toHaveBeenCalledWith([
      { ...input.items[0], orderId: order.id },
    ]);
    expect(outboxEventsRepository.create).toHaveBeenCalledWith({
      ...outboxInput,
      nextAttemptAt: expect.any(Date) as Date,
    });
    expect(outboxEventsRepository.save).toHaveBeenCalledWith(outboxEvent);
    expect(result).toEqual({ order, items: orderItems });
  });
});
