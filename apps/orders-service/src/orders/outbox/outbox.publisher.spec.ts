import { of, throwError } from 'rxjs';
import { ClaimedOutboxEvent, OutboxRepository } from './outbox.repository';
import { OutboxPublisher } from './outbox.publisher';

describe('OutboxPublisher', () => {
  const event: ClaimedOutboxEvent = {
    id: '199d8ee5-ddae-41bf-804b-65f217809d25',
    eventType: 'orders.order.created',
    aggregateType: 'order',
    aggregateId: '47457571-1dd6-4ea6-93e4-f707083db1b4',
    payload: { orderId: '47457571-1dd6-4ea6-93e4-f707083db1b4' },
    occurredAt: new Date('2026-08-12T12:00:00.000Z'),
    attempts: 1,
  };

  it('marks a claimed event published after RabbitMQ accepts it', async () => {
    const emit = jest.fn().mockReturnValue(of(undefined));
    const outboxRepository = {
      claimPending: jest.fn().mockResolvedValue([event]),
      markPublished: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn(),
    };
    const publisher = new OutboxPublisher(
      { emit } as never,
      outboxRepository as unknown as OutboxRepository,
    );

    await expect(publisher.publishPending()).resolves.toBe(1);

    expect(emit).toHaveBeenCalledWith(event.eventType, event.payload);
    expect(outboxRepository.markPublished).toHaveBeenCalledWith(
      event.id,
      expect.stringMatching(/^[0-9a-f-]{36}$/),
    );
    expect(outboxRepository.markFailed).not.toHaveBeenCalled();
  });

  it('records a retry instead of losing a failed publication', async () => {
    const error = new Error('RabbitMQ unavailable');
    const outboxRepository = {
      claimPending: jest.fn().mockResolvedValue([{ ...event, attempts: 2 }]),
      markPublished: jest.fn(),
      markFailed: jest.fn().mockResolvedValue(undefined),
    };
    const publisher = new OutboxPublisher(
      { emit: jest.fn().mockReturnValue(throwError(() => error)) } as never,
      outboxRepository as unknown as OutboxRepository,
    );

    await expect(publisher.publishPending()).resolves.toBe(1);

    expect(outboxRepository.markPublished).not.toHaveBeenCalled();
    expect(outboxRepository.markFailed).toHaveBeenCalledWith(
      event.id,
      expect.stringMatching(/^[0-9a-f-]{36}$/),
      error.message,
      2000,
    );
  });
});
