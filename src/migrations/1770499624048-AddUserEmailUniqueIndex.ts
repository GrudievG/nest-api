import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserEmailUniqueIndex1770499624048 implements MigrationInterface {
  name = 'AddUserEmailUniqueIndex1770499624048';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_email_unique" ON "users" ("email") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_users_email_unique"`);
  }
}
