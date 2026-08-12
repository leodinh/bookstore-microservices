import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import { lastValueFrom, timeout } from 'rxjs';
import { ClaimedOutboxEvent, OutboxRepository } from './outbox.repository';

@Injectable()
export class OutboxPublisher
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(OutboxPublisher.name);
  private readonly workerId = randomUUID();
  private timer?: ReturnType<typeof setInterval>;
  private publishing = false;

  constructor(
    @Inject('ORDER_EVENTS') private readonly eventsClient: ClientProxy,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  onApplicationBootstrap(): void {
    if (process.env.OUTBOX_PUBLISHER_ENABLED === 'false') {
      this.logger.warn('Transactional outbox publisher is disabled.');
      return;
    }

    const pollIntervalMs = this.readPositiveInteger(
      'OUTBOX_POLL_INTERVAL_MS',
      250,
    );
    this.timer = setInterval(() => void this.publishPending(), pollIntervalMs);
    this.timer.unref();
    void this.publishPending();
  }

  onApplicationShutdown(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async publishPending(): Promise<number> {
    if (this.publishing) {
      return 0;
    }

    this.publishing = true;

    try {
      const events = await this.outboxRepository.claimPending(
        this.readPositiveInteger('OUTBOX_BATCH_SIZE', 10),
        this.workerId,
        this.readPositiveInteger('OUTBOX_LOCK_TIMEOUT_MS', 30_000),
      );

      for (const event of events) {
        await this.publishOne(event);
      }

      return events.length;
    } finally {
      this.publishing = false;
    }
  }

  private async publishOne(event: ClaimedOutboxEvent): Promise<void> {
    try {
      await lastValueFrom(
        this.eventsClient
          .emit(event.eventType, event.payload)
          .pipe(
            timeout(
              this.readPositiveInteger('OUTBOX_PUBLISH_TIMEOUT_MS', 5000),
            ),
          ),
      );
      await this.outboxRepository.markPublished(event.id, this.workerId);
      this.logger.log(
        `Published ${event.eventType} eventId=${event.id} ` +
          `aggregate=${event.aggregateType}:${event.aggregateId} ` +
          `attempt=${event.attempts}`,
      );
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      const retryDelayMs = this.calculateRetryDelay(event.attempts);

      await this.outboxRepository.markFailed(
        event.id,
        this.workerId,
        detail,
        retryDelayMs,
      );
      this.logger.error(
        `Failed to publish ${event.eventType} eventId=${event.id}; ` +
          `retrying in ${retryDelayMs}ms: ${detail}`,
      );
    }
  }

  private calculateRetryDelay(attempts: number): number {
    const baseMs = this.readPositiveInteger('OUTBOX_RETRY_BASE_MS', 1000);
    const maximumMs = this.readPositiveInteger('OUTBOX_RETRY_MAX_MS', 60_000);
    const exponent = Math.min(Math.max(attempts - 1, 0), 20);
    return Math.min(baseMs * 2 ** exponent, maximumMs);
  }

  private readPositiveInteger(name: string, fallback: number): number {
    const value = Number(process.env[name] ?? fallback);
    return Number.isSafeInteger(value) && value > 0 ? value : fallback;
  }
}
