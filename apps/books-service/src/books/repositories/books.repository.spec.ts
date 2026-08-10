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

  it('finds an active book by ID', async () => {
    const typeOrmRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    const repository = new BooksRepository(typeOrmRepository as never);

    await repository.findActiveById('book-id');

    expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'book-id', isActive: true },
    });
  });
});
