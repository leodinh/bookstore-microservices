import { OutboxRepository } from './outbox.repository';

describe('OutboxRepository', () => {
  it('claims available rows with skip-locked leasing', async () => {
    const event = {
      id: '199d8ee5-ddae-41bf-804b-65f217809d25',
      eventType: 'orders.order.created',
      aggregateType: 'order',
      aggregateId: '47457571-1dd6-4ea6-93e4-f707083db1b4',
      payload: { orderId: '47457571-1dd6-4ea6-93e4-f707083db1b4' },
      occurredAt: new Date('2026-08-12T12:00:00.000Z'),
      attempts: 1,
    };
    const query = jest.fn().mockResolvedValue([[event], 1]);
    const repository = new OutboxRepository({ query } as never);
    const workerId = '7318d512-e10b-4085-9623-139b12583a6e';

    await expect(
      repository.claimPending(10, workerId, 30_000),
    ).resolves.toEqual([event]);

    const call = query.mock.calls[0] as [string, [number, string, Date]];
    expect(call[0]).toContain('FOR UPDATE SKIP LOCKED');
    expect(call[0]).toContain('"attempts" = event."attempts" + 1');
    expect(call[1][0]).toBe(10);
    expect(call[1][1]).toBe(workerId);
    expect(call[1][2]).toBeInstanceOf(Date);
  });

  it('releases the lease and schedules a retry after failure', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const repository = new OutboxRepository({ query } as never);

    await repository.markFailed('event-id', 'worker-id', 'failure', 2000);

    const call = query.mock.calls[0] as [
      string,
      [string, string, string, Date],
    ];
    expect(call[0]).toContain('"next_attempt_at"');
    expect(call[0]).toContain('"locked_by" = NULL');
    expect(call[1].slice(0, 3)).toEqual(['event-id', 'worker-id', 'failure']);
    expect(call[1][3]).toBeInstanceOf(Date);
  });
});
