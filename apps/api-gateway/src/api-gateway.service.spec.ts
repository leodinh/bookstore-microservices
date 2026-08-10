import { HttpException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { MESSAGE_PATTERNS } from '@app/common';
import { ApiGatewayService } from './api-gateway.service';

function rejectedValue(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => new Error('Expected the promise to reject.'),
    (error: unknown) => error,
  );
}

describe('ApiGatewayService', () => {
  it('uses the controlled catalog message pattern', async () => {
    const send = jest.fn().mockReturnValue(of([{ id: 1 }]));
    const service = new ApiGatewayService({ send } as never);

    await expect(service.getBookCatalog()).resolves.toEqual([{ id: 1 }]);
    expect(send).toHaveBeenCalledWith(MESSAGE_PATTERNS.books.catalog.get, {});
  });

  it('sends a get-book request using the controlled pattern', async () => {
    const send = jest.fn().mockReturnValue(of({ id: 'book-id' }));
    const service = new ApiGatewayService({ send } as never);

    await service.getBook('book-id');

    expect(send).toHaveBeenCalledWith(MESSAGE_PATTERNS.books.book.get, {
      id: 'book-id',
    });
  });

  it('translates a structured RPC error into an HTTP exception', async () => {
    const send = jest.fn().mockReturnValue(
      throwError(() => ({
        statusCode: 404,
        code: 'BOOK_NOT_FOUND',
        message: 'The requested book was not found.',
      })),
    );
    const service = new ApiGatewayService({ send } as never);

    const error = await rejectedValue(service.getBook('missing'));

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(404);
  });
});
