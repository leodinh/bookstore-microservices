import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MESSAGE_PATTERNS } from '@app/common';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class ApiGatewayService {
  constructor(
    @Inject('BOOKS_SERVICE') private readonly booksClient: ClientProxy,
  ) {}

  getBookCatalog() {
    const timeoutMs = Number(process.env.MICROSERVICE_TIMEOUT_MS ?? 5000);
    return firstValueFrom(
      this.booksClient
        .send(MESSAGE_PATTERNS.books.catalog.get, {})
        .pipe(timeout(timeoutMs)),
    );
  }
}
