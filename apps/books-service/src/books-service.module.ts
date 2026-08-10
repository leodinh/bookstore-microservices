import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BooksController } from './books/controllers/books.controller';
import { Book } from './books/entities/book.entity';
import { BooksRepository } from './books/repositories/books.repository';
import { BooksService } from './books/services/books.service';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([Book])],
  controllers: [BooksController],
  providers: [BooksService, BooksRepository],
})
export class BooksServiceModule {}
