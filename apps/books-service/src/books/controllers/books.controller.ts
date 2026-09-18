import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateBookRequest,
  GetBookRequest,
  MESSAGE_PATTERNS,
  UpdateBookRequest,
} from '@app/common';
import { BooksService } from '../services/books.service';

@Controller()
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @MessagePattern(MESSAGE_PATTERNS.books.book.create)
  createBook(@Payload() request: CreateBookRequest) {
    return this.booksService.createBook(request);
  }

  @MessagePattern(MESSAGE_PATTERNS.books.catalog.get)
  getCatalog() {
    return this.booksService.getCatalog();
  }

  @MessagePattern(MESSAGE_PATTERNS.books.book.get)
  getBook(@Payload() request: GetBookRequest) {
    return this.booksService.getBook(request.id);
  }

  @MessagePattern(MESSAGE_PATTERNS.books.book.update)
  updateBook(@Payload() request: UpdateBookRequest) {
    return this.booksService.updateBook(request);
  }

  @MessagePattern(MESSAGE_PATTERNS.books.book.deactivate)
  deactivateBook(@Payload() request: GetBookRequest) {
    return this.booksService.deactivateBook(request.id);
  }
}
