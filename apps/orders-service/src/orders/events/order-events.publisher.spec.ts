import { CreateOrderResponse, EVENT_PATTERNS } from '@app/common';
import { of } from 'rxjs';
import { OrderEventsPublisher } from './order-events.publisher';

describe('OrderEventsPublisher', () => {
  it('emits an order-created fact with tracing metadata', () => {
    const emit = jest.fn().mockReturnValue(of(undefined));
    const publisher = new OrderEventsPublisher({ emit } as never);
    const order: CreateOrderResponse = {
      id: 'd9291b20-2bf8-4adc-b128-540dc3b1800d',
      userId: '7c624826-95e4-4bb9-8c7e-b0b434425351',
      status: 'confirmed',
      totalAmount: '49.99',
      items: [
        {
          bookId: 'd92eb1d3-6ca5-4ae1-a463-1ce744949e95',
          bookTitle: 'A Book',
          unitPrice: '49.99',
          quantity: 1,
          lineTotal: '49.99',
        },
      ],
      createdAt: '2026-08-11T20:00:00.000Z',
    };
    const correlationId = '2d1adaee-6732-4bdc-9a4b-46c297398e64';

    const event = publisher.publishOrderCreated(order, correlationId);

    expect(event).toEqual(
      expect.objectContaining({
        eventId: expect.stringMatching(/^[0-9a-f-]{36}$/) as string,
        occurredAt: order.createdAt,
        correlationId,
        orderId: order.id,
        userId: order.userId,
        status: order.status,
        totalAmount: order.totalAmount,
        itemCount: 1,
      }),
    );
    expect(emit).toHaveBeenCalledWith(EVENT_PATTERNS.orders.created, event);
  });
});
