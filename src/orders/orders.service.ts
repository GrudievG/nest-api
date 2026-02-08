import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { DataSource, Repository, In, QueryFailedError } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { OrderItem } from './entities/order-item.entity';
import { ListOrdersDto } from './dto/list-orders.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(input: CreateOrderDto) {
    if (!input.userId || input.items.length === 0) {
      throw new BadRequestException('userId and items are required');
    }

    const user = await this.usersRepository.findOne({
      where: { id: input.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.ordersRepository.findOne({
      where: { idempotencyKey: input.idempotencyKey },
      relations: { user: true, items: { product: true } },
    });

    if (existing) {
      return existing;
    }

    const productIds = [...new Set(input.items.map((item) => item.productId))];
    const products = await this.productsRepository.find({
      where: { id: In(productIds) },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products were not found');
    }

    const productsById = new Map(
      products.map((product) => [product.id, product]),
    );

    try {
      return await this.dataSource.transaction(async (manager) => {
        const orderRepository = manager.getRepository(Order);
        const orderItemRepository = manager.getRepository(OrderItem);
        const productRepository = manager.getRepository(Product);

        const lockedProducts = await productRepository
          .createQueryBuilder('product')
          .where('product.id IN (:...ids)', { ids: productIds })
          .setLock('pessimistic_write')
          .getMany();

        const lockedById = new Map(
          lockedProducts.map((product) => [product.id, product]),
        );

        for (const item of input.items) {
          const product = lockedById.get(item.productId);

          if (!product) {
            throw new NotFoundException('Product not found');
          }

          if (item.quantity <= 0) {
            throw new BadRequestException('Quantity must be greater than zero');
          }

          if (product.stock < item.quantity) {
            throw new ConflictException('Insufficient stock');
          }
        }

        for (const item of input.items) {
          const product = lockedById.get(item.productId);

          if (!product) {
            continue;
          }
          product.stock -= item.quantity;
        }

        await productRepository.save([...lockedById.values()]);

        const order = orderRepository.create({
          userId: user.id,
          user,
          status: OrderStatus.CREATED,
          idempotencyKey: input.idempotencyKey,
        });

        await orderRepository.save(order);

        const orderItems = input.items.map((item) => {
          const product = productsById.get(item.productId);

          if (!product) {
            throw new NotFoundException('Product not found');
          }

          return orderItemRepository.create({
            orderId: order.id,
            order,
            productId: product.id,
            product,
            quantity: item.quantity,
            priceAtPurchase: product.price,
          });
        });

        await orderItemRepository.save(orderItems);

        const created = await orderRepository.findOne({
          where: { id: order.id },
          relations: { user: true, items: { product: true } },
        });

        if (!created) {
          throw new Error('Order creation failed');
        }

        return created;
      });
    } catch (error: unknown) {
      if (
        error instanceof QueryFailedError &&
        'code' in error &&
        error?.code === '23505' &&
        input.idempotencyKey
      ) {
        const existing = await this.ordersRepository.findOne({
          where: { idempotencyKey: input.idempotencyKey },
          relations: { user: true, items: { product: true } },
        });

        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }

  async listOrders(input: ListOrdersDto): Promise<Order[]> {
    const qb = this.ordersRepository
      .createQueryBuilder('orders')
      .leftJoinAndSelect('orders.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('orders.user', 'user')
      .orderBy('orders.createdAt', 'DESC')
      .take(input.limit)
      .skip(input.offset);

    if (input.userId) {
      qb.andWhere('orders.userId = :userId', { userId: input.userId });
    }

    if (input.status) {
      qb.andWhere('orders.status = :status', { status: input.status });
    }

    if (input.from) {
      qb.andWhere('orders.createdAt >= :from', { from: input.from });
    }

    if (input.to) {
      qb.andWhere('orders.createdAt <= :to', { to: input.to });
    }

    return qb.getMany();
  }
}
