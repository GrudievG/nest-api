import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderIndexes1770576093077 implements MigrationInterface {
  name = 'AddOrderIndexes1770576093077';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_created_at" ON "orders" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_user_id" ON "orders" ("user_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_orders_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_orders_created_at"`);
  }
}
