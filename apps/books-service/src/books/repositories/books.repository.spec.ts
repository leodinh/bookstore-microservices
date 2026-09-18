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

  it('finds any book by ID', async () => {
    const typeOrmRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    const repository = new BooksRepository(typeOrmRepository as never);

    await repository.findById('book-id');

    expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'book-id' },
    });
  });

  it('finds a book by normalized ISBN', async () => {
    const typeOrmRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    const repository = new BooksRepository(typeOrmRepository as never);

    await repository.findByIsbn('9780000000032');

    expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
      where: { isbn: '9780000000032' },
    });
  });

  it('creates and saves a book entity', async () => {
    const input = {
      title: 'A Book',
      author: 'An Author',
      isbn: '9780000000032',
      description: null,
      price: '19.99',
      availableQuantity: 5,
      soldQuantity: 0,
      isActive: true,
    };
    const entity = { id: 'book-id', ...input };
    const typeOrmRepository = {
      create: jest.fn().mockReturnValue(entity),
      save: jest.fn().mockResolvedValue(entity),
    };
    const repository = new BooksRepository(typeOrmRepository as never);

    await repository.create(input);

    expect(typeOrmRepository.create).toHaveBeenCalledWith(input);
    expect(typeOrmRepository.save).toHaveBeenCalledWith(entity);
  });

  it('saves an updated book entity', async () => {
    const entity = { id: 'book-id', isActive: false };
    const typeOrmRepository = {
      save: jest.fn().mockResolvedValue(entity),
    };
    const repository = new BooksRepository(typeOrmRepository as never);

    await repository.save(entity as never);

    expect(typeOrmRepository.save).toHaveBeenCalledWith(entity);
  });
});
