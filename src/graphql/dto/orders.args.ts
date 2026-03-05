import { ArgsType, Field, Int } from '@nestjs/graphql';
import { OrderStatus } from '../../orders/entities/order.entity';
import { IsDate, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
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

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;
}
