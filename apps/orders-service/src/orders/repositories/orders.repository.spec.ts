import { Book } from '../../../../books-service/src/books/entities/book.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { OrdersRepository } from './orders.repository';

describe('OrdersRepository', () => {
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
    const manager = {
      getRepository: jest
        .fn()
        .mockReturnValueOnce(booksRepository)
        .mockReturnValueOnce(ordersRepository)
        .mockReturnValueOnce(orderItemsRepository),
    };
    const dataSource = {
      transaction: jest.fn((operation: (value: unknown) => unknown) =>
        operation(manager),
      ),
    };
    const repository = new OrdersRepository(dataSource as never);
    const input = {
      userId: 'user-id',
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

    const result = await repository.runInTransaction(async (transaction) => {
      const lockedBooks = await transaction.findBooksForUpdate(['book-id']);
      await transaction.saveBooks(lockedBooks);
      return transaction.createOrder(input);
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
      status: input.status,
      totalAmount: input.totalAmount,
    });
    expect(orderItemsRepository.create).toHaveBeenCalledWith([
      { ...input.items[0], orderId: order.id },
    ]);
    expect(result).toEqual({ order, items: orderItems });
  });
});
