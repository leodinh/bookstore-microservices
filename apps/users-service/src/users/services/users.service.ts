import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { SignupUserRequest, SignupUserResponse } from '@app/common';
import { UsersRepository } from '../repositories/users.repository';
import { PasswordHasher } from './password-hasher.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async signup(request: SignupUserRequest): Promise<SignupUserResponse> {
    const email = request.email.trim().toLowerCase();
    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) {
      throw this.duplicateEmailError();
    }

    const passwordHash = await this.passwordHasher.hash(request.password);

    try {
      const user = await this.usersRepository.create({
        firstName: request.firstName.trim(),
        lastName: request.lastName.trim(),
        email,
        passwordHash,
      });

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      };
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw this.duplicateEmailError();
      }
      throw error;
    }
  }

  private duplicateEmailError(): RpcException {
    return new RpcException({
      statusCode: 409,
      code: 'DUPLICATE_USER_EMAIL',
      message: 'A user with this email already exists.',
    });
  }

  private isUniqueViolation(error: unknown): error is { code: string } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === '23505'
    );
  }
}
