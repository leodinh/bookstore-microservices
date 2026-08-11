import {
  CreateOrderResponse,
  EVENT_PATTERNS,
  OrderCreatedEvent,
} from '@app/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';

@Injectable()
export class OrderEventsPublisher {
  private readonly logger = new Logger(OrderEventsPublisher.name);

  constructor(
    @Inject('ORDER_EVENTS') private readonly eventsClient: ClientProxy,
  ) {}

  publishOrderCreated(
    order: CreateOrderResponse,
    correlationId: string,
  ): OrderCreatedEvent {
    const event: OrderCreatedEvent = {
      eventId: randomUUID(),
      occurredAt: order.createdAt,
      correlationId,
      orderId: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: order.totalAmount,
      itemCount: order.items.length,
    };

    try {
      this.eventsClient
        .emit<void, OrderCreatedEvent>(EVENT_PATTERNS.orders.created, event)
        .subscribe({
          error: (error: unknown) =>
            this.logPublishFailure(event.correlationId, error),
        });
    } catch (error: unknown) {
      this.logPublishFailure(event.correlationId, error);
    }

    return event;
  }

  private logPublishFailure(correlationId: string, error: unknown): void {
    const detail = error instanceof Error ? error.message : String(error);
    this.logger.error(
      `[${correlationId}] Failed to publish ${EVENT_PATTERNS.orders.created}: ${detail}`,
    );
  }
}
