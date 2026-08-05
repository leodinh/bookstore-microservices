import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBooks1785957703891 implements MigrationInterface {
  name = 'AddBooks1785957703891';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "books" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "title" character varying(255) NOT NULL,
                "author" character varying(200) NOT NULL,
                "isbn" character varying(20) NOT NULL,
                "description" text,
                "price" numeric(12, 2) NOT NULL,
                "available_quantity" integer NOT NULL DEFAULT '0',
                "sold_quantity" integer NOT NULL DEFAULT '0',
                "is_active" boolean NOT NULL DEFAULT true,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "CHK_books_sold_quantity_nonnegative" CHECK ("sold_quantity" >= 0),
                CONSTRAINT "CHK_books_available_quantity_nonnegative" CHECK ("available_quantity" >= 0),
                CONSTRAINT "CHK_books_price_positive" CHECK ("price" > 0),
                CONSTRAINT "PK_f3f2f25a099d24e12545b70b022" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_books_isbn" ON "books" ("isbn")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "public"."UQ_books_isbn"
        `);
    await queryRunner.query(`
            DROP TABLE "books"
        `);
  }
}
