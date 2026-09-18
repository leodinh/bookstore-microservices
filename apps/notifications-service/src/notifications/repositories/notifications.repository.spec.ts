import { OrderCreatedEvent } from '@app/common';
import { NotificationsRepository } from './notifications.repository';

describe('NotificationsRepository', () => {
  const event: OrderCreatedEvent = {
    eventId: '199d8ee5-ddae-41bf-804b-65f217809d25',
    occurredAt: '2026-08-12T12:00:00.000Z',
    correlationId: 'e812bdb9-24e9-4d53-8b16-c9e5b4fd9bb3',
    orderId: '47457571-1dd6-4ea6-93e4-f707083db1b4',
    userId: 'dfbbd937-e884-4be6-aea8-fddc8ad15843',
    status: 'CONFIRMED',
    totalAmount: '49.99',
    itemCount: 1,
  };

  it('creates one persistent notification for a new event ID', async () => {
    const query = jest.fn().mockResolvedValue([{ id: 'notification-id' }]);
    const repository = new NotificationsRepository({ query } as never);

    await expect(repository.createFromOrderEvent(event)).resolves.toBe(true);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT ("event_id") DO NOTHING'),
      [
        event.eventId,
        event.userId,
        event.orderId,
        'ORDER_CONFIRMED',
        'Order confirmed',
        `Your order ${event.orderId} was confirmed for ${event.totalAmount}.`,
      ],
    );
  });

  it('reports a duplicate when the event ID already exists', async () => {
    const repository = new NotificationsRepository({
      query: jest.fn().mockResolvedValue([]),
    } as never);

    await expect(repository.createFromOrderEvent(event)).resolves.toBe(false);
  });
});
