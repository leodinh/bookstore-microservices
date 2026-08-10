import { BooksRepository } from './books.repository';

describe('BooksRepository', () => {
  it('queries only active books in title order', async () => {
    const typeOrmRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    const repository = new BooksRepository(typeOrmRepository as never);

    await repository.findActiveCatalog();

    expect(typeOrmRepository.find).toHaveBeenCalledWith({
      where: { isActive: true },
      order: { title: 'ASC' },
    });
  });
});
