import type { Request } from 'express';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';

describe('ApiGatewayController', () => {
  it('forwards generic HTTP request data to the dispatcher', async () => {
    const correlationId = '5af19211-f08a-4c42-93e3-08cf638b739c';
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
      get: jest.fn((header: string) =>
        header === 'X-Correlation-Id' ? correlationId : 'request-key',
      ),
    } as unknown as Request;
    const body = { title: 'A Book' };

    await expect(controller.dispatch(request, body)).resolves.toBe(response);
    expect(service.dispatch).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/books',
      body,
      query: { source: 'test' },
      correlationId,
      headers: { 'idempotency-key': 'request-key' },
    });
  });
});
