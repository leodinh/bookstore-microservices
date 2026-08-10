import { OrdersService } from '../services/orders.service';
import { OrdersController } from './orders.controller';

describe('OrdersController', () => {
  it('delegates the create-order message to the service', async () => {
    const request = {
      userId: '67f76ed1-bdcc-4286-9e3f-123fb4ab571e',
      items: [
        {
          bookId: 'd92eb1d3-6ca5-4ae1-a463-1ce744949e95',
          quantity: 1,
        },
      ],
    };
    const response = { id: 'order-id' };
    const ordersService = {
      createOrder: jest.fn().mockResolvedValue(response),
    };
    const controller = new OrdersController(
      ordersService as unknown as OrdersService,
    );

    await expect(controller.createOrder(request)).resolves.toBe(response);
    expect(ordersService.createOrder).toHaveBeenCalledWith(request);
  });
});
