import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFileRecordEntity1771948499029 implements MigrationInterface {
  name = 'CreateFileRecordEntity1771948499029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."files_status_enum" AS ENUM('pending', 'ready')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."files_visibility_enum" AS ENUM('private', 'public')`,
    );
    await queryRunner.query(
      `CREATE TABLE "files" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner_user_id" uuid NOT NULL, "object_key" character varying(512) NOT NULL, "bucket" character varying(120) NOT NULL, "content_type" character varying(120) NOT NULL, "size_bytes" integer NOT NULL, "status" "public"."files_status_enum" NOT NULL DEFAULT 'pending', "visibility" "public"."files_visibility_enum" NOT NULL DEFAULT 'public', "completed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_files_object_key" ON "files" ("object_key") `,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "avatar_file_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_65eb1fa7df7811daaec973798ce" FOREIGN KEY ("avatar_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "files" ADD CONSTRAINT "FK_d23e9020a4d6c33663df6e47d01" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "files" DROP CONSTRAINT "FK_d23e9020a4d6c33663df6e47d01"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_65eb1fa7df7811daaec973798ce"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_file_id"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_files_object_key"`);
    await queryRunner.query(`DROP TABLE "files"`);
    await queryRunner.query(`DROP TYPE "public"."files_visibility_enum"`);
    await queryRunner.query(`DROP TYPE "public"."files_status_enum"`);
  }
}
