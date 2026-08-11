import { OrderCreatedEvent } from '@app/common';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  handleOrderCreated(event: OrderCreatedEvent): void {
    this.logger.log(
      `[${event.correlationId}] Order-created notification handled ` +
        `eventId=${event.eventId} orderId=${event.orderId} ` +
        `userId=${event.userId} total=${event.totalAmount}`,
    );
  }
}
