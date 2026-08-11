import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { isUUID } from 'class-validator';
import type { NextFunction, Request, Response } from 'express';

export const CORRELATION_ID_HEADER = 'X-Correlation-Id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const incomingCorrelationId = request.get(CORRELATION_ID_HEADER);
    const correlationId =
      incomingCorrelationId && isUUID(incomingCorrelationId)
        ? incomingCorrelationId
        : randomUUID();

    request.headers[CORRELATION_ID_HEADER.toLowerCase()] = correlationId;
    response.setHeader(CORRELATION_ID_HEADER, correlationId);
    next();
  }
}
