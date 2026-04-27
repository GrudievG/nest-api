import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFileRecordEntityMetadata1777322013970 implements MigrationInterface {
  name = 'AddFileRecordEntityMetadata1777322013970';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."files_entity_type_enum" AS ENUM('user', 'product')`,
    );
    await queryRunner.query(
      `ALTER TABLE "files" ADD "entity_type" "public"."files_entity_type_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "files" ADD "entity_id" uuid`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "files" DROP COLUMN "entity_id"`);
    await queryRunner.query(`ALTER TABLE "files" DROP COLUMN "entity_type"`);
    await queryRunner.query(`DROP TYPE "public"."files_entity_type_enum"`);
  }
}
