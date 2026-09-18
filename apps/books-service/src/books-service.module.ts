import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RpcLoggingInterceptor } from '@app/common';
import { BooksController } from './books/controllers/books.controller';
import { Book } from './books/entities/book.entity';
import { BooksRepository } from './books/repositories/books.repository';
import { BooksService } from './books/services/books.service';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([Book])],
  controllers: [BooksController],
  providers: [
    BooksService,
    BooksRepository,
    { provide: APP_INTERCEPTOR, useClass: RpcLoggingInterceptor },
  ],
})
export class BooksServiceModule {}
