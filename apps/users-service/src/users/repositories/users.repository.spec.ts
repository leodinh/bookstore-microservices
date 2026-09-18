import { UsersRepository } from './users.repository';

describe('UsersRepository', () => {
  it('finds a user by id', async () => {
    const typeOrmRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    const repository = new UsersRepository(typeOrmRepository as never);

    await repository.findById('user-id');

    expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'user-id' },
    });
  });

  it('finds a user by email', async () => {
    const typeOrmRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    const repository = new UsersRepository(typeOrmRepository as never);

    await repository.findByEmail('sam@example.com');

    expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
      where: { email: 'sam@example.com' },
    });
  });

  it('creates and saves a user entity', async () => {
    const input = {
      firstName: 'Sam',
      lastName: 'Taylor',
      email: 'sam@example.com',
      passwordHash: 'hash',
    };
    const entity = { id: 'user-id', ...input };
    const typeOrmRepository = {
      create: jest.fn().mockReturnValue(entity),
      save: jest.fn().mockResolvedValue(entity),
    };
    const repository = new UsersRepository(typeOrmRepository as never);

    await repository.create(input);

    expect(typeOrmRepository.create).toHaveBeenCalledWith(input);
    expect(typeOrmRepository.save).toHaveBeenCalledWith(entity);
  });
});
