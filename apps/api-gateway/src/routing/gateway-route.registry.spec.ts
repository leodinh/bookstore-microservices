import { MESSAGE_PATTERNS } from '@app/common';
import { GatewayRouteRegistry } from './gateway-route.registry';

describe('GatewayRouteRegistry', () => {
  const bookId = 'd92eb1d3-6ca5-4ae1-a463-1ce744949e95';
  const userId = '67f76ed1-bdcc-4286-9e3f-123fb4ab571e';
  const orderId = '90a303ef-b364-4467-ad1a-684957197563';

  it.each([
    [
      'GET',
      '/api/books/catalog',
      'BOOKS_SERVICE',
      MESSAGE_PATTERNS.books.catalog.get,
    ],
    [
      'GET',
      `/api/books/${bookId}`,
      'BOOKS_SERVICE',
      MESSAGE_PATTERNS.books.book.get,
    ],
    ['POST', '/api/books', 'BOOKS_SERVICE', MESSAGE_PATTERNS.books.book.create],
    [
      'PUT',
      `/api/books/${bookId}`,
      'BOOKS_SERVICE',
      MESSAGE_PATTERNS.books.book.update,
    ],
    [
      'DELETE',
      `/api/books/${bookId}`,
      'BOOKS_SERVICE',
      MESSAGE_PATTERNS.books.book.deactivate,
    ],
    [
      'POST',
      '/api/users/signup',
      'USERS_SERVICE',
      MESSAGE_PATTERNS.users.account.signup,
    ],
    [
      'POST',
      '/api/orders',
      'ORDERS_SERVICE',
      MESSAGE_PATTERNS.orders.order.create,
    ],
    [
      'GET',
      `/api/orders/${orderId}`,
      'ORDERS_SERVICE',
      MESSAGE_PATTERNS.orders.order.get,
    ],
    [
      'GET',
      `/api/orders/user/${userId}`,
      'ORDERS_SERVICE',
      MESSAGE_PATTERNS.orders.user.list,
    ],
  ])(
    'allows %s %s through its controlled mapping',
    (method, path, clientName, pattern) => {
      const route = new GatewayRouteRegistry().resolve(method, path);

      expect(route).toEqual(expect.objectContaining({ clientName, pattern }));
    },
  );

  it('extracts dynamic route parameters', () => {
    const route = new GatewayRouteRegistry().resolve(
      'GET',
      `/api/orders/user/${userId}`,
    );

    expect(route?.params).toEqual({ userId });
  });

  it('does not resolve unregistered methods or paths', () => {
    const registry = new GatewayRouteRegistry();

    expect(registry.resolve('PATCH', `/api/books/${bookId}`)).toBeNull();
    expect(registry.resolve('POST', '/api/books/catalog')).toBeNull();
    expect(registry.resolve('GET', '/api/admin/secrets')).toBeNull();
  });
});
