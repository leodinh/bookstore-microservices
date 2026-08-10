import {
  GatewayTimeoutException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  catchError,
  firstValueFrom,
  throwError,
  timeout,
  TimeoutError,
} from 'rxjs';
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
}

@Injectable()
export class ApiGatewayService {
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
  ) {}

  async dispatch(request: GatewayDispatchRequest): Promise<unknown> {
    const route = this.routeRegistry.resolve(request.method, request.path);

    if (!route) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'GATEWAY_ROUTE_NOT_FOUND',
        message: `No route is registered for ${request.method.toUpperCase()} ${request.path}.`,
      });
    }

    const rawPayload = route.buildPayload({
      params: route.params,
      body: request.body,
      query: request.query ?? {},
    });
    const payload = route.requestType
      ? ((await this.routeValidationPipe.transform(rawPayload, {
          type: 'body',
          metatype: route.requestType,
        })) as object)
      : rawPayload;

    return this.send(this.getClient(route.clientName), route.pattern, payload);
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

  private send(client: ClientProxy, pattern: object, payload: object) {
    const timeoutMs = Number(process.env.MICROSERVICE_TIMEOUT_MS ?? 5000);
    return firstValueFrom(
      client.send(pattern, payload).pipe(
        timeout(timeoutMs),
        catchError((error: unknown) =>
          throwError(() => this.toHttpException(error)),
        ),
      ),
    );
  }

  private toHttpException(error: unknown): HttpException {
    if (error instanceof TimeoutError) {
      return new GatewayTimeoutException({
        statusCode: 504,
        code: 'MICROSERVICE_TIMEOUT',
        message: 'The target microservice did not respond in time.',
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
