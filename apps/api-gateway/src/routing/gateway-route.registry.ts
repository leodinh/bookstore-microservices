import { Injectable, Type } from '@nestjs/common';
import {
  CreateBookRequest,
  CreateOrderRequest,
  GetBookRequest,
  GetOrderRequest,
  ListUserOrdersRequest,
  MESSAGE_PATTERNS,
  SignupUserRequest,
  UpdateBookRequest,
} from '@app/common';

export type GatewayClientName =
  'BOOKS_SERVICE' | 'USERS_SERVICE' | 'ORDERS_SERVICE';

export interface GatewayRouteContext {
  params: Record<string, string>;
  body: unknown;
  query: Record<string, unknown>;
}

export interface ResolvedGatewayRoute {
  clientName: GatewayClientName;
  pattern: object;
  requestType?: Type<unknown>;
  buildPayload: (context: GatewayRouteContext) => object;
  params: Record<string, string>;
}

interface GatewayRouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  clientName: GatewayClientName;
  pattern: object;
  requestType?: Type<unknown>;
  buildPayload: (context: GatewayRouteContext) => object;
}

function bodyAsRecord(body: unknown): Record<string, unknown> {
  if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }

  return {};
}

@Injectable()
export class GatewayRouteRegistry {
  private readonly routes: GatewayRouteDefinition[] = [
    {
      method: 'GET',
      path: '/api/books/catalog',
      clientName: 'BOOKS_SERVICE',
      pattern: MESSAGE_PATTERNS.books.catalog.get,
      buildPayload: () => ({}),
    },
    {
      method: 'GET',
      path: '/api/books/:id',
      clientName: 'BOOKS_SERVICE',
      pattern: MESSAGE_PATTERNS.books.book.get,
      requestType: GetBookRequest,
      buildPayload: ({ params }) => ({ id: params.id }),
    },
    {
      method: 'POST',
      path: '/api/books',
      clientName: 'BOOKS_SERVICE',
      pattern: MESSAGE_PATTERNS.books.book.create,
      requestType: CreateBookRequest,
      buildPayload: ({ body }) => bodyAsRecord(body),
    },
    {
      method: 'PUT',
      path: '/api/books/:id',
      clientName: 'BOOKS_SERVICE',
      pattern: MESSAGE_PATTERNS.books.book.update,
      requestType: UpdateBookRequest,
      buildPayload: ({ params, body }) => ({
        ...bodyAsRecord(body),
        id: params.id,
      }),
    },
    {
      method: 'DELETE',
      path: '/api/books/:id',
      clientName: 'BOOKS_SERVICE',
      pattern: MESSAGE_PATTERNS.books.book.deactivate,
      requestType: GetBookRequest,
      buildPayload: ({ params }) => ({ id: params.id }),
    },
    {
      method: 'POST',
      path: '/api/users/signup',
      clientName: 'USERS_SERVICE',
      pattern: MESSAGE_PATTERNS.users.account.signup,
      requestType: SignupUserRequest,
      buildPayload: ({ body }) => bodyAsRecord(body),
    },
    {
      method: 'POST',
      path: '/api/orders',
      clientName: 'ORDERS_SERVICE',
      pattern: MESSAGE_PATTERNS.orders.order.create,
      requestType: CreateOrderRequest,
      buildPayload: ({ body }) => bodyAsRecord(body),
    },
    {
      method: 'GET',
      path: '/api/orders/:id',
      clientName: 'ORDERS_SERVICE',
      pattern: MESSAGE_PATTERNS.orders.order.get,
      requestType: GetOrderRequest,
      buildPayload: ({ params }) => ({ id: params.id }),
    },
    {
      method: 'GET',
      path: '/api/orders/user/:userId',
      clientName: 'ORDERS_SERVICE',
      pattern: MESSAGE_PATTERNS.orders.user.list,
      requestType: ListUserOrdersRequest,
      buildPayload: ({ params }) => ({ userId: params.userId }),
    },
  ];

  resolve(method: string, path: string): ResolvedGatewayRoute | null {
    const normalizedMethod = method.toUpperCase();

    for (const route of this.routes) {
      if (route.method !== normalizedMethod) {
        continue;
      }

      const params = this.matchPath(route.path, path);
      if (params) {
        return { ...route, params };
      }
    }

    return null;
  }

  private matchPath(
    template: string,
    actualPath: string,
  ): Record<string, string> | null {
    const templateSegments = this.toSegments(template);
    const actualSegments = this.toSegments(actualPath);

    if (templateSegments.length !== actualSegments.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let index = 0; index < templateSegments.length; index += 1) {
      const templateSegment = templateSegments[index];
      const actualSegment = actualSegments[index];

      if (templateSegment.startsWith(':')) {
        params[templateSegment.slice(1)] = actualSegment;
        continue;
      }

      if (templateSegment !== actualSegment) {
        return null;
      }
    }

    return params;
  }

  private toSegments(path: string): string[] {
    return path.split('/').filter(Boolean);
  }
}
