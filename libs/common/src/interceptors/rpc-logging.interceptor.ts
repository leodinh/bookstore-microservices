import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { TcpContext } from '@nestjs/microservices';
import { Observable, tap } from 'rxjs';

@Injectable()
export class RpcLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RpcLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = Date.now();
    const rpcContext = context.switchToRpc();
    const pattern = rpcContext.getContext<TcpContext>().getPattern();
    const correlationId = this.getCorrelationId(rpcContext.getData<unknown>());

    this.logger.log(`[${correlationId}] TCP ${pattern} started`);

    return next.handle().pipe(
      tap({
        next: () =>
          this.logger.log(
            `[${correlationId}] TCP ${pattern} completed in ${Date.now() - startedAt}ms`,
          ),
        error: () =>
          this.logger.error(
            `[${correlationId}] TCP ${pattern} failed in ${Date.now() - startedAt}ms`,
          ),
      }),
    );
  }

  private getCorrelationId(data: unknown): string {
    if (typeof data !== 'object' || data === null) {
      return 'unknown';
    }

    const correlationId = (data as { correlationId?: unknown }).correlationId;
    return typeof correlationId === 'string' ? correlationId : 'unknown';
  }
}
