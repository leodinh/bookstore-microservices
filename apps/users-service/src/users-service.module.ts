import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersServiceController } from './users-service.controller';
import { UsersServiceService } from './users-service.service';
import { User } from './users/entities/user.entity';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([User])],
  controllers: [UsersServiceController],
  providers: [UsersServiceService],
})
export class UsersServiceModule {}
