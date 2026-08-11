import {
  CorrelationIdMiddleware,
  CORRELATION_ID_HEADER,
} from './correlation-id.middleware';
import type { NextFunction, Request, Response } from 'express';

describe('CorrelationIdMiddleware', () => {
  const clientCorrelationId = '5af19211-f08a-4c42-93e3-08cf638b739c';

  it('overwrites a client value with a Gateway-generated UUID', () => {
    const request = {
      headers: { 'x-correlation-id': clientCorrelationId },
    } as unknown as Request;
    const setHeader = jest.fn();
    const response = { setHeader } as unknown as Response;
    const next = jest.fn() as NextFunction;

    new CorrelationIdMiddleware().use(request, response, next);

    const generated = request.headers['x-correlation-id'];
    expect(generated).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
    expect(generated).not.toBe(clientCorrelationId);
    expect(setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, generated);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates a different correlation ID for every request', () => {
    const firstRequest = { headers: {} } as unknown as Request;
    const secondRequest = { headers: {} } as unknown as Request;
    const response = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn() as NextFunction;
    const middleware = new CorrelationIdMiddleware();

    middleware.use(firstRequest, response, next);
    middleware.use(secondRequest, response, next);

    expect(firstRequest.headers['x-correlation-id']).not.toBe(
      secondRequest.headers['x-correlation-id'],
    );
  });
});
