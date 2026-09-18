import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransactionalOutbox1786500000000
  implements MigrationInterface
{
  name = 'AddTransactionalOutbox1786500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "outbox_events" (
        "id" uuid NOT NULL,
        "event_type" character varying(200) NOT NULL,
        "aggregate_type" character varying(100) NOT NULL,
        "aggregate_id" uuid NOT NULL,
        "payload" jsonb NOT NULL,
        "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "published_at" TIMESTAMP WITH TIME ZONE,
        "attempts" integer NOT NULL DEFAULT 0,
        "next_attempt_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "last_error" text,
        "locked_at" TIMESTAMP WITH TIME ZONE,
        "locked_by" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_outbox_events_attempts_nonnegative" CHECK ("attempts" >= 0),
        CONSTRAINT "PK_outbox_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_outbox_events_aggregate"
      ON "outbox_events" ("aggregate_type", "aggregate_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_outbox_events_ready"
      ON "outbox_events" ("next_attempt_at", "occurred_at")
      WHERE "published_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "event_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "order_id" uuid NOT NULL,
        "type" character varying(100) NOT NULL,
        "title" character varying(255) NOT NULL,
        "message" text NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_notifications_event_id"
      ON "notifications" ("event_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user_created"
      ON "notifications" ("user_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_user_created"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_notifications_event_id"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_outbox_events_ready"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_outbox_events_aggregate"`);
    await queryRunner.query(`DROP TABLE "outbox_events"`);
  }
}
