import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrders1786390133513 implements MigrationInterface {
  name = 'AddOrders1786390133513';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED')
        `);
    await queryRunner.query(`
            CREATE TABLE "orders" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "status" "public"."order_status" NOT NULL DEFAULT 'PENDING',
                "total_amount" numeric(14, 2) NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "CHK_orders_total_amount_positive" CHECK ("total_amount" > 0),
                CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_orders_user_id" ON "orders" ("user_id")
        `);
    await queryRunner.query(`
            CREATE TABLE "order_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "order_id" uuid NOT NULL,
                "book_id" uuid NOT NULL,
                "book_title" character varying(255) NOT NULL,
                "unit_price" numeric(12, 2) NOT NULL,
                "quantity" integer NOT NULL,
                "line_total" numeric(14, 2) NOT NULL,
                CONSTRAINT "CHK_order_items_line_total_matches_quantity" CHECK ("line_total" = "unit_price" * "quantity"),
                CONSTRAINT "CHK_order_items_line_total_positive" CHECK ("line_total" > 0),
                CONSTRAINT "CHK_order_items_unit_price_positive" CHECK ("unit_price" > 0),
                CONSTRAINT "CHK_order_items_quantity_positive" CHECK ("quantity" > 0),
                CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_order_items_book_id" ON "order_items" ("book_id")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_order_items_order_id" ON "order_items" ("order_id")
        `);
    await queryRunner.query(`
            ALTER TABLE "orders"
            ADD CONSTRAINT "FK_a922b820eeef29ac1c6800e826a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "order_items"
            ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "order_items"
            ADD CONSTRAINT "FK_baed643dd2210484ceac5ec81ea" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "order_items" DROP CONSTRAINT "FK_baed643dd2210484ceac5ec81ea"
        `);
    await queryRunner.query(`
            ALTER TABLE "order_items" DROP CONSTRAINT "FK_145532db85752b29c57d2b7b1f1"
        `);
    await queryRunner.query(`
            ALTER TABLE "orders" DROP CONSTRAINT "FK_a922b820eeef29ac1c6800e826a"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_order_items_order_id"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_order_items_book_id"
        `);
    await queryRunner.query(`
            DROP TABLE "order_items"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_orders_user_id"
        `);
    await queryRunner.query(`
            DROP TABLE "orders"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."order_status"
        `);
  }
}
