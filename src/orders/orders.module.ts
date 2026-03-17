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
import { PaymentsGrpcClient } from './payments-grpc.client';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PAYMENTS_PACKAGE_NAME } from '../common/grpc.constants';
import { join } from 'path';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Product,
      User,
      ProcessedMessage,
    ]),
    ClientsModule.registerAsync([
      {
        name: 'PAYMENTS_GRPC_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: PAYMENTS_PACKAGE_NAME,
            protoPath: join(process.cwd(), 'proto/payments.proto'),
            url: configService.get<string>(
              'PAYMENTS_GRPC_URL',
              'localhost:5021',
            ),
          },
        }),
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersWorkerService, PaymentsGrpcClient],
  exports: [OrdersService],
})
export class OrdersModule {}
