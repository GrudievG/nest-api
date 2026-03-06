import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Payment } from './payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CanPayGuard } from './guards/can-pay.guard';
import { Order } from '../orders/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Order])],
  controllers: [PaymentsController],
  providers: [PaymentsService, CanPayGuard],
})
export class PaymentsModule {}
