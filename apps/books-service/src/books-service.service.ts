import { Injectable } from '@nestjs/common';

@Injectable()
export class BooksServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
