import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MESSAGE_PATTERNS } from '@app/common';
import { BooksService } from '../services/books.service';

@Controller()
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @MessagePattern(MESSAGE_PATTERNS.books.catalog.get)
  getCatalog() {
    return this.booksService.getCatalog();
  }
}
