import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RpcLoggingInterceptor } from '@app/common';
import { UsersController } from './users/controllers/users.controller';
import { User } from './users/entities/user.entity';
import { UsersRepository } from './users/repositories/users.repository';
import { PasswordHasher } from './users/services/password-hasher.service';
import { UsersService } from './users/services/users.service';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
    PasswordHasher,
    { provide: APP_INTERCEPTOR, useClass: RpcLoggingInterceptor },
  ],
})
export class UsersServiceModule {}
