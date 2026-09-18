import {
  GatewayTimeoutException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import {
  catchError,
  firstValueFrom,
  throwError,
  timeout,
  TimeoutError,
  tap,
} from 'rxjs';
import {
  createGatewayResilienceConfig,
  GATEWAY_RESILIENCE_CONFIG,
} from './config/gateway-resilience.config';
import type { GatewayResilienceConfig } from './config/gateway-resilience.config';
import {
  GatewayClientName,
  GatewayRouteRegistry,
} from './routing/gateway-route.registry';

interface RpcErrorPayload {
  statusCode: number;
  code: string;
  message: string;
}

export interface GatewayDispatchRequest {
  method: string;
  path: string;
  body?: unknown;
  query?: Record<string, unknown>;
  headers?: Record<string, string | undefined>;
  correlationId?: string;
}

@Injectable()
export class ApiGatewayService {
  private readonly logger = new Logger(ApiGatewayService.name);
  private readonly routeValidationPipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  constructor(
    @Inject('BOOKS_SERVICE') private readonly booksClient: ClientProxy,
    @Inject('USERS_SERVICE') private readonly usersClient: ClientProxy,
    @Inject('ORDERS_SERVICE') private readonly ordersClient: ClientProxy,
    private readonly routeRegistry: GatewayRouteRegistry,
    @Inject(GATEWAY_RESILIENCE_CONFIG)
    private readonly resilienceConfig: GatewayResilienceConfig = createGatewayResilienceConfig(),
  ) {}

  async dispatch(request: GatewayDispatchRequest): Promise<unknown> {
    const route = this.routeRegistry.resolve(request.method, request.path);
    const correlationId = request.correlationId ?? randomUUID();

    if (!route) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'GATEWAY_ROUTE_NOT_FOUND',
        message: `No route is registered for ${request.method.toUpperCase()} ${request.path}.`,
      });
    }

    const rawPayload = {
      ...route.buildPayload({
        params: route.params,
        body: request.body,
        query: request.query ?? {},
        headers: request.headers ?? {},
      }),
      correlationId,
    };
    const payload = route.requestType
      ? ((await this.routeValidationPipe.transform(rawPayload, {
          type: 'body',
          metatype: route.requestType,
        })) as object)
      : rawPayload;

    return this.send(
      this.getClient(route.clientName),
      route.pattern,
      payload,
      correlationId,
    );
  }

  private getClient(clientName: GatewayClientName): ClientProxy {
    switch (clientName) {
      case 'BOOKS_SERVICE':
        return this.booksClient;
      case 'USERS_SERVICE':
        return this.usersClient;
      case 'ORDERS_SERVICE':
        return this.ordersClient;
    }
  }

  private send(
    client: ClientProxy,
    pattern: object,
    payload: object,
    correlationId: string,
  ) {
    const patternName = JSON.stringify(pattern);
    this.logger.log(`[${correlationId}] TCP ${patternName} started`);

    return firstValueFrom(
      client.send(pattern, payload).pipe(
        timeout(this.resilienceConfig.microserviceTimeoutMs),
        tap(() =>
          this.logger.log(`[${correlationId}] TCP ${patternName} completed`),
        ),
        catchError((error: unknown) =>
          throwError(() => this.toHttpException(error, pattern, correlationId)),
        ),
      ),
    );
  }

  private toHttpException(
    error: unknown,
    pattern: object,
    correlationId: string,
  ): HttpException {
    if (error instanceof TimeoutError) {
      this.logger.warn(
        `[${correlationId}] Microservice request timed out for pattern ${JSON.stringify(pattern)}`,
      );
      return new GatewayTimeoutException({
        statusCode: 504,
        code: 'MICROSERVICE_TIMEOUT',
        message: 'The target microservice did not respond in time.',
      });
    }

    if (this.isTransportUnavailableError(error)) {
      this.logger.warn(
        `[${correlationId}] Microservice unavailable for pattern ${JSON.stringify(pattern)}`,
      );
      return new ServiceUnavailableException({
        statusCode: 503,
        code: 'MICROSERVICE_UNAVAILABLE',
        message: 'The target microservice is unavailable.',
      });
    }

    if (this.isRpcError(error)) {
      return new HttpException(error, error.statusCode);
    }

    return new InternalServerErrorException({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
    });
  }

  private isTransportUnavailableError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const candidate = error as { code?: unknown; cause?: unknown };
    const unavailableCodes = new Set([
      'ECONNREFUSED',
      'ECONNRESET',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'ENOTFOUND',
      'EPIPE',
      'ETIMEDOUT',
    ]);

    return (
      (typeof candidate.code === 'string' &&
        unavailableCodes.has(candidate.code)) ||
      (candidate.cause !== undefined &&
        this.isTransportUnavailableError(candidate.cause))
    );
  }

  private isRpcError(error: unknown): error is RpcErrorPayload {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const candidate = error as Partial<RpcErrorPayload>;
    return (
      typeof candidate.statusCode === 'number' &&
      typeof candidate.code === 'string' &&
      typeof candidate.message === 'string'
    );
  }
}
