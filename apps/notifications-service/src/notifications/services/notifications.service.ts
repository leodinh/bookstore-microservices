import { OrderCreatedEvent } from '@app/common';
import { Injectable, Logger } from '@nestjs/common';
import { NotificationsRepository } from '../repositories/notifications.repository';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    const created =
      await this.notificationsRepository.createFromOrderEvent(event);

    if (!created) {
      this.logger.log(
        `[${event.correlationId}] Duplicate order-created event ignored ` +
          `eventId=${event.eventId}`,
      );
      return;
    }

    this.logger.log(
      `[${event.correlationId}] Order-created notification handled ` +
        `eventId=${event.eventId} orderId=${event.orderId} ` +
        `userId=${event.userId} total=${event.totalAmount}`,
    );
  }
}
