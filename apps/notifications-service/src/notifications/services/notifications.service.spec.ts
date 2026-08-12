import { OrderCreatedEvent } from '@app/common';
import { NotificationsRepository } from '../repositories/notifications.repository';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const event = {
    eventId: '199d8ee5-ddae-41bf-804b-65f217809d25',
    correlationId: 'e812bdb9-24e9-4d53-8b16-c9e5b4fd9bb3',
    orderId: '47457571-1dd6-4ea6-93e4-f707083db1b4',
    userId: 'dfbbd937-e884-4be6-aea8-fddc8ad15843',
    totalAmount: '49.99',
  } as OrderCreatedEvent;

  it('persists the notification side effect through its repository', async () => {
    const createFromOrderEvent = jest.fn().mockResolvedValue(true);
    const service = new NotificationsService({
      createFromOrderEvent,
    } as unknown as NotificationsRepository);

    await service.handleOrderCreated(event);

    expect(createFromOrderEvent).toHaveBeenCalledWith(event);
  });

  it('accepts a redelivered event without creating a duplicate', async () => {
    const createFromOrderEvent = jest.fn().mockResolvedValue(false);
    const service = new NotificationsService({
      createFromOrderEvent,
    } as unknown as NotificationsRepository);

    await expect(service.handleOrderCreated(event)).resolves.toBeUndefined();
    expect(createFromOrderEvent).toHaveBeenCalledTimes(1);
  });
});
