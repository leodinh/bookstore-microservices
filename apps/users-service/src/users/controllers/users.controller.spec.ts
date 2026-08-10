import { UsersService } from '../services/users.service';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  it('delegates the get-user message to the service', async () => {
    const response = { id: 'user-id' };
    const usersService = {
      getUser: jest.fn().mockResolvedValue(response),
    };
    const controller = new UsersController(
      usersService as unknown as UsersService,
    );

    await expect(controller.getUser({ id: 'user-id' })).resolves.toBe(response);
    expect(usersService.getUser).toHaveBeenCalledWith('user-id');
  });

  it('delegates the signup message to the service', async () => {
    const request = {
      firstName: 'Sam',
      lastName: 'Taylor',
      email: 'sam@example.com',
      password: 'SecurePassword123!',
    };
    const response = { id: 'user-id' };
    const usersService = {
      signup: jest.fn().mockResolvedValue(response),
    };
    const controller = new UsersController(
      usersService as unknown as UsersService,
    );

    await expect(controller.signup(request)).resolves.toBe(response);
    expect(usersService.signup).toHaveBeenCalledWith(request);
  });
});
