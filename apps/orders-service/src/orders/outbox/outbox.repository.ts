import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface ClaimedOutboxEvent {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  attempts: number;
}

@Injectable()
export class OutboxRepository {
  constructor(private readonly dataSource: DataSource) {}

  async claimPending(
    batchSize: number,
    workerId: string,
    lockTimeoutMs: number,
  ): Promise<ClaimedOutboxEvent[]> {
    const staleBefore = new Date(Date.now() - lockTimeoutMs);

    const result: unknown = await this.dataSource.query(
      `
        WITH candidates AS (
          SELECT "id"
          FROM "outbox_events"
          WHERE "published_at" IS NULL
            AND "next_attempt_at" <= now()
            AND (
              "locked_at" IS NULL
              OR "locked_at" < $3
            )
          ORDER BY "occurred_at" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT $1
        )
        UPDATE "outbox_events" AS event
        SET
          "locked_at" = now(),
          "locked_by" = $2,
          "attempts" = event."attempts" + 1
        FROM candidates
        WHERE event."id" = candidates."id"
        RETURNING
          event."id",
          event."event_type" AS "eventType",
          event."aggregate_type" AS "aggregateType",
          event."aggregate_id" AS "aggregateId",
          event."payload",
          event."occurred_at" AS "occurredAt",
          event."attempts"
      `,
      [batchSize, workerId, staleBefore],
    );

    // PostgreSQL UPDATE ... RETURNING results are exposed by TypeORM as
    // [rows, affectedCount], while SELECT queries return rows directly.
    const rows =
      Array.isArray(result) &&
      result.length === 2 &&
      Array.isArray(result[0]) &&
      typeof result[1] === 'number'
        ? result[0]
        : result;

    if (!Array.isArray(rows)) {
      throw new Error('Unexpected result while claiming outbox events.');
    }

    return (rows as ClaimedOutboxEvent[]).map((event) => ({
      ...event,
      attempts: Number(event.attempts),
      occurredAt: new Date(event.occurredAt),
    }));
  }

  async markPublished(id: string, workerId: string): Promise<void> {
    await this.dataSource.query(
      `
        UPDATE "outbox_events"
        SET
          "published_at" = now(),
          "last_error" = NULL,
          "locked_at" = NULL,
          "locked_by" = NULL
        WHERE "id" = $1
          AND "locked_by" = $2
          AND "published_at" IS NULL
      `,
      [id, workerId],
    );
  }

  async markFailed(
    id: string,
    workerId: string,
    error: string,
    retryDelayMs: number,
  ): Promise<void> {
    const nextAttemptAt = new Date(Date.now() + retryDelayMs);

    await this.dataSource.query(
      `
        UPDATE "outbox_events"
        SET
          "last_error" = $3,
          "next_attempt_at" = $4,
          "locked_at" = NULL,
          "locked_by" = NULL
        WHERE "id" = $1
          AND "locked_by" = $2
          AND "published_at" IS NULL
      `,
      [id, workerId, error.slice(0, 5000), nextAttemptAt],
    );
  }
}
