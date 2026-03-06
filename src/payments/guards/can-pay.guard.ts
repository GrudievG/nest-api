import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { AuthUser } from '../../auth/types';
import { Order } from '../../orders/entities/order.entity';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class CanPayGuard implements CanActivate {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();

    const orderId = String(req.params?.id ?? '');

    if (!orderId) {
      throw new NotFoundException('Order not found');
    }

    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Unauthenticated');
    }

    const isOwner = order.userId === user.sub;

    if (isOwner) {
      return true;
    }

    const isStaff =
      user.roles.includes(UserRole.ADMIN) ||
      user.roles.includes(UserRole.SUPPORT);
    const hasScope = user.scopes.includes('payments:write');

    if (isStaff && hasScope) {
      return true;
    }

    throw new ForbiddenException('Not allowed to pay this order');
  }
}
