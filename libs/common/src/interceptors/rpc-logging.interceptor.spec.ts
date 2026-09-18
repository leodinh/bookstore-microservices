import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { RpcLoggingInterceptor } from './rpc-logging.interceptor';

describe('RpcLoggingInterceptor', () => {
  it('logs the TCP pattern with the propagated correlation ID', async () => {
    const correlationId = '5af19211-f08a-4c42-93e3-08cf638b739c';
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const context = {
      switchToRpc: () => ({
        getData: () => ({ correlationId, password: 'never-log-this' }),
        getContext: () => ({ getPattern: () => 'users.account.signup' }),
      }),
    } as unknown as ExecutionContext;
    const next = { handle: () => of({ id: 'user-id' }) } as CallHandler;

    await expect(
      lastValueFrom(new RpcLoggingInterceptor().intercept(context, next)),
    ).resolves.toEqual({ id: 'user-id' });

    expect(log).toHaveBeenCalledWith(
      `[${correlationId}] TCP users.account.signup started`,
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(
        `[${correlationId}] TCP users.account.signup completed`,
      ),
    );
    expect(log.mock.calls.flat().join(' ')).not.toContain('never-log-this');
    log.mockRestore();
  });

  it('labels RabbitMQ event logs as RMQ', async () => {
    const correlationId = 'f8972bf4-7a45-4cbf-bb51-e64e527bcf13';
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const context = {
      switchToRpc: () => ({
        getData: () => ({ correlationId }),
        getContext: () => ({
          getPattern: () => 'orders.order.created',
          getChannelRef: () => ({}),
        }),
      }),
    } as unknown as ExecutionContext;
    const next = { handle: () => of(undefined) } as CallHandler;

    await lastValueFrom(new RpcLoggingInterceptor().intercept(context, next));

    expect(log).toHaveBeenCalledWith(
      `[${correlationId}] RMQ orders.order.created started`,
    );
    log.mockRestore();
  });
});
