import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import type { Request } from 'express';

@Injectable()
export class GatewayThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(GatewayThrottlerGuard.name);

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest<Request>();
    const correlationId = request.get('X-Correlation-Id') ?? 'unknown';
    this.logger.warn(
      `[${correlationId}] Rate limit exceeded for ${request.method} ${request.path}`,
    );

    await super.throwThrottlingException(context, throttlerLimitDetail);
  }
}
