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
    const service = new ApiGatewayService(
      { send } as never,
      {} as never,
      {} as never,
    );

    await expect(service.getBookCatalog()).resolves.toEqual([{ id: 1 }]);
    expect(send).toHaveBeenCalledWith(MESSAGE_PATTERNS.books.catalog.get, {});
  });

  it('sends a get-book request using the controlled pattern', async () => {
    const send = jest.fn().mockReturnValue(of({ id: 'book-id' }));
    const service = new ApiGatewayService(
      { send } as never,
      {} as never,
      {} as never,
    );

    await service.getBook('book-id');

    expect(send).toHaveBeenCalledWith(MESSAGE_PATTERNS.books.book.get, {
      id: 'book-id',
    });
  });

  it('sends create-book through the controlled Books pattern', async () => {
    const send = jest.fn().mockReturnValue(of({ id: 'book-id' }));
    const service = new ApiGatewayService(
      { send } as never,
      {} as never,
      {} as never,
    );
    const request = {
      title: 'A Book',
      author: 'An Author',
      isbn: '9780000000032',
      price: 19.99,
      availableQuantity: 5,
    };

    await service.createBook(request);

    expect(send).toHaveBeenCalledWith(
      MESSAGE_PATTERNS.books.book.create,
      request,
    );
  });

  it('sends update-book with its path id', async () => {
    const send = jest.fn().mockReturnValue(of({ id: 'book-id' }));
    const service = new ApiGatewayService(
      { send } as never,
      {} as never,
      {} as never,
    );

    await service.updateBook('book-id', { price: 24.99 });

    expect(send).toHaveBeenCalledWith(MESSAGE_PATTERNS.books.book.update, {
      id: 'book-id',
      price: 24.99,
    });
  });

  it('maps HTTP deletion to book deactivation', async () => {
    const send = jest.fn().mockReturnValue(of({ id: 'book-id' }));
    const service = new ApiGatewayService(
      { send } as never,
      {} as never,
      {} as never,
    );

    await service.deactivateBook('book-id');

    expect(send).toHaveBeenCalledWith(MESSAGE_PATTERNS.books.book.deactivate, {
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
    const service = new ApiGatewayService(
      { send } as never,
      {} as never,
      {} as never,
    );

    const error = await rejectedValue(service.getBook('missing'));

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(404);
  });

  it('sends signup through the Users client', async () => {
    const send = jest.fn().mockReturnValue(of({ id: 'user-id' }));
    const service = new ApiGatewayService(
      {} as never,
      { send } as never,
      {} as never,
    );
    const request = {
      firstName: 'Sam',
      lastName: 'Taylor',
      email: 'sam@example.com',
      password: 'SecurePassword123!',
    };

    await service.signup(request);

    expect(send).toHaveBeenCalledWith(
      MESSAGE_PATTERNS.users.account.signup,
      request,
    );
  });

  it('sends create-order through the Orders client', async () => {
    const send = jest.fn().mockReturnValue(of({ id: 'order-id' }));
    const service = new ApiGatewayService(
      {} as never,
      {} as never,
      { send } as never,
    );
    const request = {
      userId: '67f76ed1-bdcc-4286-9e3f-123fb4ab571e',
      items: [
        {
          bookId: 'd92eb1d3-6ca5-4ae1-a463-1ce744949e95',
          quantity: 2,
        },
      ],
    };

    await service.createOrder(request);

    expect(send).toHaveBeenCalledWith(
      MESSAGE_PATTERNS.orders.order.create,
      request,
    );
  });

  it('sends get-order through the controlled Orders pattern', async () => {
    const send = jest.fn().mockReturnValue(of({ id: 'order-id' }));
    const service = new ApiGatewayService(
      {} as never,
      {} as never,
      { send } as never,
    );

    await service.getOrder('order-id');

    expect(send).toHaveBeenCalledWith(MESSAGE_PATTERNS.orders.order.get, {
      id: 'order-id',
    });
  });

  it('sends user-order history through the controlled Orders pattern', async () => {
    const send = jest.fn().mockReturnValue(of([]));
    const service = new ApiGatewayService(
      {} as never,
      {} as never,
      { send } as never,
    );

    await service.listUserOrders('user-id');

    expect(send).toHaveBeenCalledWith(MESSAGE_PATTERNS.orders.user.list, {
      userId: 'user-id',
    });
  });
});
