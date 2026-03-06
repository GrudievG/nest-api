import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductImageRelation1771966821516 implements MigrationInterface {
  name = 'AddProductImageRelation1771966821516';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD "main_image_file_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_26a06eb3e2f64958b77b708e50d" FOREIGN KEY ("main_image_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_26a06eb3e2f64958b77b708e50d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN "main_image_file_id"`,
    );
  }
}
