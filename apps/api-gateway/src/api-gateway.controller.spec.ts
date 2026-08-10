import type { Request } from 'express';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';

describe('ApiGatewayController', () => {
  it('forwards generic HTTP request data to the dispatcher', async () => {
    const response = { id: 'book-id' };
    const service = {
      dispatch: jest.fn().mockResolvedValue(response),
    };
    const controller = new ApiGatewayController(
      service as unknown as ApiGatewayService,
    );
    const request = {
      method: 'POST',
      path: '/api/books',
      query: { source: 'test' },
      get: jest.fn().mockReturnValue('request-key'),
    } as unknown as Request;
    const body = { title: 'A Book' };

    await expect(controller.dispatch(request, body)).resolves.toBe(response);
    expect(service.dispatch).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/books',
      body,
      query: { source: 'test' },
      headers: { 'idempotency-key': 'request-key' },
    });
  });
});
