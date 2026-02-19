import {
  Resolver,
  Query,
  Args,
  ResolveField,
  Parent,
  Context,
} from '@nestjs/graphql';
import { OrderType } from '../types/order.type';
import { OrdersService } from '../../orders/orders.service';
import { OrdersArgs } from '../dto/orders.args';
import { Order } from '../../orders/entities/order.entity';
import { UserType } from '../types/user.type';
import type { GraphQLContext } from '../loaders/loaders.types';
import { User } from '../../users/entities/user.entity';
import { OrderItemType } from '../types/order-item.type';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { ProductType } from '../types/product.type';
import { Product } from '../../products/entities/product.entity';

@Resolver(() => OrderType)
export class OrdersResolver {
  constructor(private readonly ordersService: OrdersService) {}

  @Query(() => [OrderType])
  async orders(@Args() args: OrdersArgs): Promise<Order[]> {
    return this.ordersService.listOrders(args);
  }

  @ResolveField(() => UserType, { nullable: true })
  async customer(
    @Parent() order: Order,
    @Context() ctx: GraphQLContext,
  ): Promise<User | null> {
    return ctx.loaders.userByIdLoader.load(order.userId);
  }

  @ResolveField(() => [OrderItemType])
  async items(
    @Parent() order: Order,
    @Context() ctx: GraphQLContext,
  ): Promise<OrderItem[]> {
    return ctx.loaders.orderItemsByOrderIdLoader.load(order.id);
  }

  @ResolveField(() => String)
  async total(
    @Parent() order: Order,
    @Context() ctx: GraphQLContext,
  ): Promise<string> {
    return ctx.loaders.orderTotalByOrderIdLoader.load(order.id);
  }
}

@Resolver(() => OrderItemType)
export class OrderItemsResolver {
  @ResolveField(() => ProductType, { nullable: true })
  async product(
    @Parent() orderItem: OrderItem,
    @Context() ctx: GraphQLContext,
  ): Promise<Product | null> {
    return ctx.loaders.productByIdLoader.load(orderItem.productId);
  }
}
