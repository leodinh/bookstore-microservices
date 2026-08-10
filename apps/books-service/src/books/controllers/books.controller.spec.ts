import { BooksService } from '../services/books.service';
import { BooksController } from './books.controller';

describe('BooksController', () => {
  it('delegates the catalog message to the service', async () => {
    const catalog = [{ id: 'book-id' }];
    const service = {
      getCatalog: jest.fn().mockResolvedValue(catalog),
    };
    const controller = new BooksController(service as unknown as BooksService);

    await expect(controller.getCatalog()).resolves.toBe(catalog);
    expect(service.getCatalog).toHaveBeenCalledTimes(1);
  });
});
