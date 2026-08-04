import { BooksServiceController } from './books-service.controller';

describe('BooksServiceController', () => {
  it('returns the milestone catalog', () => {
    const controller = new BooksServiceController();

    expect(controller.getCatalog()).toEqual([
      expect.objectContaining({
        id: 1,
        title: 'Distributed Systems Fundamentals',
        available: true,
      }),
    ]);
  });
});
