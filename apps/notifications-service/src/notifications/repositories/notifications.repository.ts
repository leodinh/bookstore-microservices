import { OrderCreatedEvent } from '@app/common';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface InsertedNotification {
  id: string;
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async createFromOrderEvent(event: OrderCreatedEvent): Promise<boolean> {
    const rows = await this.dataSource.query<InsertedNotification[]>(
      `
        INSERT INTO "notifications" (
          "event_id",
          "user_id",
          "order_id",
          "type",
          "title",
          "message"
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT ("event_id") DO NOTHING
        RETURNING "id"
      `,
      [
        event.eventId,
        event.userId,
        event.orderId,
        'ORDER_CONFIRMED',
        'Order confirmed',
        `Your order ${event.orderId} was confirmed for ${event.totalAmount}.`,
      ],
    );

    return rows.length === 1;
  }
}
