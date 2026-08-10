import { Book } from '../entities/book.entity';
import { RpcException } from '@nestjs/microservices';
import { BooksRepository } from '../repositories/books.repository';
import { BooksService } from './books.service';

function rejectedValue(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => new Error('Expected the promise to reject.'),
    (error: unknown) => error,
  );
}

describe('BooksService', () => {
  const book = {
    id: '45a4a46d-e48f-4b28-9ec3-45281fbee2a5',
    title: 'Distributed Systems Fundamentals',
    author: 'Alex Morgan',
    isbn: '9780000000001',
    description: null,
    price: '39.99',
    availableQuantity: 0,
    soldQuantity: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies Book;

  it('derives availability from the inventory quantity', async () => {
    const repository = {
      findActiveCatalog: jest.fn().mockResolvedValue([book]),
    };
    const service = new BooksService(repository as unknown as BooksRepository);

    await expect(service.getCatalog()).resolves.toEqual([
      expect.objectContaining({
        id: book.id,
        price: '39.99',
        available: false,
      }),
    ]);
  });

  it('returns an active book by ID', async () => {
    const repository = {
      findActiveById: jest.fn().mockResolvedValue(book),
    };
    const service = new BooksService(repository as unknown as BooksRepository);

    await expect(service.getBook(book.id)).resolves.toEqual(
      expect.objectContaining({ id: book.id, available: false }),
    );
  });

  it('throws a structured RPC error when the book does not exist', async () => {
    const repository = {
      findActiveById: jest.fn().mockResolvedValue(null),
    };
    const service = new BooksService(repository as unknown as BooksRepository);

    const error = await rejectedValue(service.getBook('missing'));

    expect(error).toBeInstanceOf(RpcException);
    expect((error as RpcException).getError()).toEqual(
      expect.objectContaining({ code: 'BOOK_NOT_FOUND', statusCode: 404 }),
    );
  });
});
