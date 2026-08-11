import { OrderCreatedEvent } from '@app/common';
import { NotificationsService } from '../services/notifications.service';
import { NotificationsController } from './notifications.controller';

describe('NotificationsController', () => {
  const event: OrderCreatedEvent = {
    eventId: '199d8ee5-ddae-41bf-804b-65f217809d25',
    occurredAt: '2026-08-11T20:00:00.000Z',
    correlationId: 'e812bdb9-24e9-4d53-8b16-c9e5b4fd9bb3',
    orderId: '47457571-1dd6-4ea6-93e4-f707083db1b4',
    userId: 'dfbbd937-e884-4be6-aea8-fddc8ad15843',
    status: 'confirmed',
    totalAmount: '49.99',
    itemCount: 1,
  };

  it('acknowledges the RabbitMQ delivery after successful handling', () => {
    const message = { fields: { deliveryTag: 1 } };
    const channel = { ack: jest.fn(), nack: jest.fn() };
    const notificationsService = {
      handleOrderCreated: jest.fn(),
    };
    const controller = new NotificationsController(
      notificationsService as unknown as NotificationsService,
    );

    controller.handleOrderCreated(event, {
      getChannelRef: () => channel,
      getMessage: () => message,
    } as never);

    expect(notificationsService.handleOrderCreated).toHaveBeenCalledWith(event);
    expect(channel.ack).toHaveBeenCalledWith(message);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('requeues the delivery when handling fails', () => {
    const message = { fields: { deliveryTag: 1 } };
    const channel = { ack: jest.fn(), nack: jest.fn() };
    const error = new Error('Notification provider unavailable');
    const notificationsService = {
      handleOrderCreated: jest.fn(() => {
        throw error;
      }),
    };
    const controller = new NotificationsController(
      notificationsService as unknown as NotificationsService,
    );

    expect(() =>
      controller.handleOrderCreated(event, {
        getChannelRef: () => channel,
        getMessage: () => message,
      } as never),
    ).toThrow(error);
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(message, false, true);
  });
});
