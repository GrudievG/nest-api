import { MigrationInterface, QueryRunner } from 'typeorm';
import bcrypt from 'bcrypt';

export class AddUserPasswordHash1771603078887 implements MigrationInterface {
  name = 'AddUserPasswordHash1771603078887';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "password_hash" character varying(255)`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('user', 'support', 'admin')`,
    );
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD "roles" "public"."user_role_enum" array 
      NOT NULL 
      DEFAULT ARRAY['user']::"public"."user_role_enum"[]
    `);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "scopes" text array NOT NULL DEFAULT ARRAY[]::text[]`,
    );

    const hashedDefaultPassword = await bcrypt.hash('password123', 10);

    await queryRunner.query(
      `
      UPDATE "users"
      SET "password_hash" = $1
      `,
      [hashedDefaultPassword],
    );

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "password_hash" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "scopes"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "roles"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_hash"`);
  }
}
