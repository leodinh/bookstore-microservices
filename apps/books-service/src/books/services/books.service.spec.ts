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

  it('normalizes and creates a new book', async () => {
    const createdBook = {
      ...book,
      id: 'cc2e50ca-fd12-433e-ae68-8d93e16ec9a1',
      title: 'A New Book',
      author: 'An Author',
      isbn: '9780000000032',
      description: 'A description',
      price: '19.90',
      availableQuantity: 5,
      soldQuantity: 0,
      isActive: true,
    };
    const repository = {
      findByIsbn: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(createdBook),
    };
    const service = new BooksService(repository as unknown as BooksRepository);

    const result = await service.createBook({
      title: ' A New Book ',
      author: ' An Author ',
      isbn: '978-0-00000-003-2',
      description: ' A description ',
      price: 19.9,
      availableQuantity: 5,
    });

    expect(repository.findByIsbn).toHaveBeenCalledWith('9780000000032');
    expect(repository.create).toHaveBeenCalledWith({
      title: 'A New Book',
      author: 'An Author',
      isbn: '9780000000032',
      description: 'A description',
      price: '19.90',
      availableQuantity: 5,
      soldQuantity: 0,
      isActive: true,
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: createdBook.id,
        isbn: '9780000000032',
        price: '19.90',
        isActive: true,
      }),
    );
  });

  it('rejects a duplicate ISBN before creating the book', async () => {
    const repository = {
      findByIsbn: jest.fn().mockResolvedValue(book),
      create: jest.fn(),
    };
    const service = new BooksService(repository as unknown as BooksRepository);

    const error = await rejectedValue(
      service.createBook({
        title: 'Duplicate',
        author: 'An Author',
        isbn: book.isbn,
        price: 10,
        availableQuantity: 1,
      }),
    );

    expect(error).toBeInstanceOf(RpcException);
    expect((error as RpcException).getError()).toEqual(
      expect.objectContaining({ code: 'DUPLICATE_BOOK_ISBN' }),
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

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

  it('updates only the supplied book fields', async () => {
    const bookToUpdate = { ...book, description: 'Original description' };
    const repository = {
      findById: jest.fn().mockResolvedValue(bookToUpdate),
      save: jest.fn((value: Book) => Promise.resolve(value)),
    };
    const service = new BooksService(repository as unknown as BooksRepository);

    const result = await service.updateBook({
      id: book.id,
      title: ' Updated Title ',
      price: 49.5,
      availableQuantity: 7,
    });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Updated Title',
        description: 'Original description',
        price: '49.50',
        availableQuantity: 7,
        author: book.author,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ title: 'Updated Title', price: '49.50' }),
    );
  });

  it('rejects an update with no fields', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ ...book }),
    };
    const service = new BooksService(repository as unknown as BooksRepository);

    const error = await rejectedValue(service.updateBook({ id: book.id }));

    expect(error).toBeInstanceOf(RpcException);
    expect((error as RpcException).getError()).toEqual(
      expect.objectContaining({ code: 'INVALID_BOOK_UPDATE' }),
    );
  });

  it('deactivates a book instead of deleting it', async () => {
    const bookToDeactivate = { ...book, isActive: true };
    const repository = {
      findById: jest.fn().mockResolvedValue(bookToDeactivate),
      save: jest.fn((value: Book) => Promise.resolve(value)),
    };
    const service = new BooksService(repository as unknown as BooksRepository);

    const result = await service.deactivateBook(book.id);

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: book.id, isActive: false }),
    );
    expect(result.isActive).toBe(false);
  });
});
