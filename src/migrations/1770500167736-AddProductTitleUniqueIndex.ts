import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductTitleUniqueIndex1770500167736 implements MigrationInterface {
  name = 'AddProductTitleUniqueIndex1770500167736';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_products_title_unique" ON "products" ("title") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_products_title_unique"`);
  }
}
