import { Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';

@Injectable()
export class PasswordHasher {
  hash(password: string): Promise<string> {
    const rounds = Number(process.env.PASSWORD_HASH_ROUNDS ?? 12);
    return hash(password, rounds);
  }
}
