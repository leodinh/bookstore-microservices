import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderIdempotency1786403097000 implements MigrationInterface {
  name = 'AddOrderIdempotency1786403097000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN "idempotency_key" uuid,
      ADD COLUMN "request_hash" character(64)
    `);
    await queryRunner.query(`
      UPDATE "orders"
      SET
        "idempotency_key" = "id",
        "request_hash" = md5("id"::text) || md5("id"::text)
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ALTER COLUMN "idempotency_key" SET NOT NULL,
      ALTER COLUMN "request_hash" SET NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_orders_idempotency_key"
      ON "orders" ("idempotency_key")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."UQ_orders_idempotency_key"
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP COLUMN "request_hash",
      DROP COLUMN "idempotency_key"
    `);
  }
}
