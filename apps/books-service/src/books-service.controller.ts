import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MESSAGE_PATTERNS } from '@app/common';

@Controller()
export class BooksServiceController {
  @MessagePattern(MESSAGE_PATTERNS.books.catalog.get)
  getCatalog() {
    return [
      {
        id: 1,
        title: 'Distributed Systems Fundamentals',
        author: 'Alex Morgan',
        price: 39.99,
        availableQuantity: 20,
        available: true,
      },
    ];
  }
}
