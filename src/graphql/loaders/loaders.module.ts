import { Module } from '@nestjs/common';
import { LoadersFactory } from './loaders.factory';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Product, OrderItem])],
  providers: [LoadersFactory],
  exports: [LoadersFactory],
})
export class LoadersModule {}
