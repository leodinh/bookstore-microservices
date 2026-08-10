import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import {
  CreateOrderItemRequest,
  CreateOrderRequest,
  CreateOrderResponse,
  GetUserResponse,
  MESSAGE_PATTERNS,
} from '@app/common';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { Book } from '../../../../books-service/src/books/entities/book.entity';
import { OrderStatus } from '../enums/order-status.enum';
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
  ) {}

  async createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    await this.ensureUserExists(request.userId);
    const requestedItems = this.mergeDuplicateItems(request.items);

    return this.ordersRepository.runInTransaction(async (transaction) => {
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
        const lineTotalCents = unitPriceCents * BigInt(requestedItem.quantity);

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
        status: OrderStatus.CONFIRMED,
        totalAmount: this.formatMoney(totalCents),
        items: orderItems,
      });

      return {
        id: saved.order.id,
        userId: saved.order.userId,
        status: saved.order.status,
        totalAmount: saved.order.totalAmount,
        items: saved.items.map((item) => ({
          bookId: item.bookId,
          bookTitle: item.bookTitle,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        })),
        createdAt: saved.order.createdAt.toISOString(),
      };
    });
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const timeoutMs = Number(process.env.MICROSERVICE_TIMEOUT_MS ?? 5000);

    try {
      await firstValueFrom(
        this.usersClient
          .send<GetUserResponse>(MESSAGE_PATTERNS.users.account.get, {
            id: userId,
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
    }));
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
