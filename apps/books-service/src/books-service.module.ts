import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BooksServiceController } from './books-service.controller';
import { BooksServiceService } from './books-service.service';
import { Book } from './books/entities/book.entity';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([Book])],
  controllers: [BooksServiceController],
  providers: [BooksServiceService],
})
export class BooksServiceModule {}
