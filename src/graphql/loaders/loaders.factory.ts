import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { In, Repository } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { AppLoaders } from './loaders.types';
import DataLoader from 'dataloader';

@Injectable()
export class LoadersFactory {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
  ) {}

  create(): AppLoaders {
    return {
      userByIdLoader: new DataLoader<string, User | null>(async (ids) => {
        if (ids.length === 0) {
          return [];
        }

        const users = await this.usersRepository.find({
          where: { id: In([...ids]) },
        });
        const usersById = new Map(users.map((user) => [user.id, user]));
        return ids.map((id) => usersById.get(id) ?? null);
      }),
      productByIdLoader: new DataLoader<string, Product | null>(async (ids) => {
        if (ids.length === 0) {
          return [];
        }

        const products = await this.productsRepository.find({
          where: { id: In([...ids]) },
        });

        const productsById = new Map(
          products.map((product) => [product.id, product]),
        );
        return ids.map((id) => productsById.get(id) ?? null);
      }),
      orderItemsByOrderIdLoader: new DataLoader<string, OrderItem[]>(
        async (orderIds) => {
          if (orderIds.length === 0) {
            return [];
          }

          const items = await this.orderItemsRepository.find({
            where: { orderId: In([...orderIds]) },
          });

          const itemsByOrderId = new Map<string, OrderItem[]>(
            orderIds.map((orderId) => [orderId, []]),
          );

          for (const item of items) {
            itemsByOrderId.get(item.orderId)?.push(item);
          }

          return orderIds.map((orderId) => itemsByOrderId.get(orderId) ?? []);
        },
      ),
      orderTotalByOrderIdLoader: new DataLoader<string, string>(
        async (orderIds) => {
          if (orderIds.length === 0) {
            return [];
          }

          const rows = await this.orderItemsRepository
            .createQueryBuilder('oi')
            .select('oi.orderId', 'orderId')
            .addSelect(
              'COALESCE(SUM(oi.quantity * oi.priceAtPurchase), 0)',
              'total',
            )
            .where('oi.orderId IN (:...orderIds)', { orderIds: [...orderIds] })
            .groupBy('oi.orderId')
            .getRawMany<{ orderId: string; total: string }>();

          const totalsByOrderId = new Map(
            rows.map((row) => [row.orderId, row.total]),
          );
          return orderIds.map((orderId) => totalsByOrderId.get(orderId) ?? '0');
        },
      ),
    };
  }
}
