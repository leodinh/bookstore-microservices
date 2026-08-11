import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

interface RpcTransportContext {
  getPattern(): string;
  getChannelRef?: unknown;
}

@Injectable()
export class RpcLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RpcLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = Date.now();
    const rpcContext = context.switchToRpc();
    const transportContext = rpcContext.getContext<RpcTransportContext>();
    const pattern = transportContext.getPattern();
    const transport = this.getTransportName(transportContext);
    const correlationId = this.getCorrelationId(rpcContext.getData<unknown>());

    this.logger.log(`[${correlationId}] ${transport} ${pattern} started`);

    return next.handle().pipe(
      tap({
        next: () =>
          this.logger.log(
            `[${correlationId}] ${transport} ${pattern} completed in ${Date.now() - startedAt}ms`,
          ),
        error: () =>
          this.logger.error(
            `[${correlationId}] ${transport} ${pattern} failed in ${Date.now() - startedAt}ms`,
          ),
      }),
    );
  }

  private getTransportName(context: RpcTransportContext): 'RMQ' | 'TCP' {
    return typeof context.getChannelRef === 'function' ? 'RMQ' : 'TCP';
  }

  private getCorrelationId(data: unknown): string {
    if (typeof data !== 'object' || data === null) {
      return 'unknown';
    }

    const correlationId = (data as { correlationId?: unknown }).correlationId;
    return typeof correlationId === 'string' ? correlationId : 'unknown';
  }
}
