import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { createHash } from 'node:crypto';
import {
  CreateOrderItemRequest,
  CreateOrderRequest,
  CreateOrderResponse,
  GetUserResponse,
  MESSAGE_PATTERNS,
  OrderResponse,
} from '@app/common';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { QueryFailedError } from 'typeorm';
import { Book } from '../../../../books-service/src/books/entities/book.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderEventsPublisher } from '../events/order-events.publisher';
import {
  NewOrderItemRecord,
  OrdersRepository,
} from '../repositories/orders.repository';

interface RpcErrorPayload {
  statusCode: number;
  code: string;
  message: string;
}

@Injectable()
export class OrdersService {
  constructor(
    @Inject('USERS_SERVICE') private readonly usersClient: ClientProxy,
    private readonly ordersRepository: OrdersRepository,
    private readonly orderEventsPublisher: OrderEventsPublisher,
  ) {}

  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    const requestedItems = this.mergeDuplicateItems(request.items);
    const requestHash = this.createRequestHash(request.userId, requestedItems);
    const existingOrder = await this.ordersRepository.findByIdempotencyKey(
      request.idempotencyKey,
    );

    if (existingOrder) {
      return this.replayOrder(existingOrder, requestHash);
    }

    await this.ensureUserExists(request.userId, request.correlationId);

    try {
      const createdOrder = await this.ordersRepository.runInTransaction(
        async (transaction) => {
          const books = await transaction.findBooksForUpdate(
            requestedItems.map((item) => item.bookId),
          );
          const booksById = new Map(books.map((book) => [book.id, book]));
          const orderItems: NewOrderItemRecord[] = [];
          let totalCents = 0n;

          for (const requestedItem of requestedItems) {
            const book = booksById.get(requestedItem.bookId);
            this.assertBookCanBeOrdered(book, requestedItem);

            const unitPriceCents = this.moneyToCents(book.price);
            const lineTotalCents =
              unitPriceCents * BigInt(requestedItem.quantity);

            book.availableQuantity -= requestedItem.quantity;
            book.soldQuantity += requestedItem.quantity;
            totalCents += lineTotalCents;
            orderItems.push({
              bookId: book.id,
              bookTitle: book.title,
              unitPrice: this.formatMoney(unitPriceCents),
              quantity: requestedItem.quantity,
              lineTotal: this.formatMoney(lineTotalCents),
            });
          }

          await transaction.saveBooks(books);
          const saved = await transaction.createOrder({
            userId: request.userId,
            idempotencyKey: request.idempotencyKey,
            requestHash,
            status: OrderStatus.CONFIRMED,
            totalAmount: this.formatMoney(totalCents),
            items: orderItems,
          });

          return this.toOrderResponse(saved.order, saved.items);
        },
      );

      this.orderEventsPublisher.publishOrderCreated(
        createdOrder,
        request.correlationId,
      );

      return createdOrder;
    } catch (error: unknown) {
      if (!this.isIdempotencyKeyConflict(error)) {
        throw error;
      }

      const concurrentlyCreatedOrder =
        await this.ordersRepository.findByIdempotencyKey(
          request.idempotencyKey,
        );

      if (!concurrentlyCreatedOrder) {
        throw error;
      }

      return this.replayOrder(concurrentlyCreatedOrder, requestHash);
    }
  }

  async getOrder(id: string): Promise<OrderResponse> {
    const order = await this.ordersRepository.findById(id);

    if (!order) {
      throw new RpcException({
        statusCode: 404,
        code: 'ORDER_NOT_FOUND',
        message: 'The requested order was not found.',
      });
    }

    return this.toOrderResponse(order, order.items);
  }

  async listUserOrders(
    userId: string,
    correlationId: string,
  ): Promise<OrderResponse[]> {
    await this.ensureUserExists(userId, correlationId);
    const orders = await this.ordersRepository.findByUserId(userId);

    return orders.map((order) => this.toOrderResponse(order, order.items));
  }

  private async ensureUserExists(
    userId: string,
    correlationId: string,
  ): Promise<void> {
    const timeoutMs = Number(process.env.MICROSERVICE_TIMEOUT_MS ?? 5000);

    try {
      await firstValueFrom(
        this.usersClient
          .send<GetUserResponse>(MESSAGE_PATTERNS.users.account.get, {
            id: userId,
            correlationId,
          })
          .pipe(timeout(timeoutMs)),
      );
    } catch (error: unknown) {
      if (error instanceof TimeoutError) {
        throw new RpcException({
          statusCode: 504,
          code: 'USERS_SERVICE_TIMEOUT',
          message: 'The Users service did not respond in time.',
        });
      }

      if (this.isRpcError(error)) {
        throw new RpcException(error);
      }

      throw new RpcException({
        statusCode: 503,
        code: 'USERS_SERVICE_UNAVAILABLE',
        message: 'The Users service is unavailable.',
      });
    }
  }

  private mergeDuplicateItems(
    items: CreateOrderItemRequest[],
  ): CreateOrderItemRequest[] {
    const quantitiesByBookId = new Map<string, number>();

    for (const item of items) {
      quantitiesByBookId.set(
        item.bookId,
        (quantitiesByBookId.get(item.bookId) ?? 0) + item.quantity,
      );
    }

    return Array.from(quantitiesByBookId, ([bookId, quantity]) => ({
      bookId,
      quantity,
    })).sort((left, right) => left.bookId.localeCompare(right.bookId));
  }

  private createRequestHash(
    userId: string,
    items: CreateOrderItemRequest[],
  ): string {
    return createHash('sha256')
      .update(JSON.stringify({ userId, items }))
      .digest('hex');
  }

  private replayOrder(order: Order, requestHash: string): CreateOrderResponse {
    if (order.requestHash !== requestHash) {
      throw new RpcException({
        statusCode: 409,
        code: 'IDEMPOTENCY_KEY_REUSED',
        message:
          'The idempotency key was already used for a different order request.',
      });
    }

    return this.toOrderResponse(order, order.items);
  }

  private isIdempotencyKeyConflict(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError = error.driverError as {
      code?: string;
      constraint?: string;
    };

    return (
      driverError.code === '23505' &&
      driverError.constraint === 'UQ_orders_idempotency_key'
    );
  }

  private assertBookCanBeOrdered(
    book: Book | undefined,
    requestedItem: CreateOrderItemRequest,
  ): asserts book is Book {
    if (!book || !book.isActive) {
      throw new RpcException({
        statusCode: 404,
        code: 'BOOK_NOT_AVAILABLE',
        message: `Book ${requestedItem.bookId} is not available.`,
      });
    }

    if (book.availableQuantity < requestedItem.quantity) {
      throw new RpcException({
        statusCode: 409,
        code: 'INSUFFICIENT_STOCK',
        message: `Book ${book.id} does not have enough stock.`,
      });
    }
  }

  private moneyToCents(amount: string): bigint {
    const [whole, fraction = ''] = amount.split('.');
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  }

  private formatMoney(cents: bigint): string {
    const whole = cents / 100n;
    const fraction = (cents % 100n).toString().padStart(2, '0');
    return `${whole}.${fraction}`;
  }

  private toOrderResponse(order: Order, items: OrderItem[]): OrderResponse {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: order.totalAmount,
      items: items.map((item) => ({
        bookId: item.bookId,
        bookTitle: item.bookTitle,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })),
      createdAt: order.createdAt.toISOString(),
    };
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
