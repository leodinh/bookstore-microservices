import { Book } from '../entities/book.entity';
import { BooksRepository } from '../repositories/books.repository';
import { BooksService } from './books.service';

describe('BooksService', () => {
  it('derives availability from the inventory quantity', async () => {
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
});
