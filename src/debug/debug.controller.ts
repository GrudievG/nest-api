import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ScopesGuard } from '../auth/scopes.guard';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { Scopes } from '../auth/scopes.decorator';

type PublishOrdersProcessBody = {
  orderId: string;
  messageId: string;
  attempt?: number;
  simulate?: 'alwaysFail';
};

@UseGuards(JwtAuthGuard, RolesGuard, ScopesGuard)
@Controller({ path: 'debug', version: '1' })
export class DebugController {
  constructor(private readonly rabbitmqService: RabbitmqService) {}

  @Roles(UserRole.ADMIN)
  @Scopes('orders:write')
  @Post('orders/process')
  publishOrdersProcess(@Body() body: PublishOrdersProcessBody) {
    if (!body?.orderId || !body?.messageId) {
      throw new BadRequestException('orderId and messageId are required');
    }
    const attempt = Number(body.attempt ?? 1);
    this.rabbitmqService.publishToQueue(
      'orders.process',
      { ...body, attempt },
      { messageId: body.messageId },
    );
    return { ok: true };
  }
}