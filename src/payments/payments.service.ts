import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './payment.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  async payOrder(orderId: string): Promise<Payment> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const existing = await this.paymentsRepository.findOne({
      where: { orderId },
    });
    if (existing?.status === PaymentStatus.PAID) {
      return existing;
    }

    if (existing) {
      existing.status = PaymentStatus.PAID;
      return this.paymentsRepository.save(existing);
    }

    const payment = this.paymentsRepository.create({
      orderId,
      status: PaymentStatus.PAID,
    });

    order.status = OrderStatus.PAID;
    await this.ordersRepository.save(order);

    return this.paymentsRepository.save(payment);
  }
}
