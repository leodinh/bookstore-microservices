import {
  GatewayTimeoutException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MESSAGE_PATTERNS } from '@app/common';
import {
  catchError,
  firstValueFrom,
  throwError,
  timeout,
  TimeoutError,
} from 'rxjs';

interface RpcErrorPayload {
  statusCode: number;
  code: string;
  message: string;
}

@Injectable()
export class ApiGatewayService {
  constructor(
    @Inject('BOOKS_SERVICE') private readonly booksClient: ClientProxy,
  ) {}

  getBookCatalog() {
    return this.sendToBooks(MESSAGE_PATTERNS.books.catalog.get, {});
  }

  getBook(id: string) {
    return this.sendToBooks(MESSAGE_PATTERNS.books.book.get, { id });
  }

  private sendToBooks(pattern: object, payload: object) {
    const timeoutMs = Number(process.env.MICROSERVICE_TIMEOUT_MS ?? 5000);
    return firstValueFrom(
      this.booksClient.send(pattern, payload).pipe(
        timeout(timeoutMs),
        catchError((error: unknown) =>
          throwError(() => this.toHttpException(error)),
        ),
      ),
    );
  }

  private toHttpException(error: unknown): HttpException {
    if (error instanceof TimeoutError) {
      return new GatewayTimeoutException({
        statusCode: 504,
        code: 'MICROSERVICE_TIMEOUT',
        message: 'The Books service did not respond in time.',
      });
    }

    if (this.isRpcError(error)) {
      return new HttpException(error, error.statusCode);
    }

    return new InternalServerErrorException({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    });
  }

  private isRpcError(error: unknown): error is RpcErrorPayload {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const candidate = error as Partial<RpcErrorPayload>;
    return (
      typeof candidate.statusCode === 'number' &&
      typeof candidate.code === 'string' &&
      typeof candidate.message === 'string'
    );
  }
}
