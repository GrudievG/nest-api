import { ArgsType, Field, Int } from '@nestjs/graphql';
import { OrderStatus } from '../../orders/entities/order.entity';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

@ArgsType()
export class OrdersArgs {
  @Field(() => OrderStatus, { nullable: true })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @Field(() => Int, { defaultValue: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  limit: number = 20;

  @Field(() => Int, { defaultValue: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
