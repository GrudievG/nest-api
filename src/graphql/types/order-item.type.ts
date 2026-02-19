import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { ProductType } from './product.type';

@ObjectType()
export class OrderItemType {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  productId: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => String)
  priceAtPurchase: string;

  @Field(() => ProductType, { nullable: true })
  product?: ProductType;
}
