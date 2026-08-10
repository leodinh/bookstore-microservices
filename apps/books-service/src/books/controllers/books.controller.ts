import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GetBookRequest, MESSAGE_PATTERNS } from '@app/common';
import { BooksService } from '../services/books.service';

@Controller()
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @MessagePattern(MESSAGE_PATTERNS.books.catalog.get)
  getCatalog() {
    return this.booksService.getCatalog();
  }

  @MessagePattern(MESSAGE_PATTERNS.books.book.get)
  getBook(@Payload() request: GetBookRequest) {
    return this.booksService.getBook(request.id);
  }
}
