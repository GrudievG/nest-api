import { IsArray, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsArray()
  readonly items!: {
    productId: string;
    quantity: number;
  }[];

  @IsString()
  readonly idempotencyKey: string;
}
