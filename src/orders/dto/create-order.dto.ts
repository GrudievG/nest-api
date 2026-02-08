import { IsArray, IsString, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  readonly userId!: string;

  @IsArray()
  readonly items!: {
    productId: string;
    quantity: number;
  }[];

  @IsString()
  readonly idempotencyKey: string;
}
