import { BooksService } from '../services/books.service';
import { BooksController } from './books.controller';

describe('BooksController', () => {
  const correlationId = '5af19211-f08a-4c42-93e3-08cf638b739c';

  it('delegates a create-book message to the service', async () => {
    const request = {
      correlationId,
      title: 'A Book',
      author: 'An Author',
      isbn: '9780000000032',
      price: 19.99,
      availableQuantity: 5,
    };
    const book = { id: 'book-id' };
    const service = {
      createBook: jest.fn().mockResolvedValue(book),
    };
    const controller = new BooksController(service as unknown as BooksService);

    await expect(controller.createBook(request)).resolves.toBe(book);
    expect(service.createBook).toHaveBeenCalledWith(request);
  });

  it('delegates the catalog message to the service', async () => {
    const catalog = [{ id: 'book-id' }];
    const service = {
      getCatalog: jest.fn().mockResolvedValue(catalog),
    };
    const controller = new BooksController(service as unknown as BooksService);

    await expect(controller.getCatalog()).resolves.toBe(catalog);
    expect(service.getCatalog).toHaveBeenCalledTimes(1);
  });

  it('delegates a get-book message to the service', async () => {
    const book = { id: 'book-id' };
    const service = {
      getBook: jest.fn().mockResolvedValue(book),
    };
    const controller = new BooksController(service as unknown as BooksService);

    await expect(
      controller.getBook({ id: 'book-id', correlationId }),
    ).resolves.toBe(book);
    expect(service.getBook).toHaveBeenCalledWith('book-id');
  });

  it('delegates an update-book message to the service', async () => {
    const request = { id: 'book-id', price: 24.99, correlationId };
    const book = { id: 'book-id', price: '24.99' };
    const service = {
      updateBook: jest.fn().mockResolvedValue(book),
    };
    const controller = new BooksController(service as unknown as BooksService);

    await expect(controller.updateBook(request)).resolves.toBe(book);
    expect(service.updateBook).toHaveBeenCalledWith(request);
  });

  it('delegates a deactivate-book message to the service', async () => {
    const book = { id: 'book-id', isActive: false };
    const service = {
      deactivateBook: jest.fn().mockResolvedValue(book),
    };
    const controller = new BooksController(service as unknown as BooksService);

    await expect(
      controller.deactivateBook({ id: 'book-id', correlationId }),
    ).resolves.toBe(book);
    expect(service.deactivateBook).toHaveBeenCalledWith('book-id');
  });
});
