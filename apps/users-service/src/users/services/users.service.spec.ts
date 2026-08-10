import { RpcException } from '@nestjs/microservices';
import { User } from '../entities/user.entity';
import { UsersRepository } from '../repositories/users.repository';
import { UsersService } from './users.service';

function rejectedValue(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => new Error('Expected the promise to reject.'),
    (error: unknown) => error,
  );
}

describe('UsersService', () => {
  const request = {
    firstName: ' Sam ',
    lastName: ' Taylor ',
    email: 'SAM@Example.com',
    password: 'SecurePassword123!',
  };

  it('normalizes input, hashes the password, and omits the hash', async () => {
    const createdAt = new Date('2026-08-10T12:00:00.000Z');
    const user = {
      id: '67f76ed1-bdcc-4286-9e3f-123fb4ab571e',
      firstName: 'Sam',
      lastName: 'Taylor',
      email: 'sam@example.com',
      passwordHash: 'hashed-password',
      createdAt,
      updatedAt: createdAt,
    } satisfies User;
    const usersRepository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(user),
    };
    const passwordHasher = {
      hash: jest.fn().mockResolvedValue('hashed-password'),
    };
    const service = new UsersService(
      usersRepository as unknown as UsersRepository,
      passwordHasher,
    );

    const result = await service.signup(request);

    expect(passwordHasher.hash).toHaveBeenCalledWith(request.password);
    expect(usersRepository.create).toHaveBeenCalledWith({
      firstName: 'Sam',
      lastName: 'Taylor',
      email: 'sam@example.com',
      passwordHash: 'hashed-password',
    });
    expect(result).toEqual({
      id: user.id,
      firstName: 'Sam',
      lastName: 'Taylor',
      email: 'sam@example.com',
      createdAt: createdAt.toISOString(),
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects an email that already exists', async () => {
    const usersRepository = {
      findByEmail: jest.fn().mockResolvedValue({ id: 'existing-user' }),
    };
    const service = new UsersService(
      usersRepository as unknown as UsersRepository,
      { hash: jest.fn() },
    );

    const error = await rejectedValue(service.signup(request));

    expect(error).toBeInstanceOf(RpcException);
    expect((error as RpcException).getError()).toEqual(
      expect.objectContaining({ code: 'DUPLICATE_USER_EMAIL' }),
    );
  });

  it('translates a database uniqueness race into the same RPC error', async () => {
    const usersRepository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockRejectedValue({ code: '23505' }),
    };
    const service = new UsersService(
      usersRepository as unknown as UsersRepository,
      {
        hash: jest.fn().mockResolvedValue('hashed-password'),
      },
    );

    const error = await rejectedValue(service.signup(request));

    expect(error).toBeInstanceOf(RpcException);
    expect((error as RpcException).getError()).toEqual(
      expect.objectContaining({ code: 'DUPLICATE_USER_EMAIL' }),
    );
  });
});
