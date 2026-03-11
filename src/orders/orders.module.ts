import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { OrdersWorkerService } from './orders-worker.service';
import { ProcessedMessage } from '../idempotency/processed-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Product,
      User,
      ProcessedMessage,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersWorkerService],
  exports: [OrdersService],
})
export class OrdersModule {}
