import { ValidationPipe } from '@nestjs/common';
import type { INestApplication, INestMicroservice } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import type { MicroserviceOptions } from '@nestjs/microservices';
import { RpcValidationPipe } from '@app/common';
import { ApiGatewayModule } from '../apps/api-gateway/src/api-gateway.module';
import { BooksServiceModule } from '../apps/books-service/src/books-service.module';
import { OrdersServiceModule } from '../apps/orders-service/src/orders-service.module';
import { UsersServiceModule } from '../apps/users-service/src/users-service.module';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { Pool } from 'pg';
import request from 'supertest';

interface SignupResponseBody {
  id: string;
  email: string;
}

interface BookResponseBody {
  id: string;
  availableQuantity: number;
  soldQuantity: number;
}

interface OrderResponseBody {
  id: string;
  totalAmount: string;
  items: Array<{
    bookId: string;
    quantity: number;
  }>;
}

interface ErrorResponseBody {
  code?: string;
}

function responseBody<T>(body: unknown): T {
  return body as T;
}

describe('Bookstore microservices (e2e)', () => {
  const databaseUrl =
    process.env.DATABASE_URL ??
    'postgresql://bookstore:bookstore@127.0.0.1:5433/bookstore';
  const testRunId = randomUUID();
  const email = `e2e-${testRunId}@example.com`;
  const isbn = testRunId
    .replace(/[^0-9]/g, '')
    .padEnd(13, '0')
    .slice(0, 13);
  const idempotencyKey = randomUUID();
  const duplicatedClientCorrelationId = randomUUID();
  let gatewayApp: INestApplication | undefined;
  let usersApp: INestMicroservice | undefined;
  let booksApp: INestMicroservice | undefined;
  let ordersApp: INestMicroservice | undefined;
  let database: Pool | undefined;
  let userId: string | undefined;
  let bookId: string | undefined;

  beforeAll(async () => {
    const usersPort = Number(process.env.USERS_SERVICE_PORT);
    const booksPort = Number(process.env.BOOKS_SERVICE_PORT);
    const ordersPort = Number(process.env.ORDERS_SERVICE_PORT);
    process.env.DATABASE_URL = databaseUrl;

    usersApp = await NestFactory.createMicroservice<MicroserviceOptions>(
      UsersServiceModule,
      {
        logger: false,
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: usersPort },
      },
    );
    booksApp = await NestFactory.createMicroservice<MicroserviceOptions>(
      BooksServiceModule,
      {
        logger: false,
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: booksPort },
      },
    );
    ordersApp = await NestFactory.createMicroservice<MicroserviceOptions>(
      OrdersServiceModule,
      {
        logger: false,
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: ordersPort },
      },
    );

    usersApp.useGlobalPipes(new RpcValidationPipe());
    booksApp.useGlobalPipes(new RpcValidationPipe());
    ordersApp.useGlobalPipes(new RpcValidationPipe());
    await Promise.all([
      usersApp.listen(),
      booksApp.listen(),
      ordersApp.listen(),
    ]);

    gatewayApp = await NestFactory.create(ApiGatewayModule, { logger: false });
    gatewayApp.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await gatewayApp.listen(0, '127.0.0.1');

    database = new Pool({ connectionString: databaseUrl });
    await database.query('SELECT 1');
  });

  afterAll(async () => {
    if (database) {
      await database.query('DELETE FROM orders WHERE idempotency_key = $1', [
        idempotencyKey,
      ]);
      if (bookId) {
        await database.query('DELETE FROM books WHERE id = $1', [bookId]);
      }
      if (userId) {
        await database.query('DELETE FROM users WHERE id = $1', [userId]);
      }
      await database.end();
    }

    await gatewayApp?.close();
    await Promise.all([
      ordersApp?.close(),
      booksApp?.close(),
      usersApp?.close(),
    ]);
  });

  it('carries an idempotent order from HTTP through TCP and PostgreSQL', async () => {
    if (!gatewayApp || !database) {
      throw new Error('The E2E applications did not start.');
    }

    const httpServer = gatewayApp.getHttpServer() as Server;
    const signupResponse = await request(httpServer)
      .post('/api/users/signup')
      .send({
        firstName: 'End',
        lastName: 'ToEnd',
        email,
        password: 'SecurePassword123!',
      })
      .expect(200);
    const signup = responseBody<SignupResponseBody>(signupResponse.body);
    userId = signup.id;
    expect(signup.email).toBe(email);
    expect(signupResponse.get('x-correlation-id')).toMatch(/^[0-9a-f-]{36}$/);

    const createBookResponse = await request(httpServer)
      .post('/api/books')
      .send({
        title: 'E2E Microservices Book',
        author: 'Test Runner',
        isbn,
        price: 12.5,
        availableQuantity: 5,
      })
      .expect(200);
    const book = responseBody<BookResponseBody>(createBookResponse.body);
    bookId = book.id;
    expect(book).toEqual(
      expect.objectContaining({ availableQuantity: 5, soldQuantity: 0 }),
    );

    await request(httpServer)
      .post('/api/orders')
      .send({
        userId,
        items: [{ bookId, quantity: 2 }],
      })
      .expect(400);

    const orderRequest = {
      userId,
      items: [{ bookId, quantity: 2 }],
    };
    const firstOrderResponse = await request(httpServer)
      .post('/api/orders')
      .set('Idempotency-Key', idempotencyKey)
      .set('X-Correlation-Id', duplicatedClientCorrelationId)
      .send(orderRequest)
      .expect(200);
    const firstOrder = responseBody<OrderResponseBody>(firstOrderResponse.body);
    expect(firstOrder).toEqual(
      expect.objectContaining({
        totalAmount: '25.00',
        items: [expect.objectContaining({ bookId, quantity: 2 })],
      }),
    );
    const firstCorrelationId = firstOrderResponse.get('x-correlation-id');
    expect(firstCorrelationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(firstCorrelationId).not.toBe(duplicatedClientCorrelationId);

    const replayResponse = await request(httpServer)
      .post('/api/orders')
      .set('Idempotency-Key', idempotencyKey)
      .set('X-Correlation-Id', duplicatedClientCorrelationId)
      .send(orderRequest)
      .expect(200);
    const replayedOrder = responseBody<OrderResponseBody>(replayResponse.body);
    expect(replayedOrder.id).toBe(firstOrder.id);
    const replayedCorrelationId = replayResponse.get('x-correlation-id');
    expect(replayedCorrelationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(replayedCorrelationId).not.toBe(duplicatedClientCorrelationId);
    expect(replayedCorrelationId).not.toBe(firstCorrelationId);

    const conflictResponse = await request(httpServer)
      .post('/api/orders')
      .set('Idempotency-Key', idempotencyKey)
      .send({
        userId,
        items: [{ bookId, quantity: 1 }],
      })
      .expect(409);
    expect(responseBody<ErrorResponseBody>(conflictResponse.body).code).toBe(
      'IDEMPOTENCY_KEY_REUSED',
    );

    const getOrderResponse = await request(httpServer)
      .get(`/api/orders/${firstOrder.id}`)
      .expect(200);
    expect(responseBody<OrderResponseBody>(getOrderResponse.body).id).toBe(
      firstOrder.id,
    );

    const stockResult = await database.query<{
      available_quantity: number;
      sold_quantity: number;
    }>('SELECT available_quantity, sold_quantity FROM books WHERE id = $1', [
      bookId,
    ]);
    expect(stockResult.rows[0]).toEqual({
      available_quantity: 3,
      sold_quantity: 2,
    });

    const orderCountResult = await database.query<{ count: string }>(
      'SELECT count(*) FROM orders WHERE idempotency_key = $1',
      [idempotencyKey],
    );
    expect(orderCountResult.rows[0]?.count).toBe('1');
  });
});
