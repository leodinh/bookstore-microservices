import {
  CorrelationIdMiddleware,
  CORRELATION_ID_HEADER,
} from './correlation-id.middleware';
import type { NextFunction, Request, Response } from 'express';

describe('CorrelationIdMiddleware', () => {
  const correlationId = '5af19211-f08a-4c42-93e3-08cf638b739c';

  it('preserves a valid incoming correlation ID', () => {
    const request = {
      get: jest.fn().mockReturnValue(correlationId),
      headers: {},
    } as unknown as Request;
    const setHeader = jest.fn();
    const response = { setHeader } as unknown as Response;
    const next = jest.fn() as NextFunction;

    new CorrelationIdMiddleware().use(request, response, next);

    expect(request.headers['x-correlation-id']).toBe(correlationId);
    expect(setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      correlationId,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('replaces an invalid incoming value with a generated UUID', () => {
    const request = {
      get: jest.fn().mockReturnValue('not-safe-for-logs'),
      headers: {},
    } as unknown as Request;
    const setHeader = jest.fn();
    const response = { setHeader } as unknown as Response;
    const next = jest.fn() as NextFunction;

    new CorrelationIdMiddleware().use(request, response, next);

    const generated = request.headers['x-correlation-id'];
    expect(generated).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
    expect(setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, generated);
  });
});
