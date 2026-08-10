import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users/controllers/users.controller';
import { User } from './users/entities/user.entity';
import { UsersRepository } from './users/repositories/users.repository';
import { PasswordHasher } from './users/services/password-hasher.service';
import { UsersService } from './users/services/users.service';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, PasswordHasher],
})
export class UsersServiceModule {}
