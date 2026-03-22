import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CanPayGuard } from './guards/can-pay.guard';
import { PaymentsService } from './payments.service';

@Controller({ path: 'orders', version: '1' })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard, CanPayGuard)
  @Post(':id/pay')
  async pay(@Param('id') id: string) {
    return this.paymentsService.payOrder(id);
  }
}
