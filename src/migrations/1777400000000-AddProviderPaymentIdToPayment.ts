import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProviderPaymentIdToPayment1777400000000 implements MigrationInterface {
  name = 'AddProviderPaymentIdToPayment1777400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider_payment_id" character varying(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN IF EXISTS "provider_payment_id"`,
    );
  }
}
