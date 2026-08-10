import { HttpException } from '@nestjs/common';
import { MESSAGE_PATTERNS } from '@app/common';
import { of, throwError } from 'rxjs';
import { ApiGatewayService } from './api-gateway.service';
import { GatewayRouteRegistry } from './routing/gateway-route.registry';

function rejectedValue(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => new Error('Expected the promise to reject.'),
    (error: unknown) => error,
  );
}

describe('ApiGatewayService', () => {
  const bookId = 'd92eb1d3-6ca5-4ae1-a463-1ce744949e95';
  const userId = '67f76ed1-bdcc-4286-9e3f-123fb4ab571e';

  it('dispatches a registered catalog route to Books', async () => {
    const booksSend = jest.fn().mockReturnValue(of([{ id: bookId }]));
    const service = new ApiGatewayService(
      { send: booksSend } as never,
      {} as never,
      {} as never,
      new GatewayRouteRegistry(),
    );

    await expect(
      service.dispatch({ method: 'GET', path: '/api/books/catalog' }),
    ).resolves.toEqual([{ id: bookId }]);
    expect(booksSend).toHaveBeenCalledWith(
      MESSAGE_PATTERNS.books.catalog.get,
      {},
    );
  });

  it('extracts and validates a dynamic book ID before sending', async () => {
    const booksSend = jest.fn().mockReturnValue(of({ id: bookId }));
    const service = new ApiGatewayService(
      { send: booksSend } as never,
      {} as never,
      {} as never,
      new GatewayRouteRegistry(),
    );

    await service.dispatch({ method: 'GET', path: `/api/books/${bookId}` });

    expect(booksSend).toHaveBeenCalledWith(MESSAGE_PATTERNS.books.book.get, {
      id: bookId,
    });
  });

  it('validates a create-book body and sends it to Books', async () => {
    const booksSend = jest.fn().mockReturnValue(of({ id: bookId }));
    const service = new ApiGatewayService(
      { send: booksSend } as never,
      {} as never,
      {} as never,
      new GatewayRouteRegistry(),
    );
    const body = {
      title: 'A Book',
      author: 'An Author',
      isbn: '9780000000032',
      price: 19.99,
      availableQuantity: 5,
    };

    await service.dispatch({ method: 'POST', path: '/api/books', body });

    expect(booksSend).toHaveBeenCalledWith(
      MESSAGE_PATTERNS.books.book.create,
      expect.objectContaining(body),
    );
  });

  it('selects Users for signup', async () => {
    const usersSend = jest.fn().mockReturnValue(of({ id: userId }));
    const service = new ApiGatewayService(
      {} as never,
      { send: usersSend } as never,
      {} as never,
      new GatewayRouteRegistry(),
    );
    const body = {
      firstName: 'Sam',
      lastName: 'Taylor',
      email: 'sam@example.com',
      password: 'SecurePassword123!',
    };

    await service.dispatch({
      method: 'POST',
      path: '/api/users/signup',
      body,
    });

    expect(usersSend).toHaveBeenCalledWith(
      MESSAGE_PATTERNS.users.account.signup,
      expect.objectContaining(body),
    );
  });

  it('selects Orders and validates nested order items', async () => {
    const ordersSend = jest.fn().mockReturnValue(of({ id: 'order-id' }));
    const service = new ApiGatewayService(
      {} as never,
      {} as never,
      { send: ordersSend } as never,
      new GatewayRouteRegistry(),
    );
    const body = {
      userId,
      items: [{ bookId, quantity: 2 }],
    };

    await service.dispatch({ method: 'POST', path: '/api/orders', body });

    expect(ordersSend).toHaveBeenCalledWith(
      MESSAGE_PATTERNS.orders.order.create,
      expect.objectContaining(body),
    );
  });

  it('rejects an unsupported route before any TCP call', async () => {
    const booksSend = jest.fn();
    const usersSend = jest.fn();
    const ordersSend = jest.fn();
    const service = new ApiGatewayService(
      { send: booksSend } as never,
      { send: usersSend } as never,
      { send: ordersSend } as never,
      new GatewayRouteRegistry(),
    );

    const error = await rejectedValue(
      service.dispatch({ method: 'POST', path: '/api/books/catalog' }),
    );

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getResponse()).toEqual(
      expect.objectContaining({ code: 'GATEWAY_ROUTE_NOT_FOUND' }),
    );
    expect(booksSend).not.toHaveBeenCalled();
    expect(usersSend).not.toHaveBeenCalled();
    expect(ordersSend).not.toHaveBeenCalled();
  });

  it('rejects an invalid path UUID before TCP', async () => {
    const booksSend = jest.fn();
    const service = new ApiGatewayService(
      { send: booksSend } as never,
      {} as never,
      {} as never,
      new GatewayRouteRegistry(),
    );

    const error = await rejectedValue(
      service.dispatch({ method: 'GET', path: '/api/books/not-a-uuid' }),
    );

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(400);
    expect(booksSend).not.toHaveBeenCalled();
  });

  it('translates a structured RPC error into an HTTP exception', async () => {
    const booksSend = jest.fn().mockReturnValue(
      throwError(() => ({
        statusCode: 404,
        code: 'BOOK_NOT_FOUND',
        message: 'The requested book was not found.',
      })),
    );
    const service = new ApiGatewayService(
      { send: booksSend } as never,
      {} as never,
      {} as never,
      new GatewayRouteRegistry(),
    );

    const error = await rejectedValue(
      service.dispatch({ method: 'GET', path: `/api/books/${bookId}` }),
    );

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(404);
  });
});
