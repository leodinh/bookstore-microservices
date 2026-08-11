import { EVENT_PATTERNS, OrderCreatedEvent } from '@app/common';
import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { Channel, ConsumeMessage } from 'amqplib';
import { NotificationsService } from '../services/notifications.service';

@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @EventPattern(EVENT_PATTERNS.orders.created)
  handleOrderCreated(
    @Payload() event: OrderCreatedEvent,
    @Ctx() context: RmqContext,
  ): void {
    const channel = context.getChannelRef() as unknown as Channel;
    const message = context.getMessage() as unknown as ConsumeMessage;

    try {
      this.notificationsService.handleOrderCreated(event);
      channel.ack(message);
    } catch (error: unknown) {
      channel.nack(message, false, true);
      throw error;
    }
  }
}
